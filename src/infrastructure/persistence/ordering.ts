import type { LibraryItem, Like, Playlist, RecentSearch } from '@/domain/models'

/**
 * The list orders both backends share (contracts/storage-ports.md §2), each with a tiebreaker by
 * key so rows with equal times come back in the same order whichever backend answers (review
 * finding). Times descend; ties break on the key, ascending, compared as plain text.
 */

const text = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

export const compareLikes = (a: Like, b: Like) => b.likedAt - a.likedAt || text(a.trackId, b.trackId)

export const comparePlaylists = (a: Playlist, b: Playlist) => b.updatedAt - a.updatedAt || text(a.id, b.id)

export const compareLibraryItems = (a: LibraryItem, b: LibraryItem) =>
  b.addedAt - a.addedAt || text(a.kind, b.kind) || text(a.entityId, b.entityId)

export const compareRecentSearches = (a: RecentSearch, b: RecentSearch) =>
  b.searchedAt - a.searchedAt || text(a.query, b.query)
