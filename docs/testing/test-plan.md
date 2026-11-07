# Test Plan

> **Status:** Phase 00 draft · **Last reviewed:** 2026-11-07 (O8: E2E-09, UX-AC-10 trace, §7, beta step 8)
> **Owns:** test strategy, tooling, test levels, the provider contract suite, traceability from criteria to tests, the browser audio matrix, accessibility and performance methods, and the manual beta checklist.
> **Related:** criteria in [ux-specification.md §9](../ux-specification.md#9-measurable-ux-acceptance-criteria) · features in [product-requirements.md §5](../product-requirements.md#5-features-and-priorities) · architecture seams in [architecture.md](../architecture.md)

> **Honesty rule:** results are reported exactly as they ran. A test that was not executed is reported as *not run*, never as passing. In Phase 00 no tests exist and none have been run.

## 1. Principles

- Test behaviour through public interfaces: domain functions, store commands, rendered UI. Do not test implementation details.
- Put most of the logic in `domain/`, where tests are fast and deterministic.
- Every `UX-AC` and every P0 feature ID maps to at least one test (§5).
- Tests are deterministic: injected RNG and clock, fixed fixtures, no real network.
- **Audio fixtures** are short tones and silence **generated at test time**, for example a 440 Hz sine encoded to MP3 and WAV by a setup script, or WAV written directly. No third-party audio is downloaded or committed for tests (D3). Corrupt-file fixtures are byte-truncated copies of those generated files.

## 2. Levels and tooling

| Level | Tool | Environment | Covers | Target |
|---|---|---|---|---|
| Unit | Vitest | node | `domain/` (queue, recommendations, ID utilities, LRC parser), zod schemas | ≥ 90% line and branch coverage for `domain/` |
| Store / application | Vitest + `FakeAudioEngine` + `fake-indexeddb` | jsdom | `PlaybackController` state machine, use cases (playlists, import, backup), repositories, migrations | All state-machine transitions in [architecture.md §9](../architecture.md#9-audio-engine-and-playback-controller) |
| Component | Vitest + React Testing Library + user-event | jsdom | Component roles and names, keyboard behaviour, states (loading, empty, error) | Every component in [design-system.md §9](../design-system.md#9-component-inventory) |
| Contract | Vitest | jsdom | Every `MusicProvider` against the shared suite (§3.3) | 100% of providers |
| E2E | Playwright (+ `@axe-core/playwright`) | Chromium, Firefox, WebKit; desktop 1440×900 and mobile 390×844 (touch) | User flows, playback continuity, persistence, accessibility scans | Every P0 flow (§4) |
| Manual | Scripted checklists | Real devices | Audio behaviour in the background and on the lock screen, the OS media UI, iOS specifics | §6 and §8 |

Planned scripts (created in Phase 01): `pnpm test` (Vitest), `pnpm test:e2e` (Playwright), `pnpm typecheck`, `pnpm lint`.

Playwright keeps a trace for every failed **WebKit** test (`trace: 'retain-on-failure'` on the two WebKit projects in `playwright.config.ts`, added 2026-11-06; Chromium and Firefox have tracing off), so a rare flake can be inspected from its first occurrence. `playwright.config.ts` sets `workers: 2`: on a loaded 8-core machine the full suite passed at 2 workers and timed out at the default 8 (docs/quality-gates.md, 001 G9 gap 6). A trace holds the Playwright actions, a DOM snapshot around each action, screencast frames, console output and network requests. It does **not** record DOM events or listeners, or React state. Where to find it: the HTML report (`pnpm exec playwright show-report`) embeds it, and a copy is in `test-results/`. **Both folders are wiped by the next run**, so copy `playwright-report/` (or the `trace.zip`) out before re-running; a standalone zip opens with `pnpm exec playwright show-trace <trace.zip>`. In CI the uploaded HTML report keeps it.

## 3. Key suites

### 3.1 Queue (domain): UX-AC-16
- **Example tests:** one per rule in [architecture.md §5.1](../architecture.md#51-queue-rules), covering shuffle on and off, repeat modes, the 3 s previous threshold, the play-next FIFO block, removing the current item, undo, and duplicates.
- **Property-based tests:** 1,000 random sequences of operations, using a small fast-check-style generator. Use `fast-check` itself only if it is approved as a dev dependency. Assertions:
  - `order` is a permutation;
  - `position` stays in range;
  - the current `uid` is preserved across shuffle toggles and moves;
  - `toggleShuffle` twice restores the canonical order.

### 3.2 Playback controller (application)
Uses `FakeAudioEngine`, which emits scripted events. Cases:
- every state-machine transition;
- events from stale loads are ignored;
- the skip policy: skip with a toast, and stop after 3 consecutive failures;
- `NOT_ALLOWED` sets `needsUserGesture`;
- the restored session starts paused;
- the play-event threshold (≥ 30 s or ≥ 50%);
- `release()` is called when the track changes;
- the Media Session adapter receives metadata and position (with a mocked `navigator.mediaSession`, including handlers that throw).

### 3.3 Provider contract tests
A shared suite, `runProviderContract(provider, fixtures)`, run against each provider. It checks:
- the declared capability flags match the methods that exist (calling a missing method gives `NOT_SUPPORTED`);
- every returned ID has the provider's prefix;
- pagination: cursors make progress and `null` ends the list;
- aborting the `AbortSignal` rejects with `ABORTED`;
- invalid responses produce `INVALID_RESPONSE`;
- `resolveStream` returns a MIME type that `canPlayType` accepts in the test environment (stubbed), and `release` is idempotent.

### 3.4 Storage quota (store level): UX-AC-24
Tested under `fake-indexeddb`, with a stubbed `navigator.storage`. Cases:
- the pre-import check with `estimate()` present and absent;
- a `QuotaExceededError` injected on file *n*: files 1…n−1 are kept, the summary is correct, and no partial rows exist (no orphan Blob, artwork or track);
- 80% and 95% thresholds;
- `persist()` resolving true, false, or missing;
- remove file and remove all: the Blob is deleted, the track is kept and marked missing, and usage is recalculated;
- eviction detection at startup;
- re-import relinks by content hash.

### 3.5 Sample-audio license manifest (Phase 03)
- Every file in `public/audio/sample/` has a `LICENSES.json` entry, and every entry has a file.
- `license` is `CC0-1.0`, `CC-BY-4.0` or `CC-BY-3.0`, and the required TASL fields, `evidenceUrl` and `verifiedAt` are present.
- Until samples exist, the test asserts that the directory is absent or empty, and that the "Play sample tracks" action is hidden.

### 3.6 Persistence and backup: UX-AC-12, UX-AC-13
- Repository CRUD under `fake-indexeddb`.
- Each schema migration from fixture databases.
- Backup round-trip: export, reset, import, export again, then compare with deep equality after normalizing the `exportedAt` timestamps.
- Invalid backups are rejected with a specific `ImportError`.

## 4. E2E flows (P0)

| Flow | Steps (summary) | Criteria |
|---|---|---|
| E2E-01 Navigation shell | Visit the 4 destinations from nav at both viewports; check active state and focus moving to `h1` | UX-AC-05, -07 |
| E2E-02 Playback continuity | Play a generated test-tone track (imported as a local file), do 10 navigations (destinations and detail pages), and sample `audio.currentTime` and the element identity (via a test hook) | UX-AC-01, -02 |
| E2E-03 Player sync | Issue each command from the mini player, the expanded player, the keyboard, and Media Session (simulated by calling the handlers through a test hook); assert every surface | UX-AC-03, -04 |
| E2E-04 Queue | Play an album, play next ×2, add to queue, reorder by drag **and** by keyboard, remove, undo; assert the queue UI and the next track that actually plays | UX-AC-17 |
| E2E-05 Search | Type queries, switch filters, open a result, check recent searches and stale-response handling (mock latency injected) | UX-AC-14, -15 |
| E2E-06 Playlists | Create, rename, add tracks, reorder (pointer and keyboard), delete then undo, reload | UX-AC-23, -12 |
| E2E-07 Local import | Import fixture files: valid MP3, a duplicate, an unsupported type, a corrupt file; check the summary and playback | UX-AC-20 |
| E2E-08 Persistence | Like, playlist, settings, queue; reload and a new browser context with the same storage state; compare backups | UX-AC-12, -13 |
| E2E-09 Visual identity | Cold load with JS-controlled timing: the identity's background, text and accent are applied at first paint (no flash) and the colour scheme is dark; emulate a light system preference: nothing changes; emulate forced colours: focus, active and selected states stay visible; run axe on every route | UX-AC-09, -10, -11 |
| E2E-10 Autoplay | Open with a restored snapshot: paused, correct track and position; play only after a click | UX-AC-18 |
| E2E-11 States | Mock failure injection for search, home and detail pages: error UI, then Retry recovers | UX-AC-22 |
| E2E-12 Keyboard-only | E2E-04 and E2E-06 run using only the keyboard | UX-AC-07, -08 |
| E2E-13 Responsive | Resize 1440 → 390 → 1440 while playing with the queue open; check state is preserved; no horizontal scroll at 320 / 375 / 768 / 1024 / 1440 | UX-AC-05, -06 |
| E2E-14 Storage management | With a stubbed `estimate()` and a quota-error test hook: the pre-import dialog, the threshold warnings and block, removing a file with undo, usage decreasing, the "File missing" row, re-import relinking | UX-AC-24 |
| E2E-15 Branding scan | Visit every route; scan the DOM text, `document.title`, `<meta>` tags and the manifest for forbidden brand names. A companion CI script greps the `next build` output | UX-AC-25 |

**Playwright audio notes.**
- Browsers launched by Playwright may allow autoplay differently from real users. For UX-AC-18, autoplay blocking is checked by asserting the app never calls `play()` without a gesture, using a spy, rather than relying on the browser's policy.
- WebKit on Linux may lack some codecs. Whether it plays MP3 must be confirmed in Phase 01 CI. If it can't, WebKit runs the audio E2E tests against a stubbed engine and real-device checks cover them (§6).

## 5. Traceability matrix

| Criterion | Unit / store | Component | E2E | Manual |
|---|---|---|---|---|
| UX-AC-01 | — | — | E2E-02 | §8 |
| UX-AC-02 | controller | NowPlaying, QueuePanel | E2E-02 | — |
| UX-AC-03 | store selectors | MiniPlayer, NowPlaying | E2E-03 | §6 (OS media UI) |
| UX-AC-04 | — | — | E2E-03 | — |
| UX-AC-05 | — | — | E2E-01, -13 | §8 |
| UX-AC-06 | — | — | E2E-13 | — |
| UX-AC-07 | — | All interactive components | E2E-01, -12 | §8 |
| UX-AC-08 | shortcut handler | — | E2E-12 | — |
| UX-AC-09 | — | — | E2E-09 (axe on all pages) | — |
| UX-AC-10 | — | — | E2E-09 | — |
| UX-AC-11 | token contrast test (computes ratios from `globals.css`) | — | E2E-09 | — |
| UX-AC-12 | repositories | — | E2E-06, -08 | §8 |
| UX-AC-13 | backup round-trip | — | E2E-08 | — |
| UX-AC-14 | search use case (stale-response guard) | SearchField | E2E-05 | — |
| UX-AC-15 | recent-search repository | — | E2E-05 | — |
| UX-AC-16 | queue suite (§3.1) | — | — | — |
| UX-AC-17 | — | QueuePanel | E2E-04 | — |
| UX-AC-18 | controller | PlayButton | E2E-10 | §6 |
| UX-AC-19 | capabilities | VolumeControl | — | §6 |
| UX-AC-20 | import use case, controller skip policy | — | E2E-07 | §6 |
| UX-AC-21 | Home benchmark (Phase 04) | — | Lighthouse CI run (§7) | — |
| UX-AC-22 | — | EmptyState, ErrorState, Skeleton delay | E2E-11 | — |
| UX-AC-23 | playlist use cases | Dialogs | E2E-06, -12 | — |
| UX-AC-24 | storage suite (§3.4) | StorageMeter, ImportDialog | E2E-14 | §6 (real quota and `persist()` behaviour) |
| UX-AC-25 | — | — | E2E-15, plus a build-output scan | — |

**Feature IDs.** Every spec created later must list the feature IDs it covers ([product-requirements.md §5](../product-requirements.md#5-features-and-priorities)) and the tests that verify each one. Phase 06 entry requires every P0 ID to have at least one passing automated test, or a recorded manual check.

## 6. Browser audio limitations matrix

**Support target (D4):**
- the **latest two stable versions** of Chrome, Firefox, Safari and Edge;
- **iOS Safari 17+** as the compatibility baseline;
- Android Chrome, covered by the Chrome target.

These are **expected** behaviours, based on known browser policy, and they are **not yet verified**. Each row must be checked on real browsers during implementation, starting in Phase 03. Record the browser version and the date for each result.

Playwright's WebKit build is **not** Safari. Safari and iOS Safari results only count when they come from real Safari, on macOS and on an iPhone. Chrome and Edge share an engine, but both are checked, because their media and autoplay policies can differ.

| Behaviour | Desktop Chrome / Edge (check both) | Desktop Firefox | Desktop Safari | Android Chrome | iOS Safari (17+) | Verified |
|---|---|---|---|---|---|---|
| Playback starts only after a user gesture on first load | Expected (Media Engagement may relax this) | Expected (autoplay blocking is a setting) | Expected | Expected | Expected (strict) | ☐ |
| `audio.volume` can be set | Yes | Yes | Yes | Yes | **No — read-only** (hide the slider) | ☐ |
| Media Session metadata and play/pause/next/previous | Yes | Yes (verify the version) | Yes | Yes (notification) | Yes (lock screen; verify `seekto`) | ☐ |
| `setPositionState` reflected in the OS UI | Yes | Verify | Verify | Yes | Verify | ☐ |
| Playback continues with the tab in the background | Yes | Yes | Yes | Yes, while the media notification is active | Expected while playing; may pause when the app is suspended (verify, including installed PWA mode) | ☐ |
| Playback continues with the screen locked | n/a | n/a | n/a | Expected | Expected; verify | ☐ |
| MP3 decode | Yes | Yes | Yes | Yes | Yes | ☐ |
| AAC / M4A decode | Yes | Depends on OS codecs (verify) | Yes | Yes | Yes | ☐ |
| FLAC decode | Yes | Yes | Verify | Yes | Verify | ☐ |
| OGG Vorbis / Opus | Yes | Yes | Verify version support | Yes | Verify | ☐ |
| Storage quota for Blobs (order of magnitude) | Large share of free disk | Large share of free disk | Lower; may evict data without `persist()` | Large share | Lower; may evict data after inactivity unless installed or persisted | ☐ |
| `navigator.storage.estimate()` available | Expected | Expected | Verify | Expected | Verify | ☐ |
| `navigator.storage.persist()` outcome (granted silently / prompt / denied) | Heuristic grant | Verify (may prompt) | Verify | Heuristic grant | Verify | ☐ |
| A real `QuotaExceededError` surfaces through Dexie when importing until full (use a test profile) | Verify | Verify | Verify | Verify | Verify | ☐ |

Codec rows feed the import-time `canPlayType` check. The app relies on that runtime check, never on this table.

## 7. Accessibility and performance methods

**Accessibility**
- axe runs on every route in E2E (E2E-09); serious and critical violations fail the build.
- Before each phase gate, a manual screen-reader pass: VoiceOver on macOS and iOS, and NVDA on Windows if one is available, otherwise TalkBack. It covers the nav, search, a playlist, the player, the queue and the dialogs. The owner may defer it under [quality-gates §1](../quality-gates.md#deferral-of-manual-verifications) "Deferral of manual verifications"; a deferred pass is done before the stage named in the register (001: before the Phase 06 beta deployment, deferred 2026-11-06; later phase gates are unaffected unless the owner defers them separately). The axe scans and the keyboard and focus tests are never deferred.
- A focus-order check at 200% zoom.

**Performance (UX-AC-21)**
- Lighthouse (mobile preset, simulated throttling) is run on `/`, `/explore` and `/library` with a seeded library of 500 tracks, using the median of 3 runs. Lab LCP and CLS come from Lighthouse.
- INP is taken from a Playwright trace of typed scripted interactions: play, open the expanded player, type a search, reorder. The worst interaction must be ≤ 200 ms on a CPU throttled 4×.
- Bundle: the size of `next build` output for initial JS per route, gzipped, checked by a CI script.
- Runtime check: the library list renders 2,000 tracks at ≥ 50 fps while scrolling. Virtualize if it doesn't, and record that as an ADR.

## 8. Manual beta checklist

Run on each device and browser combination a tester uses. Record pass, fail or not applicable, with notes.

1. Open the app. The first-run card appears. If samples are bundled, "Play sample tracks" plays audio after a tap. If they are not, the action is absent. The app name shown is the public display name, never "Metrolist" (D5).
2. Navigate to all 4 destinations while playing. The audio never stops.
3. Open and close the expanded player (Back button or gesture on mobile).
4. Lock the screen or background the tab for 2 minutes: does playback continue? Do the lock-screen controls work?
5. Import 3 local files. They play. Reload: they are still there.
6. Like a song, create a playlist, reorder it, reload: everything persists.
7. Search for an artist from the catalog, open the artist page, then an album, and play it.
8. Reload and cold-start the app, also with the device set to a light appearance: the dark identity appears from the first paint with no flash. If the device has a high-contrast or forced-colours mode, turn it on: focus and the active item stay visible.
9. Export a backup, reset the data, import the backup: everything is restored.
10. Open Settings → Storage. The usage figure looks plausible, the protection status is shown, and removing one imported file lowers the usage figure.
11. Export diagnostics (PLAT-05) and attach it to any bug report.
