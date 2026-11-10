# Data Model: Mock Catalog and Provider Registry (003)

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Research**: [research.md](research.md)

Shapes are illustrative TypeScript; field names may be refined at implementation, concepts may not. Library shapes (`Track`, `Album`, `Artist`, `Artwork`, `TrackArtist`) come from 002 ([002 data-model §1](../002-local-persistence/data-model.md)) and are **not changed**.

## 1. Catalog value types (`src/domain/catalog.ts`, types only)

```ts
type SearchType = 'track' | 'album' | 'artist' | 'playlist'

interface ProviderCapabilities {
  search: boolean; browse: boolean; artistPages: boolean; albumPages: boolean
  stream: boolean; lyrics: boolean; versions: boolean
  searchTypes: SearchType[]            // empty when search is false
}

type ProviderStatus = 'ready' | 'degraded' | 'unavailable'

interface ProviderInfo {               // what providers() returns (FR-017)
  id: ProviderId; displayName: string; capabilities: ProviderCapabilities
  attribution?: { text: string; url?: string; license?: string }
  status: ProviderStatus
}

interface Page<T> { items: T[]; nextCursor: string | null; total?: number }

interface SearchQuery { text: string; types: SearchType[]; limit?: number; cursor?: string }
interface SearchResult {
  tracks?: Page<Track>; albums?: Page<Album>; artists?: Page<Artist>; playlists?: Page<CatalogPlaylist>
  topResult?: { kind: SearchType; id: EntityId }
  failedProviders: ProviderId[]        // R2 refinement 3; empty when all answered
}

interface Taxonomy { id: string; name: string; artwork?: Artwork; color?: string }   // id is `<provider>:<local>` (R2)

interface CatalogPlaylist {
  id: EntityId; name: string; description?: string; artwork?: Artwork
  trackIds: EntityId[]; genreIds: string[]; curator?: string
}
type PlaylistWithTracks = CatalogPlaylist & { tracks: Track[] }   // R2 refinement 1
type AlbumWithTracks = Album & { tracks: Track[] }
interface ArtistDetail extends Artist { topTracks: Track[]; albums: Album[]; bio?: string }

type BrowseRequest =
  | { kind: 'genre' | 'mood'; id: string; limit?: number; cursor?: string }
  | { kind: 'featured'; limit?: number; cursor?: string }
type BrowseItem =
  | { kind: 'track'; track: Track }
  | { kind: 'album'; album: Album }
  | { kind: 'playlist'; playlist: CatalogPlaylist }
```

`limit` rules (R8): default 20, above 50 clamped to 50, missing / non-integer / non-positive → 20.

## 2. Errors (`src/domain/errors.ts`, extended)

```ts
type ProviderErrorCode = 'NOT_FOUND' | 'UNAVAILABLE' | 'TIMEOUT' | 'RATE_LIMITED' | 'UNAUTHORIZED'
  | 'NOT_SUPPORTED' | 'INVALID_RESPONSE' | 'STREAM_EXPIRED' | 'ABORTED'

class ProviderError extends Error { readonly code; readonly providerId: string; readonly retryable: boolean }
```

| Code | Retryable | Produced by (in 003) |
|---|---|---|
| NOT_FOUND | no | unknown prefix, unknown ID, unusable cursor (R8) |
| UNAVAILABLE | yes | provider status `unavailable`; `init` time-out; unknown thrown error (converted) |
| TIMEOUT | yes | the registry's time limit (R9) |
| RATE_LIMITED | yes | not produced by the mock except through injection |
| UNAUTHORIZED | no | not produced by the mock except through injection |
| NOT_SUPPORTED | no | capability off or method absent (R9) |
| INVALID_RESPONSE | no | fixture fails validation (R6) |
| STREAM_EXPIRED | yes | not produced in 003 (no streams) |
| ABORTED | — (never shown) | caller's signal |

`retryable` is derived from the code by one table, never set by hand. User-facing messages (provider-contract §6) belong to the screens (004–006), not here.

## 3. Ports (`src/application/ports.ts`, extended)

```ts
interface MusicProvider {
  readonly id: ProviderId
  readonly displayName: string
  readonly capabilities: ProviderCapabilities
  readonly attribution?: { text: string; url?: string; license?: string }
  readonly onDevice: boolean                         // R9: 2 s limit when true, 8 s otherwise
  init?(signal: AbortSignal): Promise<void>
  status(): ProviderStatus
  search?(q: SearchQuery, signal: AbortSignal): Promise<Omit<SearchResult, 'failedProviders'>>
  getTrack?(id: EntityId, signal: AbortSignal): Promise<Track>
  getAlbum?(id: EntityId, signal: AbortSignal): Promise<AlbumWithTracks>
  getArtist?(id: EntityId, signal: AbortSignal): Promise<ArtistDetail>
  getPlaylist?(id: EntityId, signal: AbortSignal): Promise<PlaylistWithTracks>
  browse?(req: BrowseRequest, signal: AbortSignal): Promise<Page<BrowseItem>>
  listGenres?(signal: AbortSignal): Promise<Taxonomy[]>
  listMoods?(signal: AbortSignal): Promise<Taxonomy[]>
  getVersions?(trackId: EntityId, signal: AbortSignal): Promise<Track[]>   // declared, unused in 003
  resolveStream?(trackId: EntityId, signal: AbortSignal): Promise<StreamSource>
  getLyrics?(trackId: EntityId, signal: AbortSignal): Promise<Lyrics | null>
}

/** What the application calls: the registry's surface. Every method's signal is optional. */
interface Catalog {
  search(q: SearchQuery, signal?: AbortSignal): Promise<SearchResult>
  browse(req: BrowseRequest, signal?: AbortSignal): Promise<Page<BrowseItem>>
  getTrack(id: EntityId, signal?: AbortSignal): Promise<Track>
  getAlbum(id: EntityId, signal?: AbortSignal): Promise<AlbumWithTracks>
  getArtist(id: EntityId, signal?: AbortSignal): Promise<ArtistDetail>
  getPlaylist(id: EntityId, signal?: AbortSignal): Promise<PlaylistWithTracks>
  listGenres(signal?: AbortSignal): Promise<Taxonomy[]>
  listMoods(signal?: AbortSignal): Promise<Taxonomy[]>
  providers(): ProviderInfo[]
}

/** Development and test-hooks builds only (R10). */
interface MockCatalogControls {
  setLatency(minMs: number, maxMs: number): void
  fail(kind: MockRequestKind, code?: ProviderErrorCode): void   // default UNAVAILABLE
  clear(): void
}
```

`StreamSource` and `Lyrics` are declared as in provider-contract §2 so the interface is complete; nothing in 003 implements them. `DiagnosticsEntry.kind` gains `'invalid-response' | 'provider-error'` (R6, R9).

## 4. Raw fixture (`src/infrastructure/providers/mock/fixtures/catalog.json`)

Generated by `scripts/mock-catalog/generate.mjs`, seed `20261108` (R3). Validated by zod on load (R6). Local IDs are zero-padded; the `mock:` prefix is stored, so IDs are used as they are.

```ts
interface RawCatalog {
  version: 1
  seed: number
  genres:   { id: string; name: string; color: string }[]                         // 12, id mock:gen_01…
  moods:    { id: string; name: string; color: string }[]                         // 8,  id mock:mood_01…
  artists:  { id: string; name: string; genreIds: string[]; art: RawArt; topTrackIds: string[] }[]  // 40
  albums:   { id: string; title: string; artistIds: string[]; year: number; genreId: string; art: RawArt; trackIds: string[] }[]  // 80
  tracks:   { id: string; title: string; artistIds: string[]; albumId: string; durationMs: number;
              genreIds: string[]; moodIds: string[]; trackNumber: number; discNumber: number; explicit: boolean }[]  // 600
  playlists:{ id: string; name: string; description: string; curator: string; genreIds: string[]; art: RawArt; trackIds: string[] }[]  // 20
  featured: { kind: 'album' | 'playlist'; id: string }[]                          // 8
}
interface RawArt { from: string; to: string; angle: number }   // #RRGGBB, #RRGGBB, 0–359
```

**Mapping on load** (R4, R7): artist names are joined into `TrackArtist[]`; the album title into `track.album`; `RawArt` becomes `Artwork { url: data:image/svg+xml…, dominantColor: from }`; tracks take their album's artwork; every track gets `playable: false` (FR-007); `topTrackIds`, `genreId` on albums, `art` and `featured` are not exposed as such.

**Invariants (tested, FR-001 to FR-005, FR-008)**: exact counts above; every ID unique and prefixed `mock:`; every reference resolves; each album's `trackIds` equal the tracks with that `albumId`, in disc and track order; each artist has 2 albums and 10 `topTrackIds` that are their own tracks; playlists have 15 to 30 distinct tracks; durations 90 000 to 450 000 ms; years 1968 to 2025; colours valid `#RRGGBB`; no text contains a denylisted name; the file equals `generateCatalog(20261108)`.

## 5. In-memory indexes (built once in `MockProvider.init`)

| Index | Key → value |
|---|---|
| `tracksById`, `albumsById`, `artistsById`, `playlistsById`, `genresById`, `moodsById` | ID → mapped entity |
| `normalisedNames` per search type | entity → normalised name (R7) |
| `byGenre` | genre ID → `{ playlists[], albums[], tracks[] }` in browse order |
| `byMood` | mood ID → tracks in album order |

## 6. Cursors (opaque strings, R8)

| Cursor | Encoded content |
|---|---|
| Provider (mock) | base64url `{ v: 1, k: fingerprint, o: offset }` |
| Registry fan-out (search per type, featured) | base64url `{ v: 1, p: { [providerId]: providerCursor or null } }` |

## 7. Provider lifecycle (mock)

```text
created ──first request──▶ initialising ──fixture valid──▶ ready
                               │
                               └─time-out / invalid──▶ failed (request fails; status 'unavailable')
failed ──next request──▶ initialising (retry)
```

`status()` is `ready` once initialised, `unavailable` after a failed `init` until a retry succeeds, and `ready` before the first request (it has not failed). The mock never reports `degraded`.
