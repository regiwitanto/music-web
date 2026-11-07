import type { ZodType } from 'zod'
import { describe, expect, it } from 'vitest'
import {
  albumRowSchema,
  artistRowSchema,
  libraryItemSchema,
  likeSchema,
  playlistSchema,
  recentSearchSchema,
  trackRowSchema,
} from '@/infrastructure/persistence/schemas'

/*
 * Row validation on read (FR-013, FR-015; 002 research R5). For each stored table built in
 * 002: a valid row parses, a row missing a required field fails and names the field, and an
 * unknown field passes through untouched.
 */

const artist = { id: 'mock:art_1', name: 'Artist' }

const valid: Record<string, { schema: ZodType; row: Record<string, unknown>; required: string }> = {
  tracks: {
    schema: trackRowSchema,
    required: 'title',
    row: {
      id: 'mock:trk_1',
      title: 'Song',
      artists: [artist],
      album: { id: 'mock:alb_1', title: 'Album' },
      durationMs: null,
      genreIds: ['rock'],
      moodIds: [],
      explicit: false,
      playable: true,
      artistIds: ['mock:art_1'],
      providerId: 'mock',
      addedAt: 10,
    },
  },
  albums: {
    schema: albumRowSchema,
    required: 'title',
    row: { id: 'mock:alb_1', title: 'Album', artists: [artist], trackIds: ['mock:trk_1'], addedAt: 10 },
  },
  artists: {
    schema: artistRowSchema,
    required: 'name',
    row: { id: 'mock:art_1', name: 'Artist', genreIds: [], addedAt: 10 },
  },
  libraryItems: {
    schema: libraryItemSchema,
    required: 'addedAt',
    row: { kind: 'album', entityId: 'mock:alb_1', addedAt: 10 },
  },
  likes: { schema: likeSchema, required: 'likedAt', row: { trackId: 'mock:trk_1', likedAt: 10 } },
  playlists: {
    schema: playlistSchema,
    required: 'name',
    row: {
      id: 'p1',
      kind: 'user',
      name: 'Mix',
      items: [{ uid: 'u1', trackId: 'mock:trk_1', addedAt: 10 }],
      createdAt: 10,
      updatedAt: 20,
    },
  },
  recentSearches: {
    schema: recentSearchSchema,
    required: 'searchedAt',
    row: { query: 'queen', searchedAt: 10 },
  },
}

describe.each(Object.entries(valid))('%s row schema', (_table, { schema, row, required }) => {
  it('accepts a valid row', () => {
    expect(schema.safeParse(row).success).toBe(true)
  })

  it(`rejects a row missing ${required}, and the issue names the field`, () => {
    const broken = { ...row }
    delete broken[required]
    const result = schema.safeParse(broken)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some((i) => i.path[0] === required)).toBe(true)
  })

  it('keeps a field this version does not know (FR-015)', () => {
    const result = schema.safeParse({ ...row, futureField: { nested: [1, 2] } })
    expect(result.success).toBe(true)
    if (result.success) expect((result.data as Record<string, unknown>).futureField).toEqual({ nested: [1, 2] })
  })
})

describe('field rules', () => {
  it('rejects an entity id with no provider prefix', () => {
    expect(likeSchema.safeParse({ trackId: 'no-colon', likedAt: 1 }).success).toBe(false)
  })

  it('rejects a playlist whose items are not an array', () => {
    const row = { ...valid.playlists!.row, items: 'not-an-array' }
    expect(playlistSchema.safeParse(row).success).toBe(false)
  })

  it('rejects an unknown library item kind', () => {
    expect(libraryItemSchema.safeParse({ kind: 'podcast', entityId: 'mock:x', addedAt: 1 }).success).toBe(false)
  })

  it('accepts a null duration and rejects a missing one', () => {
    const row = { ...valid.tracks!.row }
    expect(trackRowSchema.safeParse({ ...row, durationMs: null }).success).toBe(true)
    delete row.durationMs
    expect(trackRowSchema.safeParse(row).success).toBe(false)
  })
})
