import { liveQuery, type Table } from 'dexie'
import type { z } from 'zod'
import type {
  Clock,
  DiagnosticsLog,
  LibraryItemsRepository,
  LikesRepository,
  PlaylistsRepository,
  RecentSearchesRepository,
  SnapshotsRepository,
  Storage,
  StorageUnitOfWork,
  Watchable,
} from '@/application/ports'
import { StorageError } from '@/domain/errors'
import { providerIdOf, type EntityId } from '@/domain/ids'
import type { Album, Artist, LibraryItem, LibraryItemKind, Like, Playlist, RecentSearch, Track } from '@/domain/models'
import type { MpDatabase } from './database'
import type { DatabaseEvent } from './resilient-storage'
import { toStorageError } from './errors'
import { compareLibraryItems, compareLikes, comparePlaylists, compareRecentSearches } from './ordering'
import {
  albumRowSchema,
  artistRowSchema,
  libraryItemSchema,
  likeSchema,
  playlistSchema,
  recentSearchSchema,
  trackRowSchema,
} from './schemas'

/**
 * The real store, over Dexie (002 research R1 to R5). Every read validates its rows, skips the
 * invalid ones and records them once; every rewrite keeps the fields this version does not know;
 * grouped writes are one Dexie transaction; failures leave as StorageErrors.
 */

type Row = Record<string, unknown>
type RowSchema = z.ZodObject<z.ZodRawShape>

const LIBRARY_TABLES = ['tracks', 'albums', 'artists', 'libraryItems', 'likes', 'playlists', 'recentSearches'] as const

interface Dependencies {
  diagnostics: DiagnosticsLog
  clock: Clock
}

export class DexieStorage implements Storage {
  private readonly reported = new Set<string>()
  private readonly databaseListeners = new Set<(event: DatabaseEvent) => void>()

  readonly likes: LikesRepository
  readonly playlists: PlaylistsRepository
  readonly libraryItems: LibraryItemsRepository
  readonly snapshots: SnapshotsRepository
  readonly recentSearches: RecentSearchesRepository
  readonly unitOfWork: StorageUnitOfWork

  constructor(
    private readonly db: MpDatabase,
    private readonly deps: Dependencies,
  ) {
    this.likes = {
      add: (trackId, likedAt) => this.rewrite('likes', likeSchema, trackId, { trackId, likedAt }),
      remove: (trackId) => this.guard(() => this.table('likes').delete(trackId)),
      has: async (trackId) => (await this.readOne('likes', likeSchema, trackId)) !== null,
      list: () => this.listLikes(),
      watchList: () => this.watchable(() => this.listLikes()),
    }

    this.playlists = {
      put: (playlist) => this.rewrite('playlists', playlistSchema, playlist.id, playlist as unknown as Row),
      get: (id) => this.getPlaylist(id),
      watch: (id) => this.watchable(() => this.getPlaylist(id)),
      list: () => this.listPlaylists(),
      watchList: () => this.watchable(() => this.listPlaylists()),
      delete: (id) => this.guard(() => this.table('playlists').delete(id)),
    }

    this.libraryItems = {
      save: (kind, entityId, addedAt) => this.rewrite('libraryItems', libraryItemSchema, [kind, entityId], { kind, entityId, addedAt }),
      remove: (kind, entityId) => this.guard(() => this.table('libraryItems').delete([kind, entityId])),
      has: async (kind, entityId) => (await this.readOne('libraryItems', libraryItemSchema, [kind, entityId])) !== null,
      list: (kind) => this.listItems(kind),
      watchList: (kind) => this.watchable(() => this.listItems(kind)),
    }

    this.snapshots = {
      putTracks: (tracks) => this.putSnapshots('tracks', trackRowSchema, tracks, (t) => ({
        artistIds: t.artists.map((a) => a.id),
        providerId: providerIdOf(t.id),
      })),
      putAlbums: (albums) => this.putSnapshots('albums', albumRowSchema, albums, () => ({})),
      putArtists: (artists) => this.putSnapshots('artists', artistRowSchema, artists, () => ({})),
      getTracks: (ids) => this.getSnapshots<Track>('tracks', trackRowSchema, ids, ['artistIds', 'providerId', 'addedAt']),
      getAlbums: (ids) => this.getSnapshots<Album>('albums', albumRowSchema, ids, ['addedAt']),
      getArtists: (ids) => this.getSnapshots<Artist>('artists', artistRowSchema, ids, ['addedAt']),
    }

    this.recentSearches = {
      record: (query, searchedAt) => this.rewrite('recentSearches', recentSearchSchema, query, { query, searchedAt }),
      list: () => this.listSearches(),
      watchList: () => this.watchable(() => this.listSearches()),
      remove: (query) => this.guard(() => this.table('recentSearches').delete(query)),
      clear: () => this.guard(() => this.table('recentSearches').clear()),
    }

    // Another connection wants the database (002 research R8). A blocked upgrade only waits. When
    // another tab upgrades or deletes it, this connection closes, so this tab can no longer write.
    this.db.on('blocked', () => this.emitDatabaseEvent('blocked'))
    this.db.on('versionchange', (event) => {
      this.db.close()
      this.emitDatabaseEvent(event.newVersion === null ? 'deleted-elsewhere' : 'upgraded-elsewhere')
      return false // we already closed it; skip Dexie's default handler
    })

    this.unitOfWork = {
      run: (fn) =>
        this.guard(() =>
          this.transaction(
            LIBRARY_TABLES.map((name) => this.table(name)),
            fn,
          ),
        ),
    }
  }

  onDatabaseEvent(listener: (event: DatabaseEvent) => void): () => void {
    this.databaseListeners.add(listener)
    return () => void this.databaseListeners.delete(listener)
  }

  private emitDatabaseEvent(event: DatabaseEvent): void {
    for (const listener of [...this.databaseListeners]) listener(event)
  }

  /**
   * Opens the database. Failures leave as StorageErrors.
   *
   * Data written by a newer version is never touched (FR-023). Dexie 4 does not refuse a database
   * whose version is higher than the one declared here: it opens it and upgrades it again to add
   * the tables it is missing. So the stored version is read first, without opening or creating
   * anything, and a higher one is reported as VERSION_CONFLICT before Dexie sees the database.
   * (Dexie multiplies a declared version by ten to get the IndexedDB version.)
   */
  async open(): Promise<void> {
    await this.guard(async () => {
      const stored = await this.storedVersion()
      if (stored !== null && stored > this.db.declaredVersion * 10) {
        throw new StorageError('VERSION_CONFLICT', { reason: 'newer-version' })
      }
      await this.db.open()
    })
  }

  /** The IndexedDB version of this database if it exists, else null. Opens and creates nothing. */
  private async storedVersion(): Promise<number | null> {
    // No IndexedDB at all is Dexie's MissingAPIError to report; browsers without `databases()` are
    // outside the supported set (D4), and skip this check.
    if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return null
    const databases = await indexedDB.databases()
    return databases.find((database) => database.name === this.db.name)?.version ?? null
  }

  /* ---------- plumbing ---------- */

  private table(name: string): Table<Row, unknown> {
    return this.db.table(name) as Table<Row, unknown>
  }

  /** Runs `fn`; a store failure leaves as a StorageError, a programming error is rethrown unchanged. */
  private async guard<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      throw toStorageError(error) ?? error
    }
  }

  /**
   * One Dexie read-write transaction over `tables`. Dexie's generic return type, instantiated
   * against our own generics, exceeds TypeScript's depth limit (TS2589), so every transaction goes
   * through this narrow signature. Casting the result is safe: the transaction resolves with
   * whatever `fn` returned.
   */
  private async transaction<T>(tables: Table<Row, unknown>[], fn: () => Promise<T>): Promise<T> {
    const run = this.db.transaction.bind(this.db) as unknown as (
      mode: 'rw',
      scope: Table[],
      body: () => Promise<unknown>,
    ) => Promise<unknown>
    return (await run('rw', tables, fn)) as T
  }

  private watchable<T>(query: () => Promise<T>): Watchable<T> {
    return {
      subscribe: (next, error) => {
        const subscription = liveQuery(query).subscribe({
          next,
          error: (e: unknown) => error?.(toStorageError(e) ?? new StorageError('UNAVAILABLE', { cause: e })),
        })
        return () => subscription.unsubscribe()
      },
    }
  }

  /** Validates one row. An invalid row is skipped and reported once per session (FR-013). */
  private parse(tableName: string, schema: RowSchema, row: Row, key: unknown): Row | null {
    // Parsing needs only `safeParse`; the plain ZodType keeps TypeScript from expanding the row shapes.
    const result = (schema as z.ZodType).safeParse(row)
    if (result.success) return result.data as Row
    const keyText = Array.isArray(key) ? key.join('+') : String(key)
    const reason = result.error.issues.map((issue) => `${issue.path.join('.') || '(row)'}: ${issue.message}`).join('; ')
    const signature = `${tableName}|${keyText}|${reason}`
    if (!this.reported.has(signature)) {
      // Bounded like the log it feeds: past the cap it starts over, so memory cannot grow without limit.
      if (this.reported.size >= 1000) this.reported.clear()
      this.reported.add(signature)
      this.deps.diagnostics.record({ kind: 'invalid-row', table: tableName, key: keyText, reason })
    }
    return null
  }

  private primaryKeyOf(tableName: string, row: Row): unknown {
    const keyPath = this.table(tableName).schema.primKey.keyPath
    if (Array.isArray(keyPath)) return keyPath.map((k) => row[k])
    return typeof keyPath === 'string' ? row[keyPath] : null
  }

  private async readAll(tableName: string, schema: RowSchema): Promise<Row[]> {
    return this.guard(async () => {
      const rows = await this.table(tableName).toArray()
      return rows.flatMap((row) => {
        const parsed = this.parse(tableName, schema, row, this.primaryKeyOf(tableName, row))
        return parsed ? [parsed] : []
      })
    })
  }

  private async readOne(tableName: string, schema: RowSchema, key: unknown): Promise<Row | null> {
    return this.guard(async () => {
      const row = await this.table(tableName).get(key)
      return row ? this.parse(tableName, schema, row, key) : null
    })
  }

  /**
   * Writes `next` as the row for `key`: its known fields replace the stored ones, and fields the
   * stored row has that this version does not know are kept (FR-015). Read and write share one
   * transaction.
   */
  private rewrite(tableName: string, schema: RowSchema, key: unknown, next: Row): Promise<void> {
    return this.guard(() =>
      this.transaction([this.table(tableName)], async () => {
        const existing = await this.table(tableName).get(key)
        await this.table(tableName).put({ ...this.unknownFields(existing, schema), ...next })
      }),
    )
  }

  private unknownFields(existing: Row | undefined, schema: RowSchema): Row {
    if (!existing) return {}
    const known = new Set(Object.keys(schema.shape))
    return Object.fromEntries(Object.entries(existing).filter(([field]) => !known.has(field)))
  }

  private strip<T>(row: Row, columns: string[]): T {
    const copy = { ...row }
    for (const column of columns) delete copy[column]
    return copy as unknown as T
  }

  /* ---------- reads ---------- */

  private async listLikes(): Promise<Like[]> {
    const rows = await this.readAll('likes', likeSchema)
    return (rows as unknown as Like[]).sort(compareLikes)
  }

  private async getPlaylist(id: string): Promise<Playlist | null> {
    return (await this.readOne('playlists', playlistSchema, id)) as unknown as Playlist | null
  }

  private async listPlaylists(): Promise<Playlist[]> {
    const rows = await this.readAll('playlists', playlistSchema)
    return (rows as unknown as Playlist[]).sort(comparePlaylists)
  }

  private async listItems(kind?: LibraryItemKind): Promise<LibraryItem[]> {
    const rows = (await this.readAll('libraryItems', libraryItemSchema)) as unknown as LibraryItem[]
    return rows.filter((item) => kind === undefined || item.kind === kind).sort(compareLibraryItems)
  }

  private async listSearches(): Promise<RecentSearch[]> {
    const rows = await this.readAll('recentSearches', recentSearchSchema)
    return (rows as unknown as RecentSearch[]).sort(compareRecentSearches)
  }

  /* ---------- snapshots ---------- */

  private putSnapshots<T extends { id: EntityId }>(
    tableName: string,
    schema: RowSchema,
    items: T[],
    derived: (item: T) => Row,
  ): Promise<void> {
    return this.guard(() =>
      this.transaction([this.table(tableName)], async () => {
        for (const item of items) {
          const existing = await this.table(tableName).get(item.id)
          // The first write time is kept; display fields are replaced (data-model §3).
          const addedAt = typeof existing?.addedAt === 'number' ? existing.addedAt : this.deps.clock.now()
          await this.table(tableName).put({
            ...this.unknownFields(existing, schema),
            ...(item as unknown as Row),
            ...derived(item),
            addedAt,
          })
        }
      }),
    )
  }

  private async getSnapshots<T>(tableName: string, schema: RowSchema, ids: EntityId[], derived: string[]): Promise<T[]> {
    return this.guard(async () => {
      const rows = await this.table(tableName).bulkGet(ids)
      return rows.flatMap((row, index) => {
        if (!row) return []
        const parsed = this.parse(tableName, schema, row, ids[index])
        return parsed ? [this.strip<T>(parsed, derived)] : []
      })
    })
  }
}
