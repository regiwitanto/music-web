import { afterEach, describe, expect, it } from 'vitest'
import { MpDatabase } from '@/infrastructure/persistence/database'

/*
 * Oracle P-T7 (002 contracts/storage-ports.md; data-model §3): schema version 1 declares
 * exactly these tables and indexes, including the tables owned by later features (D-002-1),
 * so features 007, 009 and 010 need no upgrade. Changing version 1 instead of adding
 * version 2 fails this test.
 */

type Expected = { primKey: string; auto?: true; indexes: string[] }

const EXPECTED: Record<string, Expected> = {
  tracks: { primKey: 'id', indexes: ['album.id', '*artistIds', 'addedAt', 'providerId'] },
  albums: { primKey: 'id', indexes: [] },
  artists: { primKey: 'id', indexes: [] },
  libraryItems: { primKey: '[kind+entityId]', indexes: ['kind', 'addedAt'] },
  likes: { primKey: 'trackId', indexes: ['likedAt'] },
  playlists: { primKey: 'id', indexes: ['name', 'updatedAt', 'createdAt'] },
  recentSearches: { primKey: 'query', indexes: ['searchedAt'] },
  settings: { primKey: 'key', indexes: [] },
  playerSnapshot: { primKey: 'id', indexes: [] },
  playEvents: { primKey: '++id', auto: true, indexes: ['trackId', 'startedAt', '[trackId+startedAt]'] },
  localFiles: { primKey: 'trackId', indexes: ['size', 'importedAt'] },
  localArtwork: { primKey: 'artworkId', indexes: [] },
}

let db: MpDatabase | undefined
afterEach(async () => {
  if (db) {
    const name = db.name
    db.close()
    await MpDatabase.delete(name)
    db = undefined
  }
})

describe('schema version 1 (P-T7)', () => {
  it('is named mp-library and is version 1', () => {
    db = new MpDatabase('schema-name-check')
    expect(new MpDatabase().name).toBe('mp-library')
    expect(db.verno).toBe(1)
  })

  it('declares exactly the twelve tables of data-model §3', async () => {
    db = new MpDatabase('schema-tables-check')
    await db.open()
    expect(db.tables.map((t) => t.name).sort()).toEqual(Object.keys(EXPECTED).sort())
  })

  it.each(Object.entries(EXPECTED))('%s has the declared primary key and indexes', async (table, expected) => {
    db = new MpDatabase(`schema-${table}-check`)
    await db.open()
    const schema = db.table(table).schema
    expect(schema.primKey.src).toBe(expected.primKey)
    expect(schema.primKey.auto ?? false).toBe(expected.auto ?? false)
    expect(schema.indexes.map((i) => i.src).sort()).toEqual([...expected.indexes].sort())
  })

  it('indexes the artist ids of a track as a multi-entry index', async () => {
    db = new MpDatabase('schema-multientry-check')
    await db.open()
    const index = db.table('tracks').schema.idxByName.artistIds
    expect(index?.multi).toBe(true)
  })
})
