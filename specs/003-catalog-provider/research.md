# Research: Mock Catalog and Provider Registry (003)

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-11-08

Each item records the decision, why, and the alternatives considered. Items marked **needs owner approval at G3** change an approved document or add a user-visible text, and are listed again in the plan's "Proposed doc amendments".

---

## R1. Where the types and the provider interface live (FR-006, FR-009, FR-018, FR-021)

**Decision**

| What | Where | Why there |
|---|---|---|
| Catalog value types: `ProviderCapabilities`, `SearchType`, `SearchQuery`, `SearchResult`, `Page<T>`, `ArtistDetail`, `AlbumWithTracks`, `CatalogPlaylist`, `PlaylistWithTracks`, `Taxonomy`, `BrowseRequest`, `BrowseItem`, `ProviderStatus`, `ProviderInfo` | `src/domain/catalog.ts` (new, types only) | Pure shapes with no behaviour; presentation (004–006) may import domain types |
| `ProviderError`, `ProviderErrorCode`, the retryable table | `src/domain/errors.ts` (extended) | Architecture §11 already places `ProviderError` in the domain error taxonomy |
| `MusicProvider` (what a provider implements) and `Catalog` (what the application calls: the registry's surface) | `src/application/ports.ts` (extended) | Infrastructure implements application ports and may import only their types (lint rule from 001/002). `MusicProvider` uses `AbortSignal`, a platform type the domain does not take |
| `ProviderRegistry` (implements `Catalog`), `MockProvider` | `src/infrastructure/providers/` | Architecture §4 folder layout |

The domain's library shapes from 002 (`Track`, `Album`, `Artist`, `Artwork`, `TrackArtist`) are reused unchanged (FR-006): a catalog track can be saved to the library as-is.

**Rationale**: Keeps the existing layer rules unchanged. The application and presentation see only `Catalog`; only `container.ts` knows `ProviderRegistry` and `MockProvider`.

**Alternatives considered**: `MusicProvider` in the domain (rejected: `AbortSignal` is a platform type, and the domain lint bans browser globals); presentation calling the registry class directly (rejected: architecture §3 rule 3, only the container wires infrastructure).

## R2. The catalog port: refinements to the contract's interface (FR-012, FR-015, FR-016) — **needs owner approval at G3**

**Decision**: `Catalog` exposes `search`, `browse`, `getTrack`, `getAlbum`, `getArtist`, `getPlaylist`, `listGenres`, `listMoods` and `providers()`. Three refinements to [provider-contract.md §2](../../docs/provider-contract.md#2-interface):

1. **`getPlaylist` returns the playlist with its tracks** (`CatalogPlaylist & { tracks: Track[] }`), like `getAlbum` (spec Story 2 scenario 6). The contract returns only `trackIds`, which would force every screen to fetch 15–30 tracks one by one.
2. **Genre and mood IDs use the entity form `<provider>:<local id>`** (for example `mock:gen_03`). `browse({ kind: 'genre', id })` must be routed to one provider, and routing is by prefix (FR-011). They stay typed as `string` in `Track.genreIds` and `moodIds`, so 002's shapes do not change.
3. **A multi-provider search reports who failed**: `SearchResult` gains `failedProviders: ProviderId[]` (FR-016), so the screen can show the non-blocking notice. Empty when every provider answered.

**Rationale**: Each closes a gap the spec's scenarios need; none changes a concept.

**Alternatives considered**: a separate `getTracks(ids)` batch method instead of refinement 1 (rejected: a new method for one caller; the album already uses the embedded form); a registry-side genre-to-provider map instead of refinement 2 (rejected: a second routing mechanism).

## R3. Fixture format, size and generator (FR-001 to FR-005, FR-008; SC-001, SC-002)

**Decision**

- **Exact counts** (fixed here, tested): 12 genres, 8 moods, 40 artists, 80 albums (2 per artist), **600 tracks** (5 to 12 per album, summing exactly to 600), 20 curated playlists (15 to 30 tracks each), and a featured list of 8 entries (4 playlists, 4 albums).
- **Generator**: `scripts/mock-catalog/generate.mjs`, plain Node with no dependency. It exports `generateCatalog(seed)` (a pure function) and, when run as a script, writes `src/infrastructure/providers/mock/fixtures/catalog.json`. Randomness comes from a small seeded generator written in the file (mulberry32), seed `20261108`. A Vitest test imports `generateCatalog` and compares its output with the committed JSON byte for byte (SC-001).
- **Invented names** are assembled from neutral word parts written for this project (syllables for artist names; adjective and noun lists for album, track and playlist titles), never from real names. A test checks every text against the branding scan's denylist (SC-002), and the existing `pnpm scan:branding` scans `src/`, so the committed JSON is scanned as well.
- **Plausible metadata**: durations 90 s to 7 min 30 s (inside the spec's 1 to 10 min), years 1968 to 2025, about 10% explicit, track and disc numbers per album, each album with one primary genre that its tracks share, one or two moods per track.
- **Raw fixture fields that are not part of a domain shape** (for example an artist's `topTrackIds`, the artwork seed colours, the featured list) live in the raw file and are mapped away on load.
- **Size**: about 600 × 0.35 KB of JSON for tracks plus the rest, roughly 250 KB raw and 40 to 60 KB compressed. Measured at implementation and recorded.

**Rationale**: A committed file plus a reproducible generator gives both a reviewable diff and proof of determinism. No new dependency.

**Alternatives considered**: generating the catalog at runtime from the seed (rejected: the generator would ship to every user and any change to it would silently change the catalog; the committed file makes changes visible); a faker library (rejected: a new dependency, and its name lists may contain real names).

## R4. Artwork (FR-005)

**Decision**: Artwork is a generated SVG gradient delivered as a `data:image/svg+xml` URL, built on load from two colours and an angle stored in the raw fixture. Albums use a linear gradient with a soft shape, artists a radial gradient, genres and moods a flat colour band with their colour. `Artwork.dominantColor` is the first gradient colour as `#RRGGBB`. Tracks use their album's artwork. Colours are drawn in a fixed lightness range so cards read on the dark identity (014) and never need a light text colour change.

**Rationale**: No image files, no third-party content, no network, tiny fixture. A `data:` URL is a normal `Artwork.url`, so 002's snapshots store it unchanged.

**Alternatives considered**: committed PNG files (rejected: hundreds of binary files, no `public/` folder exists yet, and nothing gained); canvas-drawn images at runtime (rejected: needs the DOM in the provider).

## R5. Lazy loading and start-up (FR-024; SC-007)

**Decision**: `MockProvider.init()` loads the fixture with a dynamic `import()` of the JSON, so it becomes a separate chunk that the shell does not download. `init` runs once, on the first catalog request, through one shared promise; a request made while it runs waits for it (spec edge case). The registry gives `init` the **remote limit of 8 s**, because the first load fetches a chunk from the server; the request's own **2 s** limit starts once `init` has finished (FR-020 applies to requests, and FR-024 says a request waits for readiness rather than failing). A failed `init` (time-out or invalid data) fails that request as `UNAVAILABLE` (retryable) or `INVALID_RESPONSE`, and the next request tries `init` again.

**Rationale**: The shell's first paint does not include the catalog. A slow first chunk download is not reported as a 2 s time-out.

**Alternatives considered**: importing the JSON statically (rejected: about 50 KB compressed in the first-load bundle, against FR-024); fetching the JSON from a static file (rejected: needs a `public/` file and a `fetch` path with its own errors, for no gain over a chunk).

**Risk**: Turbopack's handling of a dynamically imported JSON module is checked first at implementation (T-level smoke test in the build); the fallback is a `.ts` module that exports the same data.

## R6. Validation: who validates what (FR-022; provider-contract §8)

**Decision**: **Each provider validates its own source**; the registry does not re-validate domain output. The mock validates the whole fixture once, in `init`, with zod schemas in `src/infrastructure/providers/mock/schema.ts` (zod stays in infrastructure, 002 lint rule). If validation fails, `init` fails with `INVALID_RESPONSE`, one entry goes to the diagnostics log (002), and every request fails the same way until a retry succeeds. Because every mock response is derived from the validated fixture, every response is validated (FR-022). Reference integrity (FR-003) is proven by tests on the fixture, not checked at runtime.

The diagnostics log gains one entry kind, `invalid-response`, with `table` = the provider ID, `key` = the item ID when known, and `reason` = the zod issue path and message (no personal data; the catalog holds none).

**Rationale**: Validation belongs where raw data enters (a remote provider validates its API payload when mapping it). Validating every page again in the registry would double the work and hide a provider that skips its own validation, which the contract suite must catch (spec Story 4 scenario 6).

**Alternatives considered**: registry-side validation of every response (rejected: the reason above); validating each item lazily on access (rejected: more code, and a corrupt file would fail at random points).

## R7. Search and browse semantics in the mock (FR-012 to FR-015; SC-004)

**Decision**

- **Normalisation**: `text.normalize('NFD')`, combining marks removed, lower case, whitespace collapsed and trimmed. Locale-independent. An empty normalised text returns empty groups with no cursor.
- **Matching and ranking** per type, on names only (track title, artist name, album title, playlist name): tier 1 exact, tier 2 starts with the text, tier 3 contains it; within a tier by normalised name, then by ID.
- **Top result**: the best tier across the requested types; ties broken by type order artist, album, track, playlist (an exact artist name is the most likely intent), then by name.
- **Browse genre**: the genre's curated playlists (by name), then its albums (newest first, then title), then its tracks (album order). **Browse mood**: tracks with that mood (album order). **Featured**: the 8 featured entries in fixture order.
- **Artist detail**: `topTracks` from the raw `topTrackIds` (10 per artist), `albums` newest first.
- **Album with tracks**: disc then track order. **Playlist with tracks**: playlist order.
- Indexes (maps by ID, per-genre and per-mood lists, normalised names) are built once in `init`.

**Rationale**: Deterministic, cheap (600 tracks), and close enough to real search for judging Explore. Personal ranking is Phase 04.

**Alternatives considered**: fuzzy matching (rejected: non-obvious results make screen tests brittle); a search library (rejected: a dependency for 600 items).

## R8. Paging and cursors (FR-014; spec edge cases)

**Decision**

- Page size: default 20, maximum 50. A value above 50 is clamped to 50; a missing, non-integer or non-positive value uses 20.
- **Provider cursors** (mock): base64url of `{ v: 1, k: <request fingerprint>, o: <offset> }`. The fingerprint is the normalised text plus the type (search), or the browse kind and ID. A cursor that does not decode, has another version, or carries another fingerprint fails as `NOT_FOUND` and never returns items of another query (spec Assumptions).
- **Registry cursors** for fan-out requests (search per type, featured browse) wrap the providers' cursors: `{ v: 1, p: { [providerId]: cursor | null } }`. The registry asks only providers whose cursor is not `null`, merges in registry order, and returns `null` when all are done. With one provider this is a thin wrapper; it is tested with two test providers.
- Cursors are opaque strings to callers.

**Rationale**: Offsets are stable because the catalog never changes during a session. The fingerprint makes "a cursor from another query" detectable.

**Alternatives considered**: plain numeric offsets (rejected: cannot detect a foreign cursor); returning `INVALID_RESPONSE` for a bad cursor (rejected: that code means a provider sent bad data, and its message would blame the provider).

## R9. The registry: order, routing, time limits, cancellation, errors (FR-009 to FR-011, FR-016 to FR-021)

**Decision**

- **Order**: a constant `PROVIDER_ORDER = ['local', 'sample', 'mock']`. The registry sorts the providers it is given by that order (unknown IDs after, in the given order). A duplicate ID throws at construction: a programming error, surfaced in development and tests (spec edge case).
- **Routing** by the prefix before the first `:`. No registered provider for the prefix, or the provider reports `NOT_FOUND`, gives `ProviderError('NOT_FOUND')`. A provider whose `status()` is `unavailable` gives `UNAVAILABLE` without being called.
- **Capabilities**: a method the provider's flags say it lacks, or that is absent, gives `NOT_SUPPORTED` without calling it (FR-018). Fan-out search skips providers without `search` or without any requested type.
- **Time limits**: 2 s for a provider whose data is on the device, 8 s for a remote one. `MusicProvider` gains `readonly onDevice: boolean` to say which; the mock sets `true` (its data ships with the app; spec Assumptions), and 009's `local` and `sample` will too. `init` always has 8 s (R5).
- **Cancellation**: the registry combines the caller's signal and its own time-limit timer by hand (an `AbortController` that either source aborts). `AbortSignal.any` is not used because iOS Safari 17.0 to 17.3, inside the D4 baseline, lacks it. Abort by the caller gives `ABORTED`; by the timer, `TIMEOUT`. A result that arrives after either is dropped.
- **Error conversion**: a thrown `ProviderError` passes through (its `providerId` is checked); an `AbortError` becomes `ABORTED`; anything else becomes `UNAVAILABLE` (retryable) and is logged to diagnostics as `provider-error`. Nothing raw reaches the caller (FR-021).
- **Fan-out search**: providers queried in parallel with `Promise.allSettled`; a failed one is left out and listed in `failedProviders`; `ABORTED` is never listed (the whole search was cancelled). If every provider fails, the search fails with the first provider's error.
- **`providers()`** returns `{ id, displayName, capabilities, attribution, status }` for each, in order (FR-017).

**Rationale**: One place for every cross-provider rule, so 009's providers only implement their own data.

**Alternatives considered**: the time limit inside each provider (rejected: duplicated and easy to forget); `AbortSignal.timeout` and `AbortSignal.any` (rejected: the iOS baseline above, and fake timers in tests are simpler with one timer).

## R10. Latency and failure injection, development and test-hooks builds only (FR-023; D-003-1)

**Decision**

- `MockProvider` takes an optional `MockControls` object: `latency: { minMs, maxMs }` and `faults: Map<RequestKind, ProviderErrorCode>`, where `RequestKind` is `search | browse | getTrack | getAlbum | getArtist | getPlaylist | listGenres | listMoods | init`. Latency is drawn from an injected seeded random source and the wait is abortable. An unknown request kind is ignored and logged (spec edge case).
- **Where it can be turned on**: `container.ts` creates the controls only inside `if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_TEST_HOOKS === '1')`, compared as literals inside the function body, so Next inlines them and a normal production build removes the code (the 001 ui-shell §7.2 technique, also used by 002). In production the mock gets no controls at all.
- **Defaults**: `next dev` 200 to 400 ms latency (provider-contract §9.1); test-hooks build 0 ms; unit tests 0 ms.
- **Control surfaces** (both in `src/presentation/testing/catalog-hooks.ts`, flag-gated the same way):
  - `window.__CATALOG__ = { catalog, setLatency(min, max), fail(kind, code), clear() }`, for E2E and manual checks;
  - page address options read once at start: `?mockFail=search:UNAVAILABLE,browse:TIMEOUT` (a code is optional, default `UNAVAILABLE`) and `?mockLatency=200-400`, so a later feature's E2E can set a failure before the page loads.
- **`TIMEOUT` injection** is produced honestly: the mock never answers that kind, and the registry's real time limit fires.
- **Proof of absence**: `scripts/scan-branding.mjs` adds `__CATALOG__`, `mockFail` and `mockLatency` to its test-hook strings, so the normal-build scan fails if any survives (D-003-1).

**Finding while planning (a guard 002 did not add):** the scan's test-hook list does not contain 002's `__STORAGE__`. Checked on 2026-11-08: a normal `pnpm build` of the current `main` tree, then a search of `.next/static` and `.next/server` JavaScript for `__STORAGE__`, found **no match**, so 002's statement that the hook is absent from the normal build is true. But the scan could not have caught a regression. This plan adds `__STORAGE__` to the list together with the 003 strings. **Needs owner approval at G3** (it changes a check that accepted 002 evidence relies on).

**Rationale**: Meets D-003-1 with the mechanism the project already trusts, and makes the absence checkable.

**Alternatives considered**: a separate test-only mock class (rejected: E2E of later features needs the real catalog with faults in a real build); reading `window.location` inside the provider (rejected: infrastructure would read the page; the presentation testing module already owns that).

## R11. The shared contract suite (FR-025, FR-026; SC-003)

**Decision**

- `tests/contract/provider-contract.ts` exports `runProviderContract(subject)` where `subject = { name, create(options?) , samples, corruptSource? }`:
  - `create` builds a fresh provider (optionally over a given source, for the invalid-response check);
  - `samples` lists IDs the provider must know (one per supported entity kind), search texts with matches and without, and a browse request;
  - `corruptSource` is a source of badly shaped data for that provider.
- It tests **the provider directly** (the contract is the provider's), plus one pass **through a registry holding only that provider**, which proves the registry rules apply to it (`NOT_SUPPORTED`, time limits, prefix routing).
- Checks, named so a failure says which rule broke:
  1. `capabilities`: each flag matches whether the method exists; a missing method through the registry gives `NOT_SUPPORTED`; `searchTypes` empty when `search` is false;
  2. `id-prefix`: every ID in every response (items, nested artists, albums, track IDs, genre and mood IDs) starts with `<provider id>:`;
  3. `paging`: following cursors ends within `ceil(total / limit) + 1` pages, never repeats an item, and `limit` above 50 returns at most 50;
  4. `abort`: an already-aborted signal and an abort mid-request both reject with `ABORTED`;
  5. `invalid-response`: a provider created over `corruptSource` rejects with `INVALID_RESPONSE` (skipped, with a recorded reason, only for a provider with no external source);
  6. `stream` (only when `capabilities.stream`): `resolveStream` gives a MIME type that a stubbed `canPlayType` accepts, and calling `release` twice does not throw.
- **Meta-tests** (`tests/contract/broken-providers.test.ts`): five deliberately broken test providers (wrong capability flag, wrong prefix, endless paging, ignores abort, accepts bad data) each make exactly the named check fail; the suite is run with an expectation of failure, not skipped (SC-003).
- Runs in Vitest's existing `node` project (the include gains `tests/contract/**/*.test.ts`). No DOM is needed; `canPlayType` is stubbed. The test plan's "jsdom" for contract tests is amended to "node, jsdom only when a provider needs the DOM".

**Rationale**: The suite is a merge condition for every provider (constitution VII), so it must be shown to catch faults, not only to pass.

**Alternatives considered**: a suite that only goes through the registry (rejected: registry rules would mask provider faults, see R6).

## R12. Testing approach and determinism (constitution X; SC-004 to SC-008)

**Decision**

| Level | What | Where |
|---|---|---|
| Unit (node) | Fixture: counts, references, determinism vs generator, denylist, value ranges; normalisation and ranking; cursors; error table; registry order, routing, time limits (Vitest fake timers), abort, conversion, fan-out with two test providers | `tests/unit/` |
| Contract (node) | The suite against the mock; meta-tests | `tests/contract/` |
| Integration | Not needed: no storage is touched | — |
| E2E (six projects, test-hooks build) | The shell loads without requesting the catalog chunk; `__CATALOG__.catalog.search` works in each browser; `?mockFail=search` makes search fail and browse succeed; a reported first-paint measurement | `tests/e2e/catalog.spec.ts` |
| Build scan | Normal build has none of `__CATALOG__`, `mockFail`, `mockLatency`, `__STORAGE__` | `pnpm scan:branding` |

- **Determinism**: fixed fixture, latency 0, seeded random source for latency, fake timers for time limits, no network.
- **SC-005** (95% of requests under 100 ms, latency off) is measured in a unit test over the 10 search texts plus every genre and mood, and reported with the machine; it is a wall-clock measurement, not proof. **SC-007** is asserted deterministically as "no request for the catalog chunk before the first catalog call" and the first-paint time is reported against the 002 baseline.
- Coverage: `src/domain/**` stays at the 90% gate; the new domain file is types plus the error table.

**Alternatives considered**: component tests (rejected: no components).

## R13. Display name of the mock provider (FR-017) — **needs owner approval at G3**

**Decision**: `displayName: 'Demo catalog'`, no `attribution` (all content is invented and generated). It is user-visible only from 010 (About). Contains no brand name.

**Alternatives considered**: "Mock" (rejected: a developer word in public UI); the app's display name (rejected: the provider is not the app).

## R14. Dependencies

**Decision**: **No new dependency.** zod (already pinned, infrastructure only) validates the fixture; the seeded random source and the SVG builder are a few lines each. `THIRD_PARTY_NOTICES.md` is unchanged.
