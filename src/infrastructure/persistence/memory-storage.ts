import type {
  LibraryItemsRepository,
  LikesRepository,
  PlaylistsRepository,
  RecentSearchesRepository,
  SnapshotsRepository,
  Storage,
  StorageUnitOfWork,
  Watchable,
} from '@/application/ports'
import type { EntityId } from '@/domain/ids'
import type { Album, Artist, LibraryItem, LibraryItemKind, Like, Playlist, RecentSearch, Track } from '@/domain/models'
import { compareLibraryItems, compareLikes, comparePlaylists, compareRecentSearches } from './ordering'

/**
 * The session-only store (FR-016; 002 research R2). It is production code, not a test fake: when
 * the device store cannot be opened, or is lost, the app keeps working here for the session,
 * with the same behaviour as the real store except that nothing survives a reload. One shared
 * contract suite runs against both, so the two cannot drift apart.
 *
 * Limitation, deliberate: a unit of work is rolled back by restoring a snapshot taken when it
 * started, so a write from some other call site that happens while the unit is in flight is
 * rolled back with it. The fallback has one user and units are short, so it does not isolate them.
 */

interface State {
  likes: Map<EntityId, Like>
  playlists: Map<string, Playlist>
  libraryItems: Map<string, LibraryItem>
  tracks: Map<EntityId, Track>
  albums: Map<EntityId, Album>
  artists: Map<EntityId, Artist>
  recentSearches: Map<string, RecentSearch>
}

const emptyState = (): State => ({
  likes: new Map(),
  playlists: new Map(),
  libraryItems: new Map(),
  tracks: new Map(),
  albums: new Map(),
  artists: new Map(),
  recentSearches: new Map(),
})

/** Values are copied in and out, so a caller changing an object never changes the store. */
const copy = <T>(value: T): T => structuredClone(value)

const copyState = (state: State): State => ({
  likes: copy(state.likes),
  playlists: copy(state.playlists),
  libraryItems: copy(state.libraryItems),
  tracks: copy(state.tracks),
  albums: copy(state.albums),
  artists: copy(state.artists),
  recentSearches: copy(state.recentSearches),
})

const itemKey = (kind: LibraryItemKind, entityId: EntityId) => `${kind}|${entityId}`

export class MemoryStorage implements Storage {
  private state: State = emptyState()
  private readonly listeners = new Set<() => void>()
  private depth = 0
  private dirty = false

  readonly likes: LikesRepository
  readonly playlists: PlaylistsRepository
  readonly libraryItems: LibraryItemsRepository
  readonly snapshots: SnapshotsRepository
  readonly recentSearches: RecentSearchesRepository
  readonly unitOfWork: StorageUnitOfWork

  constructor() {
    this.likes = {
      add: async (trackId, likedAt) => this.write(() => void this.state.likes.set(trackId, { trackId, likedAt })),
      remove: async (trackId) => this.write(() => void this.state.likes.delete(trackId)),
      has: async (trackId) => this.state.likes.has(trackId),
      list: async () => this.readLikes(),
      watchList: () => this.watch(() => this.readLikes()),
    }

    this.playlists = {
      put: async (playlist) => this.write(() => void this.state.playlists.set(playlist.id, copy(playlist))),
      get: async (id) => this.readPlaylist(id),
      watch: (id) => this.watch(() => this.readPlaylist(id)),
      list: async () => this.readPlaylists(),
      watchList: () => this.watch(() => this.readPlaylists()),
      delete: async (id) => this.write(() => void this.state.playlists.delete(id)),
    }

    this.libraryItems = {
      save: async (kind, entityId, addedAt) =>
        this.write(() => void this.state.libraryItems.set(itemKey(kind, entityId), { kind, entityId, addedAt })),
      remove: async (kind, entityId) => this.write(() => void this.state.libraryItems.delete(itemKey(kind, entityId))),
      has: async (kind, entityId) => this.state.libraryItems.has(itemKey(kind, entityId)),
      list: async (kind) => this.readItems(kind),
      watchList: (kind) => this.watch(() => this.readItems(kind)),
    }

    this.snapshots = {
      putTracks: async (tracks) => this.write(() => tracks.forEach((t) => this.state.tracks.set(t.id, copy(t)))),
      putAlbums: async (albums) => this.write(() => albums.forEach((a) => this.state.albums.set(a.id, copy(a)))),
      putArtists: async (artists) => this.write(() => artists.forEach((a) => this.state.artists.set(a.id, copy(a)))),
      getTracks: async (ids) => this.pick(this.state.tracks, ids),
      getAlbums: async (ids) => this.pick(this.state.albums, ids),
      getArtists: async (ids) => this.pick(this.state.artists, ids),
    }

    this.recentSearches = {
      record: async (query, searchedAt) => this.write(() => void this.state.recentSearches.set(query, { query, searchedAt })),
      list: async () => this.readSearches(),
      watchList: () => this.watch(() => this.readSearches()),
      remove: async (query) => this.write(() => void this.state.recentSearches.delete(query)),
      clear: async () => this.write(() => this.state.recentSearches.clear()),
    }

    this.unitOfWork = {
      run: async (fn) => {
        const before = copyState(this.state)
        this.depth += 1
        try {
          const result = await fn()
          this.depth -= 1
          if (this.depth === 0 && this.dirty) this.flush()
          return result
        } catch (error) {
          this.depth -= 1
          this.state = before
          if (this.depth === 0) {
            // Watchers never saw the unit's writes, but one that subscribed while it was in flight
            // did read them, so everyone is told the restored state (review finding).
            this.flush()
          }
          throw error
        }
      },
    }
  }

  /** Applies a change, and tells watchers once it is committed (immediately, or when the unit commits). */
  private write(change: () => void): void {
    change()
    if (this.depth > 0) this.dirty = true
    else this.flush()
  }

  private flush(): void {
    this.dirty = false
    for (const listener of [...this.listeners]) listener()
  }

  private watch<T>(read: () => T): Watchable<T> {
    return {
      subscribe: (next) => {
        const listener = () => next(read())
        this.listeners.add(listener)
        next(read())
        return () => void this.listeners.delete(listener)
      },
    }
  }

  private pick<K, V>(map: Map<K, V>, ids: K[]): V[] {
    return ids.flatMap((id) => (map.has(id) ? [copy(map.get(id) as V)] : []))
  }

  private readLikes(): Like[] {
    return [...this.state.likes.values()].sort(compareLikes).map(copy)
  }

  private readPlaylist(id: string): Playlist | null {
    const playlist = this.state.playlists.get(id)
    return playlist ? copy(playlist) : null
  }

  private readPlaylists(): Playlist[] {
    return [...this.state.playlists.values()].sort(comparePlaylists).map(copy)
  }

  private readItems(kind?: LibraryItemKind): LibraryItem[] {
    return [...this.state.libraryItems.values()]
      .filter((item) => kind === undefined || item.kind === kind)
      .sort(compareLibraryItems)
      .map(copy)
  }

  private readSearches(): RecentSearch[] {
    return [...this.state.recentSearches.values()].sort(compareRecentSearches).map(copy)
  }
}
