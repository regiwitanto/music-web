# Contract: The mock catalog (003)

**Shapes**: [data-model.md §4 to §7](../data-model.md) · **Decisions**: [research.md](../research.md) R3 to R8, R10, R13

## 1. Identity

| Property | Value |
|---|---|
| `id` | `mock` |
| `displayName` | `Demo catalog` (R13, needs owner approval at G3) |
| `attribution` | none |
| `onDevice` | `true` |
| `capabilities` | `search`, `browse`, `artistPages`, `albumPages` true; `stream`, `lyrics`, `versions` false; `searchTypes` all four |
| Methods present | `init`, `status`, `search`, `browse`, `getTrack`, `getAlbum`, `getArtist`, `getPlaylist`, `listGenres`, `listMoods`. No `resolveStream`, `getLyrics`, `getVersions` |

## 2. Content

Exact counts, invariants and the generator: [data-model §4](../data-model.md#4-raw-fixture-srcinfrastructureprovidersmockfixturescatalogjson). Artwork: generated SVG `data:` URLs with a dominant colour (R4). No track is playable.

## 3. Semantics

| Request | Result |
|---|---|
| `search` | Per requested type, ranked exact → starts with → contains, then name, then ID, over normalised names (R7); paged (R8); `topResult` by tier, then type order artist, album, track, playlist |
| `search` with empty or whitespace text | every requested group `{ items: [], nextCursor: null }`, no `topResult` |
| `browse` genre | playlists (name), then albums (newest, title), then tracks (album order) |
| `browse` mood | tracks with the mood (album order) |
| `browse` featured | the 8 featured entries in fixture order |
| `getAlbum` | album plus tracks in disc, track order |
| `getArtist` | artist plus 10 top tracks plus 2 albums newest first |
| `getPlaylist` | playlist plus tracks in playlist order |
| unknown ID or unusable cursor | `NOT_FOUND` |

## 4. Development and test-hooks controls (D-003-1; R10)

- Present only when `process.env.NODE_ENV === 'development'` or `process.env.NEXT_PUBLIC_TEST_HOOKS === '1'`, checked as literals inside function bodies. **A normal production build contains none of them**, proven by `pnpm scan:branding` with the strings `__CATALOG__`, `mockFail`, `mockLatency` (and 002's `__STORAGE__`).
- `window.__CATALOG__`: `{ catalog, setLatency(min, max), fail(kind, code?), clear() }`.
- Page address options read once at start: `?mockFail=<kind>[:<CODE>][,…]`, `?mockLatency=<min>-<max>`.
- Kinds: `init`, `search`, `browse`, `getTrack`, `getAlbum`, `getArtist`, `getPlaylist`, `listGenres`, `listMoods`. Unknown kind: ignored, logged.
- `TIMEOUT` is produced by not answering, so the registry's real time limit fires.
- Defaults: `next dev` 200–400 ms; test-hooks build and unit tests 0 ms.

## 5. Oracles

| ID | Check | Spec |
|---|---|---|
| M-T1 | Counts are exactly 12, 8, 40, 80, 600, 20, featured 8 | FR-001 |
| M-T2 | `generateCatalog(20261108)` equals the committed file byte for byte | FR-002, SC-001 |
| M-T3 | Every reference resolves; album track lists match; top tracks are the artist's own | FR-003, SC-002 |
| M-T4 | No text contains a denylisted name (the scan's list) | FR-004, SC-002 |
| M-T5 | Every artwork is a `data:image/svg+xml` URL with a `#RRGGBB` dominant colour | FR-005 |
| M-T6 | Every track `playable: false`; capability flags as §1 | FR-007 |
| M-T7 | Value ranges (durations, years, track numbers) | FR-008 |
| M-T8 | "Bjorn" finds a name containing "Björn"-style accents; case ignored; ranking tiers in order | FR-013 |
| M-T9 | For every genre, every mood, featured and 10 fixed search texts × 4 types: paging to the end returns each item once; `limit` 51 → 50 items; default 20 | FR-014, SC-004 |
| M-T10 | A cursor from another query, a garbage cursor and an old-version cursor → `NOT_FOUND` | R8 |
| M-T11 | A corrupt fixture → `init` fails `INVALID_RESPONSE`, one `invalid-response` diagnostics entry, `status()` `unavailable` | FR-022 |
| M-T12 | `fail('search')` makes search fail `UNAVAILABLE` and browse still succeed; `fail('getAlbum', 'NOT_FOUND')` gives `NOT_FOUND`; each injectable code reaches the caller as that code | FR-023, SC-008 |
| M-T13 | `fail('search', 'TIMEOUT')` through the registry gives `TIMEOUT` at the 2 s limit (fake timers) | FR-020, FR-023 |
| M-T14 | Latency 200–400 with a seeded random source: each answer waits within range; aborting during the wait gives `ABORTED` | FR-019, FR-023 |
| M-T15 | Latency off: 95% of the M-T9 requests answer in under 100 ms (reported, wall-clock) | SC-005 |
