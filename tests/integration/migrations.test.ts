import { afterEach, describe, expect, it } from 'vitest'
import type { EntityId } from '@/domain/ids'
import { MpDatabase } from '@/infrastructure/persistence/database'
import { DexieStorage } from '@/infrastructure/persistence/dexie-storage'
import { RingDiagnosticsLog } from '@/infrastructure/persistence/diagnostics-log'
import type { Migration } from '@/infrastructure/persistence/migrations'
import { FixedClock } from '@/test/fakes/FixedClock'

/*
 * The migration harness (FR-020; quickstart V4; 002 research R8). Version 1 is the first schema,
 * so there are no earlier-version fixtures yet. This proves the harness for later versions: a
 * version 1 database written by the real code is opened through a synthetic version 2 registry
 * and keeps every record. The synthetic registry is injected into `MpDatabase`, so the same code
 * path that applies the real registry is the one under test.
 */

const id = (value: string) => value as EntityId
const names: string[] = []
let counter = 0
const nextName = () => {
  counter += 1
  const name = `migration-test-${counter}`
  names.push(name)
  return name
}

afterEach(async () => {
  for (const name of names.splice(0)) await MpDatabase.delete(name)
})

const V2: Migration[] = [
  {
    version: 2,
    destructive: false,
    stores: { tags: 'id' },
    // Adds a field to every playlist; removes and renames nothing.
    upgrade: async (tx) => {
      await tx.table('playlists').toCollection().modify((playlist: Record<string, unknown>) => {
        playlist.note = 'added by v2'
      })
    },
  },
]

async function writeV1Fixture(name: string) {
  const db = new MpDatabase(name)
  await db.open()
  const clock = new FixedClock(1_000)
  const storage = new DexieStorage(db, { diagnostics: new RingDiagnosticsLog(clock), clock })
  await storage.snapshots.putTracks([
    { id: id('mock:trk_1'), title: 'Song', artists: [{ id: id('mock:art_1'), name: 'A' }], durationMs: 1, genreIds: [], moodIds: [], explicit: false, playable: true },
  ])
  await storage.snapshots.putAlbums([{ id: id('mock:alb_1'), title: 'Album', artists: [], trackIds: [id('mock:trk_1')] }])
  await storage.snapshots.putArtists([{ id: id('mock:art_1'), name: 'A', genreIds: [] }])
  await storage.likes.add(id('mock:trk_1'), 10)
  await storage.playlists.put({
    id: 'p1',
    kind: 'user',
    name: 'Mix',
    items: [
      { uid: 'u1', trackId: id('mock:trk_1'), addedAt: 1 },
      { uid: 'u2', trackId: id('mock:trk_1'), addedAt: 2 },
    ],
    createdAt: 1,
    updatedAt: 2,
  })
  await storage.libraryItems.save('album', id('mock:alb_1'), 5)
  await storage.recentSearches.record('queen', 7)
  // A field written by some other version, to prove it survives the upgrade.
  await db.table('likes').update('mock:trk_1', { futureField: 'kept' })
  db.close()
}

describe('opening a version 1 database under a version 2 registry', () => {
  it('upgrades automatically and keeps every record', async () => {
    const name = nextName()
    await writeV1Fixture(name)

    const db = new MpDatabase(name, V2)
    await db.open()
    expect(db.verno).toBe(2)
    const clock = new FixedClock()
    const storage = new DexieStorage(db, { diagnostics: new RingDiagnosticsLog(clock), clock })

    expect((await storage.snapshots.getTracks([id('mock:trk_1')])).map((t) => t.title)).toEqual(['Song'])
    expect((await storage.snapshots.getAlbums([id('mock:alb_1')])).map((a) => a.title)).toEqual(['Album'])
    expect((await storage.snapshots.getArtists([id('mock:art_1')])).map((a) => a.name)).toEqual(['A'])
    expect(await storage.likes.list()).toMatchObject([{ trackId: 'mock:trk_1', likedAt: 10 }])
    const playlist = await storage.playlists.get('p1')
    expect(playlist?.items.map((i) => i.uid)).toEqual(['u1', 'u2'])
    expect(await storage.libraryItems.list()).toEqual([{ kind: 'album', entityId: 'mock:alb_1', addedAt: 5 }])
    expect(await storage.recentSearches.list()).toEqual([{ query: 'queen', searchedAt: 7 }])
    db.close()
  })

  it('applies the migration (the new table exists, the new field is present) and keeps unknown fields', async () => {
    const name = nextName()
    await writeV1Fixture(name)

    const db = new MpDatabase(name, V2)
    await db.open()
    expect(db.tables.map((t) => t.name)).toContain('tags')
    expect((await db.table('playlists').get('p1')).note).toBe('added by v2')
    expect((await db.table('likes').get('mock:trk_1')).futureField).toBe('kept')
    db.close()
  })

  it('leaves a version 1 database untouched when the registry is empty', async () => {
    const name = nextName()
    await writeV1Fixture(name)
    const db = new MpDatabase(name, [])
    await db.open()
    expect(db.verno).toBe(1)
    expect(db.tables.map((t) => t.name)).not.toContain('tags')
    db.close()
  })
})
