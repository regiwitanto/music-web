import Dexie from 'dexie'
import { MIGRATIONS, type Migration } from './migrations'

/**
 * The on-device database (002 data-model §3; research R1). Schema version 1 declares every
 * table of architecture §12, including the ones owned by later features, so 007, 009 and 010
 * need no upgrade (D-002-1). Dexie treats the first entry as the primary key, which is unique
 * by definition, so it is written without the `&` used in architecture §12.
 *
 * `tracks` has derived columns (`artistIds`, `providerId`, `addedAt`) that the repository sets,
 * because Dexie cannot index a computed value.
 *
 * Never edit version 1 once it ships: add a version in `migrations.ts` instead. The registry is a
 * parameter so tests can open a database under a synthetic later version.
 */
export const DATABASE_NAME = 'mp-library'

export class MpDatabase extends Dexie {
  /** The highest schema version this code declares (1 plus the registry). */
  readonly declaredVersion: number

  constructor(name: string = DATABASE_NAME, migrations: readonly Migration[] = MIGRATIONS) {
    // No auto-open: the store is opened only through `DexieStorage.open()`, which checks for newer
    // data first. A call that reached Dexie's auto-open would skip that check (review finding).
    super(name, { autoOpen: false })
    this.version(1).stores({
      tracks: 'id, album.id, *artistIds, addedAt, providerId',
      albums: 'id',
      artists: 'id',
      libraryItems: '[kind+entityId], kind, addedAt',
      likes: 'trackId, likedAt',
      playlists: 'id, name, updatedAt, createdAt',
      localFiles: 'trackId, size, importedAt',
      localArtwork: 'artworkId',
      playEvents: '++id, trackId, startedAt, [trackId+startedAt]',
      recentSearches: 'query, searchedAt',
      settings: 'key',
      playerSnapshot: 'id',
    })
    this.declaredVersion = migrations.reduce((highest, migration) => Math.max(highest, migration.version), 1)
    for (const migration of migrations) {
      this.version(migration.version).stores(migration.stores).upgrade((transaction) => migration.upgrade(transaction))
    }
  }
}
