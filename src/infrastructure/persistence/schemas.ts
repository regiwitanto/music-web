import { z } from 'zod'
import type { EntityId } from '@/domain/ids'
import type { Album, Artist, LibraryItem, Like, Playlist, RecentSearch, Track } from '@/domain/models'

/**
 * Row validation on read (FR-013, FR-015; 002 research R5). Every object is a `looseObject`, so
 * fields this version does not know pass through and are written back unchanged on a rewrite.
 * zod stays in infrastructure: the domain imports nothing. Each schema is tied to its domain
 * type below, so the type and the schema cannot drift apart silently.
 */

const entityId = z.custom<EntityId>((value) => typeof value === 'string' && /^[^:]+:.+/.test(value), {
  message: 'Expected an entity id like "provider:id"',
})

const artwork = z.looseObject({
  url: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  dominantColor: z.string().optional(),
})

const trackArtist = z.looseObject({ id: entityId, name: z.string() })

const trackBase = {
  id: entityId,
  title: z.string(),
  artists: z.array(trackArtist),
  album: z.looseObject({ id: entityId, title: z.string() }).optional(),
  durationMs: z.number().nullable(),
  artwork: artwork.optional(),
  genreIds: z.array(z.string()),
  moodIds: z.array(z.string()),
  trackNumber: z.number().optional(),
  discNumber: z.number().optional(),
  explicit: z.boolean(),
  playable: z.boolean(),
  credit: z
    .looseObject({
      text: z.string(),
      license: z.string().optional(),
      licenseUrl: z.string().optional(),
      sourceUrl: z.string().optional(),
    })
    .optional(),
}

/** A stored track: the domain Track plus the derived columns (data-model §3). */
export const trackRowSchema = z.looseObject({
  ...trackBase,
  artistIds: z.array(entityId),
  providerId: z.string(),
  addedAt: z.number(),
})

export const albumRowSchema = z.looseObject({
  id: entityId,
  title: z.string(),
  artists: z.array(trackArtist),
  year: z.number().optional(),
  artwork: artwork.optional(),
  trackIds: z.array(entityId),
  addedAt: z.number(),
})

export const artistRowSchema = z.looseObject({
  id: entityId,
  name: z.string(),
  artwork: artwork.optional(),
  genreIds: z.array(z.string()),
  addedAt: z.number(),
})

export const libraryItemSchema = z.looseObject({
  kind: z.enum(['album', 'artist', 'track']),
  entityId,
  addedAt: z.number(),
})

export const likeSchema = z.looseObject({ trackId: entityId, likedAt: z.number() })

export const playlistSchema = z.looseObject({
  id: z.string(),
  kind: z.enum(['user', 'system-liked']),
  name: z.string(),
  description: z.string().optional(),
  items: z.array(z.looseObject({ uid: z.string(), trackId: entityId, addedAt: z.number() })),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const recentSearchSchema = z.looseObject({ query: z.string(), searchedAt: z.number() })

/*
 * Type ties: a domain value must be accepted by its schema's input. `looseObject` adds an index
 * signature (that is how unknown fields pass through), and interfaces such as Track are not
 * assignable to index signatures, so only the known keys are compared.
 */
type KnownKeys<T> = T extends readonly (infer U)[]
  ? KnownKeys<U>[]
  : T extends object
    ? { [K in keyof T as string extends K ? never : K]: KnownKeys<T[K]> }
    : T
type Accepts<S extends z.ZodType, T> = T extends KnownKeys<z.input<S>> ? true : never
type SchemaTies = [
  Accepts<typeof trackRowSchema, Track & { artistIds: EntityId[]; providerId: string; addedAt: number }>,
  Accepts<typeof albumRowSchema, Album & { addedAt: number }>,
  Accepts<typeof artistRowSchema, Artist & { addedAt: number }>,
  Accepts<typeof libraryItemSchema, LibraryItem>,
  Accepts<typeof likeSchema, Like>,
  Accepts<typeof playlistSchema, Playlist>,
  Accepts<typeof recentSearchSchema, RecentSearch>,
]

/** Compiles only while every domain type is accepted by its schema (each element must be `true`). */
export const schemaTies: SchemaTies = [true, true, true, true, true, true, true]
