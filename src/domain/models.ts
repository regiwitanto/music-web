import type { EntityId } from './ids'

/**
 * Library entities (architecture §5; 002 data-model §1). These are the shapes the on-device
 * store keeps. Feature 003 may refine field names but not concepts. All times are epoch
 * milliseconds, stored as given and never recomputed.
 */

export interface Artwork {
  url: string
  width?: number
  height?: number
  dominantColor?: string
}

export interface TrackArtist {
  id: EntityId
  /** Kept here so lists render without lookups. */
  name: string
}

/** A snapshot: everything needed to display a saved track with no catalog (FR-011). */
export interface Track {
  id: EntityId
  title: string
  artists: TrackArtist[]
  album?: { id: EntityId; title: string }
  /** null = unknown until loaded. */
  durationMs: number | null
  artwork?: Artwork
  genreIds: string[]
  moodIds: string[]
  trackNumber?: number
  discNumber?: number
  explicit: boolean
  /** false = metadata only. */
  playable: boolean
  credit?: { text: string; license?: string; licenseUrl?: string; sourceUrl?: string }
}

export interface Artist {
  id: EntityId
  name: string
  artwork?: Artwork
  genreIds: string[]
}

export interface Album {
  id: EntityId
  title: string
  artists: TrackArtist[]
  year?: number
  artwork?: Artwork
  trackIds: EntityId[]
}

export interface PlaylistItem {
  /** Tells entries apart: the same track may appear more than once. */
  uid: string
  trackId: EntityId
  addedAt: number
}

export interface Playlist {
  /** A local UUID: playlists are always user-owned. */
  id: string
  kind: 'user' | 'system-liked'
  name: string
  description?: string
  /** Ordered (ADR-005): the order is the playlist order and is stored exactly. */
  items: PlaylistItem[]
  createdAt: number
  updatedAt: number
}

/** One per track. */
export interface Like {
  trackId: EntityId
  likedAt: number
}

export type LibraryItemKind = 'album' | 'artist' | 'track'

/** One per (kind, entityId). */
export interface LibraryItem {
  kind: LibraryItemKind
  entityId: EntityId
  addedAt: number
}

/** One per query. There is no cap here: EXP-02's limit of 10 is a feature 004 rule (FR-004). */
export interface RecentSearch {
  query: string
  searchedAt: number
}
