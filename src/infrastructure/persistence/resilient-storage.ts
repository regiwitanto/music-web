import type {
  DiagnosticsLog,
  LibraryItemsRepository,
  LikesRepository,
  PlaylistsRepository,
  RecentSearchesRepository,
  SnapshotsRepository,
  StartResult,
  Storage,
  StorageEvent,
  StorageLifecycle,
  StorageUnitOfWork,
  Watchable,
} from '@/application/ports'
import { StorageError } from '@/domain/errors'
import { toStorageError } from './errors'

/**
 * The one `Storage` the app uses (002 research R7; contracts/storage-ports.md §4). It delegates
 * to the real store until that becomes unavailable, then to a session-only fallback, so every
 * feature keeps working with the same behaviour except that nothing survives a reload (FR-016).
 *
 * - It switches to memory **at most once per session**. Later failures, for example from a call
 *   that was in flight during the switch, are retried on the same memory backend, so writes made
 *   in memory are never discarded.
 * - A full store (QUOTA_EXCEEDED), newer data (VERSION_CONFLICT) and programming errors never
 *   trigger the switch: the first two reach the caller as StorageErrors, the last is rethrown.
 * - It also implements `StorageLifecycle`, so the application opens the store and hears about
 *   it changing without touching Dexie. It never writes the status itself.
 * - The primary is opened exactly once, on first use, through one shared promise. Every call and
 *   every subscription waits for it, so nothing can reach the database before the guarded open
 *   has checked for newer data (FR-023): a child component whose effect runs before the shell
 *   starts the store is safe.
 */

/** What the database tells us about other connections to it (002 research R8). */
export type DatabaseEvent = 'blocked' | 'upgraded-elsewhere' | 'deleted-elsewhere'

/** A store that has to be opened before use (the Dexie one). */
export interface OpenableStorage extends Storage {
  open(): Promise<void>
  /** Reports `DatabaseEvent`s; optional because the in-memory store has no other connections. */
  onDatabaseEvent?(listener: (event: DatabaseEvent) => void): () => void
}

interface Options {
  primary: OpenableStorage
  /** Builds the session-only store. Called at most once. */
  fallback: () => Storage
  diagnostics: DiagnosticsLog
}

interface Watcher {
  make: () => Watchable<unknown>
  next: (value: unknown) => void
  error: ((error: StorageError) => void) | undefined
  detach: (() => void) | undefined
  /** True from the start of the first attach, so a watcher that fails while subscribing is still re-attached. */
  attached: boolean
  /** Bumped on every (re)attach and on cancel: a subscription from an older generation is ignored. */
  generation: number
}

export class ResilientStorage implements Storage, StorageLifecycle {
  private current: Storage
  private switched = false
  private readonly listeners = new Set<(event: StorageEvent) => void>()
  private readonly watchers = new Set<Watcher>()
  private opening: Promise<StartResult> | undefined

  readonly likes: LikesRepository
  readonly playlists: PlaylistsRepository
  readonly libraryItems: LibraryItemsRepository
  readonly snapshots: SnapshotsRepository
  readonly recentSearches: RecentSearchesRepository
  readonly unitOfWork: StorageUnitOfWork

  constructor(private readonly options: Options) {
    this.current = options.primary
    options.primary.onDatabaseEvent?.((event) => this.onDatabaseEvent(event))

    this.likes = {
      add: (trackId, likedAt) => this.call((s) => s.likes.add(trackId, likedAt)),
      remove: (trackId) => this.call((s) => s.likes.remove(trackId)),
      has: (trackId) => this.call((s) => s.likes.has(trackId)),
      list: () => this.call((s) => s.likes.list()),
      watchList: () => this.watchOf((s) => s.likes.watchList()),
    }

    this.playlists = {
      put: (playlist) => this.call((s) => s.playlists.put(playlist)),
      get: (id) => this.call((s) => s.playlists.get(id)),
      watch: (id) => this.watchOf((s) => s.playlists.watch(id)),
      list: () => this.call((s) => s.playlists.list()),
      watchList: () => this.watchOf((s) => s.playlists.watchList()),
      delete: (id) => this.call((s) => s.playlists.delete(id)),
    }

    this.libraryItems = {
      save: (kind, entityId, addedAt) => this.call((s) => s.libraryItems.save(kind, entityId, addedAt)),
      remove: (kind, entityId) => this.call((s) => s.libraryItems.remove(kind, entityId)),
      has: (kind, entityId) => this.call((s) => s.libraryItems.has(kind, entityId)),
      list: (kind) => this.call((s) => s.libraryItems.list(kind)),
      watchList: (kind) => this.watchOf((s) => s.libraryItems.watchList(kind)),
    }

    this.snapshots = {
      putTracks: (tracks) => this.call((s) => s.snapshots.putTracks(tracks)),
      putAlbums: (albums) => this.call((s) => s.snapshots.putAlbums(albums)),
      putArtists: (artists) => this.call((s) => s.snapshots.putArtists(artists)),
      getTracks: (ids) => this.call((s) => s.snapshots.getTracks(ids)),
      getAlbums: (ids) => this.call((s) => s.snapshots.getAlbums(ids)),
      getArtists: (ids) => this.call((s) => s.snapshots.getArtists(ids)),
    }

    this.recentSearches = {
      record: (query, searchedAt) => this.call((s) => s.recentSearches.record(query, searchedAt)),
      list: () => this.call((s) => s.recentSearches.list()),
      watchList: () => this.watchOf((s) => s.recentSearches.watchList()),
      remove: (query) => this.call((s) => s.recentSearches.remove(query)),
      clear: () => this.call((s) => s.recentSearches.clear()),
    }

    this.unitOfWork = {
      run: (fn) => this.call((s) => s.unitOfWork.run(fn)),
    }
  }

  /* ---------- StorageLifecycle ---------- */

  start(): Promise<StartResult> {
    return this.ensureOpen()
  }

  /** The one open of the primary, shared by `start`, every call and every subscription. */
  private ensureOpen(): Promise<StartResult> {
    this.opening ??= this.openPrimary()
    return this.opening
  }

  private async openPrimary(): Promise<StartResult> {
    try {
      await this.options.primary.open()
      return { outcome: 'ready' }
    } catch (error) {
      // Any failure to open means the store cannot be used (FR-016), even a programming error.
      const mapped = toStorageError(error)
      this.useFallback(mapped?.kind ?? 'UNAVAILABLE', false)
      return { outcome: 'unavailable', cause: mapped?.reason === 'newer-version' ? 'newer-version' : 'unavailable' }
    }
  }

  onEvent(listener: (event: StorageEvent) => void): () => void {
    this.listeners.add(listener)
    return () => void this.listeners.delete(listener)
  }

  /* ---------- delegation ---------- */

  private async call<T>(operation: (storage: Storage) => Promise<T>): Promise<T> {
    await this.ensureOpen()
    const used = this.current
    try {
      return await operation(used)
    } catch (error) {
      const mapped = toStorageError(error)
      if (mapped === null) throw error // a programming error is never a storage failure
      if (mapped.kind !== 'UNAVAILABLE') throw mapped
      // Switch once; if another call already switched, just retry on the memory backend.
      if (used === this.current) this.useFallback('UNAVAILABLE', true)
      return await operation(this.current)
    }
  }

  private watchOf<T>(make: (storage: Storage) => Watchable<T>): Watchable<T> {
    return {
      subscribe: (next, error) => {
        const watcher: Watcher = {
          make: () => make(this.current),
          next: next as (value: unknown) => void,
          error,
          detach: undefined,
          attached: false,
          generation: 0,
        }
        this.watchers.add(watcher)
        // Attach once the store has opened, unless the caller cancelled first.
        void this.ensureOpen().then(() => {
          if (this.watchers.has(watcher) && !watcher.attached) this.attach(watcher)
        })
        return () => {
          watcher.generation += 1
          watcher.detach?.()
          this.watchers.delete(watcher)
        }
      },
    }
  }

  /**
   * Subscribes the watcher to the current backend. Each attach is a new generation, and a
   * subscription from an older one is ignored: after a switch, a value or an error still queued
   * on the old backend can never reach the caller, and a subscription that failed while it was
   * being made cannot overwrite the one that replaced it.
   */
  private attach(watcher: Watcher): void {
    watcher.attached = true
    watcher.generation += 1
    const generation = watcher.generation
    const detach = watcher.make().subscribe(
      (value) => {
        if (watcher.generation === generation) watcher.next(value)
      },
      (error) => {
        if (watcher.generation !== generation) return
        if (error.kind === 'UNAVAILABLE' && !this.switched) this.useFallback('UNAVAILABLE', true)
        else watcher.error?.(error)
      },
    )
    if (watcher.generation === generation) watcher.detach = detach
    else detach() // a switch re-attached this watcher while it was subscribing: drop the stale one
  }

  /**
   * Another connection changed the database. `blocked` only waits; an upgrade or a deletion has
   * already closed our connection, so this tab stops writing and uses memory (FR-022). The
   * lifecycle decides what the listener is told, and keeps the first notice.
   */
  private onDatabaseEvent(event: DatabaseEvent): void {
    if (event === 'blocked') {
      this.emit({ type: 'blocked' })
      return
    }
    this.useFallback(event, false)
    this.emit({ type: event })
  }

  /** Switches to the session-only store, once. `announce` emits `lost` (a start failure does not). */
  private useFallback(reason: string, announce: boolean): void {
    if (this.switched) return
    this.switched = true
    this.current = this.options.fallback()
    this.options.diagnostics.record({ kind: 'storage-error', table: '-', key: null, reason })
    for (const watcher of this.watchers) {
      // A watcher not yet attached is attached by its own pending subscribe, on this backend.
      if (!watcher.attached) continue
      watcher.detach?.()
      this.attach(watcher)
    }
    if (announce) this.emit({ type: 'lost' })
  }

  private emit(event: StorageEvent): void {
    for (const listener of [...this.listeners]) listener(event)
  }
}
