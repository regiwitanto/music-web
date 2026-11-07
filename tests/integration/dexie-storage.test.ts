import { afterEach, describe, expect, it } from 'vitest'
import type { EntityId } from '@/domain/ids'
import { MpDatabase } from '@/infrastructure/persistence/database'
import { DexieStorage } from '@/infrastructure/persistence/dexie-storage'
import { RingDiagnosticsLog } from '@/infrastructure/persistence/diagnostics-log'
import { FixedClock } from '@/test/fakes/FixedClock'
import { defineStorageContract } from './storage-contract'

let counter = 0
const open: MpDatabase[] = []

async function makeDexie() {
  counter += 1
  const db = new MpDatabase(`dexie-contract-${counter}`)
  await db.open()
  open.push(db)
  const clock = new FixedClock(1_000)
  const diagnostics = new RingDiagnosticsLog(clock)
  const storage = new DexieStorage(db, { diagnostics, clock })
  return { db, clock, diagnostics, storage }
}

afterEach(async () => {
  for (const db of open.splice(0)) {
    const name = db.name
    db.close()
    await MpDatabase.delete(name)
  }
})

// The shared contract, on the real store.
defineStorageContract('DexieStorage', async () => {
  const { storage, diagnostics } = await makeDexie()
  return { storage, diagnostics, dispose: async () => {} }
})

const id = (value: string) => value as EntityId
const trackRow = (n: number, extra: object = {}) => ({
  id: `mock:trk_${n}`,
  title: `Song ${n}`,
  artists: [{ id: 'mock:art_1', name: 'Artist 1' }],
  durationMs: 1,
  genreIds: [],
  moodIds: [],
  explicit: false,
  playable: true,
  artistIds: ['mock:art_1'],
  providerId: 'mock',
  addedAt: 5,
  ...extra,
})

describe('DexieStorage: invalid stored rows are skipped and logged (P-T4)', () => {
  it('skips a row that fails validation in every built table, loads the rest, and records one entry per row', async () => {
    const { db, storage, diagnostics } = await makeDexie()
    await db.table('likes').bulkPut([
      { trackId: 'mock:trk_good', likedAt: 10 },
      { trackId: 'mock:trk_bad' }, // missing likedAt
    ])
    await db.table('playlists').bulkPut([
      { id: 'good', kind: 'user', name: 'Good', items: [], createdAt: 1, updatedAt: 1 },
      { id: 'bad', kind: 'user', name: 'Bad', items: 'not-an-array', createdAt: 1, updatedAt: 1 },
    ])
    await db.table('libraryItems').bulkPut([
      { kind: 'album', entityId: 'mock:alb_good', addedAt: 1 },
      { kind: 'podcast', entityId: 'mock:alb_bad', addedAt: 1 },
    ])
    await db.table('recentSearches').bulkPut([
      { query: 'good', searchedAt: 1 },
      { query: 'bad' }, // missing searchedAt
    ])
    await db.table('tracks').bulkPut([trackRow(1), { ...trackRow(2), title: undefined }])
    await db.table('albums').bulkPut([{ id: 'mock:alb_bad', title: 'No artists', addedAt: 1 }])
    await db.table('artists').bulkPut([{ id: 'mock:art_bad', addedAt: 1 }])

    expect((await storage.likes.list()).map((l) => l.trackId)).toEqual(['mock:trk_good'])
    expect((await storage.playlists.list()).map((p) => p.id)).toEqual(['good'])
    expect(await storage.playlists.get('bad')).toBeNull()
    expect((await storage.libraryItems.list()).map((i) => i.entityId)).toEqual(['mock:alb_good'])
    expect((await storage.recentSearches.list()).map((r) => r.query)).toEqual(['good'])
    expect((await storage.snapshots.getTracks([id('mock:trk_1'), id('mock:trk_2')])).map((t) => t.id)).toEqual(['mock:trk_1'])
    expect(await storage.snapshots.getAlbums([id('mock:alb_bad')])).toEqual([])
    expect(await storage.snapshots.getArtists([id('mock:art_bad')])).toEqual([])

    const entries = diagnostics.entries().filter((e) => e.kind === 'invalid-row')
    const seen = (table: string, key: string) => entries.some((e) => e.table === table && e.key !== null && e.key.includes(key))
    expect(seen('likes', 'mock:trk_bad')).toBe(true)
    expect(seen('playlists', 'bad')).toBe(true)
    expect(seen('libraryItems', 'mock:alb_bad')).toBe(true)
    expect(seen('recentSearches', 'bad')).toBe(true)
    expect(seen('tracks', 'mock:trk_2')).toBe(true)
    expect(seen('albums', 'mock:alb_bad')).toBe(true)
    expect(seen('artists', 'mock:art_bad')).toBe(true)
    for (const entry of entries) expect(entry.reason.length).toBeGreaterThan(0)
  })
})

describe('DexieStorage: unknown fields survive a rewrite (P-T5, FR-015)', () => {
  const future = { nested: [1, 2] }

  it('keeps futureField when each kind of row is written again', async () => {
    const { db, storage } = await makeDexie()
    await db.table('likes').put({ trackId: 'mock:trk_1', likedAt: 1, futureField: future })
    await db.table('playlists').put({ id: 'p1', kind: 'user', name: 'Old', items: [], createdAt: 1, updatedAt: 1, futureField: future })
    await db.table('libraryItems').put({ kind: 'album', entityId: 'mock:alb_1', addedAt: 1, futureField: future })
    await db.table('recentSearches').put({ query: 'queen', searchedAt: 1, futureField: future })
    await db.table('tracks').put(trackRow(1, { futureField: future }))

    await storage.likes.add(id('mock:trk_1'), 99)
    await storage.playlists.put({ id: 'p1', kind: 'user', name: 'New', items: [], createdAt: 1, updatedAt: 2 })
    await storage.libraryItems.save('album', id('mock:alb_1'), 99)
    await storage.recentSearches.record('queen', 99)
    await storage.snapshots.putTracks([
      { id: id('mock:trk_1'), title: 'Renamed', artists: [], durationMs: 2, genreIds: [], moodIds: [], explicit: false, playable: true },
    ])

    expect((await db.table('likes').get('mock:trk_1')).futureField).toEqual(future)
    expect((await db.table('likes').get('mock:trk_1')).likedAt).toBe(99)
    expect((await db.table('playlists').get('p1')).futureField).toEqual(future)
    expect((await db.table('playlists').get('p1')).name).toBe('New')
    expect((await db.table('libraryItems').get(['album', 'mock:alb_1'])).futureField).toEqual(future)
    expect((await db.table('recentSearches').get('queen')).futureField).toEqual(future)
    expect((await db.table('tracks').get('mock:trk_1')).futureField).toEqual(future)
    expect((await db.table('tracks').get('mock:trk_1')).title).toBe('Renamed')
  })
})

describe('DexieStorage: derived columns and snapshot times', () => {
  it('sets artistIds, providerId and addedAt on the raw track row, and strips them on read', async () => {
    const { db, storage, clock } = await makeDexie()
    clock.current = 5_000
    const track = {
      id: id('local:sha1-ab12'),
      title: 'Local song',
      artists: [
        { id: id('local:art_a'), name: 'A' },
        { id: id('local:art_b'), name: 'B' },
      ],
      durationMs: null,
      genreIds: [],
      moodIds: [],
      explicit: false,
      playable: true,
    }
    await storage.snapshots.putTracks([track])
    const raw = await db.table('tracks').get('local:sha1-ab12')
    expect(raw).toMatchObject({ artistIds: ['local:art_a', 'local:art_b'], providerId: 'local', addedAt: 5_000 })
    expect(await storage.snapshots.getTracks([track.id])).toEqual([track])
  })

  it('keeps the original addedAt of a track, an album and an artist written again, and replaces the display fields', async () => {
    const { db, storage, clock } = await makeDexie()
    clock.current = 1_000
    const album = { id: id('mock:alb_1'), title: 'Album', artists: [], trackIds: [] }
    const artist = { id: id('mock:art_1'), name: 'Artist', genreIds: [] }
    const track = { id: id('mock:trk_1'), title: 'Song', artists: [], durationMs: 1, genreIds: [], moodIds: [], explicit: false, playable: true }
    await storage.snapshots.putTracks([track])
    await storage.snapshots.putAlbums([album])
    await storage.snapshots.putArtists([artist])

    clock.advance(10_000)
    await storage.snapshots.putTracks([{ ...track, title: 'Song v2' }])
    await storage.snapshots.putAlbums([{ ...album, title: 'Album v2' }])
    await storage.snapshots.putArtists([{ ...artist, name: 'Artist v2' }])

    expect(await db.table('tracks').get('mock:trk_1')).toMatchObject({ title: 'Song v2', addedAt: 1_000 })
    expect(await db.table('albums').get('mock:alb_1')).toMatchObject({ title: 'Album v2', addedAt: 1_000 })
    expect(await db.table('artists').get('mock:art_1')).toMatchObject({ name: 'Artist v2', addedAt: 1_000 })
  })
})

describe('DexieStorage: atomicity on a real failure (FR-012)', () => {
  it('keeps none of a unit when a write inside it fails in IndexedDB', async () => {
    const { storage } = await makeDexie()
    const unclonable = { uid: 'u1', trackId: id('mock:trk_1'), addedAt: 1, bad: () => 1 }
    await expect(
      storage.unitOfWork.run(async () => {
        await storage.likes.add(id('mock:trk_1'), 10)
        await storage.playlists.put({
          id: 'p1',
          kind: 'user',
          name: 'Broken',
          items: [unclonable],
          createdAt: 1,
          updatedAt: 1,
        })
      }),
    ).rejects.toThrow()
    expect(await storage.likes.list()).toEqual([])
    expect(await storage.playlists.list()).toEqual([])
  })
})
