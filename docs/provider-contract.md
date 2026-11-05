# MusicProvider Contract

> **Status:** Phase 00 draft · **Last reviewed:** 2026-11-05
> **Owns:** the provider interface, capability flags, ID scheme, pagination, error types, stream resolution, the compliance checklist, and the specs of the MVP providers.
> **Related:** domain types live in [architecture.md §5](architecture.md#5-domain-model) · source policy in [product-requirements.md §6](product-requirements.md#6-music-source-policy)

## 1. Purpose

A provider supplies catalog **metadata** and, optionally, **playable streams**. The UI and the application layer only ever talk to the `ProviderRegistry`. They never talk to a provider's API directly.

The point of this contract is that a new compliant source can be added without changing any screens. That source can be a CC-licensed catalog API, a user's self-hosted server, or an officially licensed API.

## 2. Interface

```ts
interface MusicProvider {
  readonly id: ProviderId;                 // 'mock' | 'local' | 'sample' | …
  readonly displayName: string;
  readonly capabilities: ProviderCapabilities;
  readonly attribution?: { text: string; url?: string; license?: string };  // shown in About + track details

  // Lifecycle
  init?(signal: AbortSignal): Promise<void>;
  status(): ProviderStatus;                // 'ready' | 'degraded' | 'unavailable'

  // Catalog (only the methods matching the capability flags need to exist)
  search?(q: SearchQuery, signal: AbortSignal): Promise<SearchResult>;
  getTrack?(id: EntityId, signal: AbortSignal): Promise<Track>;
  getAlbum?(id: EntityId, signal: AbortSignal): Promise<Album & { tracks: Track[] }>;
  getArtist?(id: EntityId, signal: AbortSignal): Promise<ArtistDetail>;
  getPlaylist?(id: EntityId, signal: AbortSignal): Promise<CatalogPlaylist>;
  browse?(req: BrowseRequest, signal: AbortSignal): Promise<Page<BrowseItem>>;     // genres, moods, curated
  listGenres?(signal: AbortSignal): Promise<Taxonomy[]>;
  listMoods?(signal: AbortSignal): Promise<Taxonomy[]>;
  getVersions?(trackId: EntityId, signal: AbortSignal): Promise<Track[]>;         // EXP-10, P2

  // Playback
  resolveStream?(trackId: EntityId, signal: AbortSignal): Promise<StreamSource>;
  getLyrics?(trackId: EntityId, signal: AbortSignal): Promise<Lyrics | null>;     // NP-11
}

interface ProviderCapabilities {
  search: boolean; browse: boolean; artistPages: boolean; albumPages: boolean;
  stream: boolean; lyrics: boolean; versions: boolean;
  searchTypes: Array<'track' | 'album' | 'artist' | 'playlist'>;
}

interface SearchQuery { text: string; types: ProviderCapabilities['searchTypes']; limit: number; cursor?: string }
interface SearchResult {
  tracks?: Page<Track>; albums?: Page<Album>; artists?: Page<Artist>; playlists?: Page<CatalogPlaylist>;
  topResult?: { kind: 'track' | 'album' | 'artist' | 'playlist'; id: EntityId };
}
interface Page<T> { items: T[]; nextCursor: string | null; total?: number }

interface ArtistDetail extends Artist { topTracks: Track[]; albums: Album[]; bio?: string }
interface CatalogPlaylist { id: EntityId; name: string; description?: string; artwork?: Artwork;
                            trackIds: EntityId[]; genreIds: string[]; curator?: string }
interface Taxonomy { id: string; name: string; artwork?: Artwork; color?: string }
type BrowseRequest = { kind: 'genre' | 'mood'; id: string; cursor?: string } | { kind: 'featured'; cursor?: string };
type BrowseItem = { kind: 'track'; track: Track } | { kind: 'album'; album: Album } | { kind: 'playlist'; playlist: CatalogPlaylist };

interface StreamSource {
  url: string;                       // http(s): or blob: URL
  mimeType: string;                  // checked with canPlayType before loading
  expiresAt?: number;                // epoch ms; resolve again if past
  release?: () => void;              // e.g. URL.revokeObjectURL; called on track change
}

interface Lyrics { kind: 'synced' | 'plain'; lines: { startMs?: number; text: string }[];
                   source: string; license?: string }
```

## 3. ID scheme

- Every entity ID has the form `"<providerId>:<providerLocalId>"`, for example `mock:trk_0042`, `local:sha1-ab12…` or `sample:night-drive`.
- The registry routes a call by the prefix. IDs are opaque everywhere else: the UI never parses them.
- **Local track IDs** are a content hash: SHA-1 of the first 1 MiB plus the file size, so re-importing the same file creates no duplicate.
- User playlists use plain UUIDs because they are not provider entities ([architecture.md §5](architecture.md#5-domain-model)).

## 4. Capabilities and UI behaviour

The UI decides what to show from the capability flags. It never checks which provider it is talking to.

| Capability false | UI behaviour |
|---|---|
| `stream` | The track row is shown dimmed with a "Preview only" label. Play is disabled and has a tooltip. Do not insert these tracks into the queue. |
| `search` | The provider is left out of Explore search |
| `artistPages` / `albumPages` | Artist and album links render as plain text |
| `lyrics` | The lyrics button is hidden (NP-11) |
| `versions` | The "Other versions" row is hidden (EXP-10) |

## 5. Pagination, cancellation, timing

- Results use cursor-based pages (`nextCursor: null` means the end). Default `limit` is 20, maximum 50.
- Every call accepts an `AbortSignal`. Search aborts the previous request when the query changes.
- The registry wraps each call with a **timeout of 8 s for remote providers and 2 s for local ones**. A timeout surfaces as `ProviderError('TIMEOUT')`.
- **Explore search across providers:** query them in parallel, merge results per type, and keep each provider's order. A provider that fails does not fail the whole search: its results are left out and a non-blocking notice appears.

## 6. Errors

```ts
type ProviderErrorCode =
  | 'NOT_FOUND' | 'UNAVAILABLE' | 'TIMEOUT' | 'RATE_LIMITED' | 'UNAUTHORIZED'
  | 'NOT_SUPPORTED'          // method called despite the capability flag being false
  | 'INVALID_RESPONSE'       // failed zod validation
  | 'STREAM_EXPIRED' | 'ABORTED';
class ProviderError extends Error { code: ProviderErrorCode; providerId: ProviderId; retryable: boolean }
```

| Code | Retryable | User message pattern |
|---|---|---|
| NOT_FOUND | no | "This item isn't available anymore." |
| UNAVAILABLE / TIMEOUT | yes | "Couldn't reach *{provider}*. Try again." |
| RATE_LIMITED | yes (after backoff) | "Too many requests — try again in a moment." |
| UNAUTHORIZED | no | "*{provider}* needs to be reconnected." (no provider has auth in MVP) |
| INVALID_RESPONSE | no | Generic error; details go to the diagnostics log |
| STREAM_EXPIRED | yes, once (resolve again) | Silent |
| ABORTED | — | Never shown |

## 7. Stream resolution

1. `PlaybackController` calls `registry.resolveStream(trackId)` immediately before `engine.load`, never ahead of time. The one exception is that the next track's source may be pre-resolved (but not preloaded) once 80% of the current track has played.
2. If `canPlayType(mimeType)` returns `""`, the controller raises `PlaybackError('UNSUPPORTED_FORMAT')`.
3. When `expiresAt` is set and has passed, the source is resolved again before playing or seeking after a resume.
4. `release()` is always called when the source is replaced.
5. Providers **must not** return URLs obtained by circumventing access controls (see §8).

## 8. Compliance checklist for new providers

A provider can be merged only if **every** item is ticked and recorded in its README:

- [ ] Its data source is an **officially documented** API or files the user owns or controls.
- [ ] Its terms of service **explicitly permit** third-party clients to show this metadata and, if `stream` is true, to play the audio.
- [ ] It does not impersonate another client, spoof user agents or tokens, mint anti-abuse tokens, decipher signatures, or scrape private endpoints.
- [ ] It does not download beyond what the terms allow, remove ads, or bypass DRM or region restrictions.
- [ ] Any required attribution, license notice or link is surfaced through `attribution`.
- [ ] Secrets: none in client code. If the API needs a secret, the provider is blocked until a backend ADR is approved.
- [ ] Every response is validated with zod (`INVALID_RESPONSE` on failure).
- [ ] It has contract tests (the shared suite in [testing/test-plan.md §3.3](testing/test-plan.md#33-provider-contract-tests)).
- [ ] It degrades gracefully: when offline or unavailable, the rest of the app still works.

## 9. MVP providers

### 9.1 MockProvider (`mock`) — SRC-01
- **Capabilities:** search, browse, artist and album pages. `stream`, `lyrics` and `versions` are false.
- Its tracks may instead point at sample audio via `sample:` IDs, so they become playable.
- **Data:** deterministic JSON fixtures in `infrastructure/providers/mock/fixtures/`:
  - about 12 genres, about 8 moods, about 40 artists, about 80 albums, about 600 tracks, about 20 curated playlists
  - generated once by a script with a fixed seed and committed to the repository
  - artwork is locally generated abstract SVG/PNG gradients, with no third-party images
- Names are fictional, so no real artists or trademarks appear.
- **Test hooks:** artificial latency (default 0 ms in tests, 200–400 ms in dev) and failure injection (`?mockFail=search`) for exercising loading and error states.

### 9.2 LocalFileProvider (`local`) — SRC-02, LIB-10
- **Capabilities:** search over local tracks, album and artist pages derived from tags, and `stream`. `lyrics` is P1, from a sidecar `.lrc` with the same base name.
- **Import flow:**
  1. The user picks files, with `<input type="file">` or drag-and-drop. File System Access handles are not used (D2).
  2. Run the pre-import storage check ([architecture.md §12.1](architecture.md#121-storage-quota-handling)).
  3. Check `canPlayType`.
  4. Hash the content (§3).
  5. Parse the tags with `music-metadata`, lazy-loaded.
  6. In one Dexie transaction per file, store the Blob in `localFiles`, the artwork in `localArtwork`, and the track, album and artist snapshots. On `QuotaExceededError`, stop and keep the files already imported.
  7. After the first successful import, request persistent storage (PLAT-06).
  8. Report progress per file, plus a summary: *n imported, n duplicates, n unsupported, n not imported (storage full)*.
- **Missing tags:** title falls back to the file name, artist to "Unknown Artist", and album to "Unknown Album".
- **Embedded artwork:** extracted and stored as a Blob, then served as an object URL.
- **Stream:** `URL.createObjectURL(blob)`, with `release` set to revoke it.

### 9.3 SampleProvider (`sample`) — SRC-03
- **Capabilities:** `stream` only. Metadata comes from the mock catalog, plus a per-track `credit` (see below).
- **Status (D3, approved):** **no audio files are downloaded or bundled yet.** In Phase 03, 10–20 vetted tracks will be added under `public/audio/sample/` as MP3. MP3 is expected to decode in all D4 target browsers, and this is confirmed in the [audio matrix](testing/test-plan.md#6-browser-audio-limitations-matrix). Until then:
  - SampleProvider registers with an empty manifest;
  - the first-run "Play sample tracks" action is hidden;
  - automated tests use **tones generated at test time** (synthesised in the test setup). These are original, not third-party audio, and are never shipped.

**Allowed licenses**
- Only **CC0 1.0** and **CC BY** (4.0 preferred; 3.0 accepted).
- Excluded:
  - CC BY-SA, -NC and -ND
  - public-domain claims without CC0
  - "royalty-free" or "free for personal use" terms
  - any track whose license cannot be verified on the original source page

**Vetting checklist** (every track, before it is committed):
- [ ] The license is shown on the **original** source page by the rights holder or an official archive. Re-uploads by third parties are rejected.
- [ ] The license version is recorded, and an evidence link is saved (an archived snapshot of the source page).
- [ ] The track has no obvious third-party samples, covers or other content that would need separate clearance.
- [ ] Any modifications we make, such as trimming, transcoding or fading, are recorded.
- [ ] The entry is recorded in the manifest below, with the date verified and who verified it.

**Manifest** (`public/audio/sample/LICENSES.json`, created in Phase 03):
```ts
interface SampleCredit {
  id: string;                    // matches `sample:<id>`
  file: string;                  // e.g. "night-drive.mp3"
  title: string; author: string; authorUrl?: string;
  sourceUrl: string;             // original page
  evidenceUrl: string;           // archived copy of the license statement
  license: 'CC0-1.0' | 'CC-BY-4.0' | 'CC-BY-3.0';
  licenseUrl: string;            // the official CC deed URL
  modifications?: string;        // e.g. "Trimmed to 60 s, converted to MP3 128 kbps"
  verifiedAt: string;            // ISO date
  verifiedBy: string;
}
```

**Attribution requirements (how they appear in the app)**
- **CC BY** requires credit to include the **T**itle, the **A**uthor (linked where a URL is given), the **S**ource link and the **L**icense name with a link to the deed (TASL). It must also indicate any **modifications**.
- It must **not imply endorsement** by the author.
- It must **not add restrictions**, such as DRM, that would limit what the license allows.
- **CC0** requires no attribution. We still credit the author and source, for transparency and consistency.
- **Where credit is shown:**
  1. **About → Sample music credits:** the full TASL line for every bundled track, plus its modifications.
  2. **The track details / ⋯ → "Credits"** for any `sample:` track, with the same line.
  3. **The repository:** a `public/audio/sample/README.md` that mirrors the manifest.
- Example line: *"Night Drive" by Jane Doe (janedoe.example) — source: archive.example/… — licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0/) — trimmed to 60 s and converted to MP3.*
- **Automated check (Phase 03):** a unit test requires a valid `LICENSES.json` entry, with an allowed license, for every file in `public/audio/sample/`, and that every entry has its file. The build fails otherwise.

## 10. Registry

`ProviderRegistry` is responsible for:
- registering providers at startup, in a fixed order: `local`, `sample`, `mock`
- routing calls by ID prefix
- fan-out search (§5)
- timeouts
- converting thrown errors to `ProviderError`
- exposing `providers()` so the About screen can show attributions
