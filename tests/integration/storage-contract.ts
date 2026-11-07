import { describe, expect, it, vi } from 'vitest'
import type { DiagnosticsLog, Storage, Watchable } from '@/application/ports'
import type { EntityId } from '@/domain/ids'
import type { Album, Artist, Playlist, Track } from '@/domain/models'

/*
 * The shared contract suite (002 plan R2, R9; contracts/storage-ports.md oracles P-T1, P-T2,
 * P-T3, P-T6). One suite, run against both backends, is what proves that the in-memory
 * fallback behaves exactly like the real store. Not a test file itself: the two backend test
 * files call `defineStorageContract`.
 */

export interface ContractHarness {
  storage: Storage
  diagnostics: DiagnosticsLog
  /** Releases the backend (closes and deletes a database). */
  dispose(): Promise<void>
}

const id = (value: string) => value as EntityId

const track = (n: number, overrides: Partial<Track> = {}): Track => ({
  id: id(`mock:trk_${n}`),
  title: `Song ${n}`,
  artists: [{ id: id('mock:art_1'), name: 'Artist 1' }],
  album: { id: id('mock:alb_1'), title: 'Album 1' },
  durationMs: 180_000,
  genreIds: ['rock'],
  moodIds: [],
  explicit: false,
  playable: true,
  ...overrides,
})

const album = (n: number, overrides: Partial<Album> = {}): Album => ({
  id: id(`mock:alb_${n}`),
  title: `Album ${n}`,
  artists: [{ id: id('mock:art_1'), name: 'Artist 1' }],
  year: 2020,
  trackIds: [id('mock:trk_1'), id('mock:trk_2')],
  ...overrides,
})

const artist = (n: number, overrides: Partial<Artist> = {}): Artist => ({
  id: id(`mock:art_${n}`),
  name: `Artist ${n}`,
  genreIds: ['rock'],
  ...overrides,
})

const playlist = (idValue: string, overrides: Partial<Playlist> = {}): Playlist => ({
  id: idValue,
  kind: 'user',
  name: `Playlist ${idValue}`,
  items: [],
  createdAt: 100,
  updatedAt: 100,
  ...overrides,
})

/** Records every value a Watchable delivers, and waits for a condition on the values. */
function collect<T>(watchable: Watchable<T>) {
  const values: T[] = []
  const unsubscribe = watchable.subscribe((value) => values.push(value))
  return {
    values,
    stop: unsubscribe,
    waitFor: (predicate: (latest: T) => boolean) =>
      vi.waitFor(() => {
        const latest = values.at(-1)
        if (latest === undefined || !predicate(latest)) throw new Error('condition not met yet')
      }),
  }
}

export function defineStorageContract(label: string, make: () => Promise<ContractHarness> | ContractHarness) {
  async function withStorage(fn: (h: ContractHarness) => Promise<void>) {
    const harness = await make()
    try {
      await fn(harness)
    } finally {
      await harness.dispose()
    }
  }

  describe(`${label}: likes`, () => {
    it('add replaces the like of the same track', () =>
      withStorage(async ({ storage }) => {
        await storage.likes.add(id('mock:trk_1'), 10)
        await storage.likes.add(id('mock:trk_1'), 20)
        expect(await storage.likes.list()).toEqual([{ trackId: 'mock:trk_1', likedAt: 20 }])
      }))

    it('remove of an absent track is a no-op, and has reports presence', () =>
      withStorage(async ({ storage }) => {
        await expect(storage.likes.remove(id('mock:absent'))).resolves.toBeUndefined()
        await storage.likes.add(id('mock:trk_1'), 10)
        expect(await storage.likes.has(id('mock:trk_1'))).toBe(true)
        await storage.likes.remove(id('mock:trk_1'))
        expect(await storage.likes.has(id('mock:trk_1'))).toBe(false)
      }))

    it('lists by likedAt descending', () =>
      withStorage(async ({ storage }) => {
        await storage.likes.add(id('mock:trk_1'), 10)
        await storage.likes.add(id('mock:trk_2'), 30)
        await storage.likes.add(id('mock:trk_3'), 20)
        expect((await storage.likes.list()).map((l) => l.trackId)).toEqual(['mock:trk_2', 'mock:trk_3', 'mock:trk_1'])
      }))
  })

  describe(`${label}: playlists`, () => {
    it('stores items [a, b, a] in exactly that order with three distinct uids (P-T2)', () =>
      withStorage(async ({ storage }) => {
        const items = [
          { uid: 'u1', trackId: id('mock:trk_a'), addedAt: 1 },
          { uid: 'u2', trackId: id('mock:trk_b'), addedAt: 2 },
          { uid: 'u3', trackId: id('mock:trk_a'), addedAt: 3 },
        ]
        await storage.playlists.put(playlist('p1', { items, description: 'Road trip' }))
        const read = await storage.playlists.get('p1')
        expect(read?.items.map((i) => i.trackId)).toEqual(['mock:trk_a', 'mock:trk_b', 'mock:trk_a'])
        expect(new Set(read?.items.map((i) => i.uid)).size).toBe(3)
        expect(read).toEqual(playlist('p1', { items, description: 'Road trip' }))
      }))

    it('put replaces the whole playlist', () =>
      withStorage(async ({ storage }) => {
        const item = (uid: string) => ({ uid, trackId: id('mock:trk_1'), addedAt: 1 })
        await storage.playlists.put(playlist('p1', { items: [item('u1'), item('u2')] }))
        await storage.playlists.put(playlist('p1', { items: [item('u9')], name: 'Renamed' }))
        const read = await storage.playlists.get('p1')
        expect(read?.items.map((i) => i.uid)).toEqual(['u9'])
        expect(read?.name).toBe('Renamed')
      }))

    it('lists by updatedAt descending, returns null for an absent id, and delete of an absent id is a no-op', () =>
      withStorage(async ({ storage }) => {
        await storage.playlists.put(playlist('old', { updatedAt: 10 }))
        await storage.playlists.put(playlist('new', { updatedAt: 30 }))
        await storage.playlists.put(playlist('mid', { updatedAt: 20 }))
        expect((await storage.playlists.list()).map((p) => p.id)).toEqual(['new', 'mid', 'old'])
        expect(await storage.playlists.get('absent')).toBeNull()
        await expect(storage.playlists.delete('absent')).resolves.toBeUndefined()
        await storage.playlists.delete('mid')
        expect((await storage.playlists.list()).map((p) => p.id)).toEqual(['new', 'old'])
      }))
  })

  describe(`${label}: ordering ties (review finding: both backends must order equal times the same)`, () => {
    it('breaks ties by key, ascending, whatever the insertion order', () =>
      withStorage(async ({ storage }) => {
        await storage.likes.add(id('mock:trk_2'), 10)
        await storage.likes.add(id('mock:trk_1'), 10)
        expect((await storage.likes.list()).map((l) => l.trackId)).toEqual(['mock:trk_1', 'mock:trk_2'])

        await storage.playlists.put(playlist('b', { updatedAt: 5 }))
        await storage.playlists.put(playlist('a', { updatedAt: 5 }))
        expect((await storage.playlists.list()).map((p) => p.id)).toEqual(['a', 'b'])

        await storage.libraryItems.save('track', id('mock:x'), 7)
        await storage.libraryItems.save('album', id('mock:y'), 7)
        await storage.libraryItems.save('album', id('mock:x'), 7)
        expect((await storage.libraryItems.list()).map((i) => `${i.kind}:${i.entityId}`)).toEqual([
          'album:mock:x',
          'album:mock:y',
          'track:mock:x',
        ])

        await storage.recentSearches.record('zebra', 3)
        await storage.recentSearches.record('apple', 3)
        expect((await storage.recentSearches.list()).map((r) => r.query)).toEqual(['apple', 'zebra'])
      }))
  })

  describe(`${label}: library items`, () => {
    it('keeps one item per (kind, entityId) and lets one entity be saved under two kinds', () =>
      withStorage(async ({ storage }) => {
        await storage.libraryItems.save('album', id('mock:alb_1'), 10)
        await storage.libraryItems.save('album', id('mock:alb_1'), 20)
        await storage.libraryItems.save('track', id('mock:alb_1'), 30)
        expect(await storage.libraryItems.list()).toEqual([
          { kind: 'track', entityId: 'mock:alb_1', addedAt: 30 },
          { kind: 'album', entityId: 'mock:alb_1', addedAt: 20 },
        ])
      }))

    it('filters by kind, orders by addedAt descending, and supports has and remove', () =>
      withStorage(async ({ storage }) => {
        await storage.libraryItems.save('album', id('mock:alb_1'), 10)
        await storage.libraryItems.save('artist', id('mock:art_1'), 30)
        await storage.libraryItems.save('album', id('mock:alb_2'), 20)
        expect((await storage.libraryItems.list('album')).map((i) => i.entityId)).toEqual(['mock:alb_2', 'mock:alb_1'])
        expect(await storage.libraryItems.has('artist', id('mock:art_1'))).toBe(true)
        await storage.libraryItems.remove('artist', id('mock:art_1'))
        expect(await storage.libraryItems.has('artist', id('mock:art_1'))).toBe(false)
        await expect(storage.libraryItems.remove('artist', id('mock:absent'))).resolves.toBeUndefined()
      }))
  })

  describe(`${label}: snapshots`, () => {
    it('returns found tracks in the order of the ids and leaves out missing ones', () =>
      withStorage(async ({ storage }) => {
        await storage.snapshots.putTracks([track(1), track(2), track(3)])
        const read = await storage.snapshots.getTracks([id('mock:trk_3'), id('mock:missing'), id('mock:trk_1')])
        expect(read).toEqual([track(3), track(1)])
      }))

    it('round-trips albums and artists exactly as given', () =>
      withStorage(async ({ storage }) => {
        await storage.snapshots.putAlbums([album(1), album(2, { year: 1999 })])
        await storage.snapshots.putArtists([artist(1), artist(2, { name: 'Other' })])
        expect(await storage.snapshots.getAlbums([id('mock:alb_2'), id('mock:alb_1')])).toEqual([album(2, { year: 1999 }), album(1)])
        expect(await storage.snapshots.getArtists([id('mock:art_2')])).toEqual([artist(2, { name: 'Other' })])
      }))

    it('replaces the display fields when a snapshot is written again', () =>
      withStorage(async ({ storage }) => {
        await storage.snapshots.putTracks([track(1)])
        await storage.snapshots.putTracks([track(1, { title: 'Renamed', durationMs: null })])
        expect(await storage.snapshots.getTracks([id('mock:trk_1')])).toEqual([track(1, { title: 'Renamed', durationMs: null })])
      }))
  })

  describe(`${label}: recent searches`, () => {
    it('moves an existing query to the top and has no cap', () =>
      withStorage(async ({ storage }) => {
        for (let i = 1; i <= 25; i += 1) await storage.recentSearches.record(`query ${i}`, i)
        await storage.recentSearches.record('query 3', 100)
        const list = await storage.recentSearches.list()
        expect(list).toHaveLength(25)
        expect(list[0]).toEqual({ query: 'query 3', searchedAt: 100 })
        expect(list[1]).toEqual({ query: 'query 25', searchedAt: 25 })
      }))

    it('removes one query and clears all', () =>
      withStorage(async ({ storage }) => {
        await storage.recentSearches.record('a', 1)
        await storage.recentSearches.record('b', 2)
        await storage.recentSearches.remove('a')
        expect((await storage.recentSearches.list()).map((r) => r.query)).toEqual(['b'])
        await storage.recentSearches.clear()
        expect(await storage.recentSearches.list()).toEqual([])
      }))
  })

  describe(`${label}: unit of work (P-T3)`, () => {
    it('keeps everything and returns the value when the unit commits', () =>
      withStorage(async ({ storage }) => {
        const result = await storage.unitOfWork.run(async () => {
          await storage.snapshots.putTracks([track(1)])
          await storage.playlists.put(playlist('p1', { items: [{ uid: 'u1', trackId: id('mock:trk_1'), addedAt: 1 }] }))
          return 'done'
        })
        expect(result).toBe('done')
        expect(await storage.snapshots.getTracks([id('mock:trk_1')])).toHaveLength(1)
        expect(await storage.playlists.get('p1')).not.toBeNull()
      }))

    it('keeps nothing when the unit throws after several writes, and the error propagates', () =>
      withStorage(async ({ storage }) => {
        await expect(
          storage.unitOfWork.run(async () => {
            await storage.snapshots.putTracks([track(1)])
            await storage.likes.add(id('mock:trk_1'), 10)
            await storage.playlists.put(playlist('p1'))
            throw new Error('boom')
          }),
        ).rejects.toThrow('boom')
        expect(await storage.snapshots.getTracks([id('mock:trk_1')])).toEqual([])
        expect(await storage.likes.list()).toEqual([])
        expect(await storage.playlists.list()).toEqual([])
      }))
  })

  describe(`${label}: watching (P-T6)`, () => {
    it('delivers the initial value, then values for add and remove, in that order', () =>
      withStorage(async ({ storage }) => {
        const watch = collect(storage.likes.watchList())
        await watch.waitFor((likes) => likes.length === 0)
        await storage.likes.add(id('mock:trk_1'), 10)
        await watch.waitFor((likes) => likes.length === 1)
        await storage.likes.remove(id('mock:trk_1'))
        await watch.waitFor((likes) => likes.length === 0)
        watch.stop()
        // Order of distinct values (emissions may repeat): empty, one like, empty.
        const distinct = watch.values.map((likes) => likes.length).filter((n, i, all) => i === 0 || n !== all[i - 1])
        expect(distinct).toEqual([0, 1, 0])
      }))

    it('delivers a committed unit, and never a value reflecting a rolled-back unit', () =>
      withStorage(async ({ storage }) => {
        const watch = collect(storage.playlists.watchList())
        await watch.waitFor((all) => all.length === 0)
        await expect(
          storage.unitOfWork.run(async () => {
            await storage.playlists.put(playlist('rolled-back'))
            throw new Error('boom')
          }),
        ).rejects.toThrow('boom')
        await storage.unitOfWork.run(async () => {
          await storage.playlists.put(playlist('committed'))
        })
        await watch.waitFor((all) => all.some((p) => p.id === 'committed'))
        watch.stop()
        expect(watch.values.some((all) => all.some((p) => p.id === 'rolled-back'))).toBe(false)
      }))

    it('corrects a subscriber that joined while a unit was in flight and then rolled back', () =>
      withStorage(async ({ storage }) => {
        const seen: number[] = []
        await expect(
          storage.unitOfWork.run(async () => {
            await storage.likes.add(id('mock:trk_1'), 10)
            storage.likes.watchList().subscribe((likes) => seen.push(likes.length))
            throw new Error('boom')
          }),
        ).rejects.toThrow('boom')
        // Whatever it saw during the unit, the last value it holds is the restored (empty) state.
        await vi.waitFor(() => expect(seen.at(-1)).toBe(0))
      }))

    it('watches one playlist: null first, then the playlist, then null after delete', () =>
      withStorage(async ({ storage }) => {
        const watch = collect(storage.playlists.watch('p1'))
        await watch.waitFor((value) => value === null)
        await storage.playlists.put(playlist('p1', { name: 'Mix' }))
        await watch.waitFor((value) => value?.name === 'Mix')
        await storage.playlists.delete('p1')
        await watch.waitFor((value) => value === null)
        watch.stop()
      }))

    it('stops delivering after unsubscribe', () =>
      withStorage(async ({ storage }) => {
        const watch = collect(storage.likes.watchList())
        await watch.waitFor((likes) => likes.length === 0)
        watch.stop()
        const seen = watch.values.length
        await storage.likes.add(id('mock:trk_1'), 10)
        await storage.likes.add(id('mock:trk_2'), 20)
        // Prove the writes completed, then that nothing was delivered.
        expect(await storage.likes.list()).toHaveLength(2)
        expect(watch.values.length).toBe(seen)
      }))
  })
}
