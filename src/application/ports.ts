import type { StorageError } from '@/domain/errors'
import type { EntityId } from '@/domain/ids'
import type { Album, Artist, LibraryItemKind, Like, LibraryItem, Playlist, RecentSearch, Track } from '@/domain/models'

/**
 * Removes the theme and accent value that the 001 version of the app saved on the device
 * (key `mp.appearance`). The identity is static, so the value is obsolete (014 FR-019,
 * contracts/identity.md §5).
 */
export interface ObsoleteDataCleaner {
  /** Never throws, and never reads the value. Storage errors are swallowed. */
  removeObsoleteAppearance(): void
}

/* ---------- Local persistence (feature 002; contracts/storage-ports.md) ---------- */

/** Time and identity come in through ports: the browser globals behind them are not allowed in the domain. */
export interface Clock {
  /** Epoch milliseconds. */
  now(): number
}
export interface IdGenerator {
  uuid(): string
}

/**
 * A value that changes over time. `next` is called with the current value as soon as it is
 * known, then after every change, including changes made in other tabs. Returns an unsubscribe
 * function. (002 research R3: this replaces `useLiveQuery` in components, so reads also work on
 * the in-memory fallback.)
 */
export interface Watchable<T> {
  subscribe(next: (value: T) => void, error?: (error: StorageError) => void): () => void
}

/*
 * Rules for every repository:
 * - Rows that fail validation are skipped and logged to the DiagnosticsLog; list, get and
 *   watch never throw for them (FR-013).
 * - Failures are StorageErrors (FR-019). Programming errors are not wrapped (research R7).
 * - No business rules live here (FR-004).
 */

export interface LikesRepository {
  /** Inserts or replaces the like for that track. */
  add(trackId: EntityId, likedAt: number): Promise<void>
  /** No-op if absent. */
  remove(trackId: EntityId): Promise<void>
  has(trackId: EntityId): Promise<boolean>
  /** `likedAt` descending. */
  list(): Promise<Like[]>
  watchList(): Watchable<Like[]>
}

export interface PlaylistsRepository {
  /** Inserts or replaces the whole playlist. The `items` order is stored exactly (ADR-005). */
  put(playlist: Playlist): Promise<void>
  /** null if absent. */
  get(id: string): Promise<Playlist | null>
  watch(id: string): Watchable<Playlist | null>
  /** `updatedAt` descending. */
  list(): Promise<Playlist[]>
  watchList(): Watchable<Playlist[]>
  /** No-op if absent. */
  delete(id: string): Promise<void>
}

export interface LibraryItemsRepository {
  /** Inserts or replaces. */
  save(kind: LibraryItemKind, entityId: EntityId, addedAt: number): Promise<void>
  remove(kind: LibraryItemKind, entityId: EntityId): Promise<void>
  has(kind: LibraryItemKind, entityId: EntityId): Promise<boolean>
  /** `addedAt` descending. */
  list(kind?: LibraryItemKind): Promise<LibraryItem[]>
  watchList(kind?: LibraryItemKind): Watchable<LibraryItem[]>
}

/** Details needed to show an entity with no catalog (FR-011). Upserts keep the original `addedAt`. */
export interface SnapshotsRepository {
  putTracks(tracks: Track[]): Promise<void>
  putAlbums(albums: Album[]): Promise<void>
  putArtists(artists: Artist[]): Promise<void>
  /** Found entries in the order of `ids`; missing or invalid ids are left out. */
  getTracks(ids: EntityId[]): Promise<Track[]>
  getAlbums(ids: EntityId[]): Promise<Album[]>
  getArtists(ids: EntityId[]): Promise<Artist[]>
}

export interface RecentSearchesRepository {
  /** Inserts, or moves an existing query to the top. */
  record(query: string, searchedAt: number): Promise<void>
  /** `searchedAt` descending, with no cap (FR-004). */
  list(): Promise<RecentSearch[]>
  watchList(): Watchable<RecentSearch[]>
  remove(query: string): Promise<void>
  clear(): Promise<void>
}

/**
 * Atomic groups of writes (FR-012). If `fn` throws, or any write fails, nothing it wrote is
 * kept. Inside `fn`, await only repository calls: an IndexedDB transaction closes if you
 * await anything else, such as a network call (research R4).
 *
 * `fn` may run a second time: if the device store becomes unavailable during the unit, the
 * session switches to memory and `fn` is run again against it. So `fn` must have no effect other
 * than its repository calls (no counters, no changes to outside state), and must be safe to repeat.
 */
export interface StorageUnitOfWork {
  run<T>(fn: () => Promise<T>): Promise<T>
}

/** The library areas. The settings area is defined in the database but has no port yet (D-002-5). */
export interface Storage {
  readonly likes: LikesRepository
  readonly playlists: PlaylistsRepository
  readonly libraryItems: LibraryItemsRepository
  readonly snapshots: SnapshotsRepository
  readonly recentSearches: RecentSearchesRepository
  readonly unitOfWork: StorageUnitOfWork
}

export interface DiagnosticsEntry {
  /** Epoch milliseconds, from the Clock. */
  at: number
  kind: 'invalid-row' | 'storage-error'
  table: string
  /** The row's key, stringified, or null. */
  key: string | null
  reason: string
}

/** A local, in-memory record of problems (FR-013). Exporting it is feature 013. */
export interface DiagnosticsLog {
  record(entry: Omit<DiagnosticsEntry, 'at'>): void
  entries(): readonly DiagnosticsEntry[]
}

export type StorageEvent =
  /** Our upgrade waits for another tab. */
  | { type: 'blocked' }
  /** A newer tab upgraded the database; this connection closed. */
  | { type: 'upgraded-elsewhere' }
  /** Another connection deleted the database. */
  | { type: 'deleted-elsewhere' }
  /** An operation failed with UNAVAILABLE; the facade is now in memory. */
  | { type: 'lost' }

export type StartResult =
  | { outcome: 'ready' }
  | { outcome: 'unavailable'; cause: 'unavailable' | 'newer-version' }

/**
 * How the application opens the store and hears about it changing, without touching Dexie
 * (constitution VIII). Only `storage-lifecycle.ts` turns results and events into the status.
 */
export interface StorageLifecycle {
  /** Opens the primary store; on an availability failure or newer data, switches to memory. Never throws. */
  start(): Promise<StartResult>
  onEvent(listener: (event: StorageEvent) => void): () => void
}
