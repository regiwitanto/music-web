---

description: "Task list for 002-local-persistence (Local Persistence Foundation)"
---

# Tasks: Local Persistence Foundation

**Input**: Design documents from `specs/002-local-persistence/`:
- [spec.md](spec.md): approved, G1
- [plan.md](plan.md): approved, G3
- [research.md](research.md): R1–R14
- [data-model.md](data-model.md)
- [contracts/storage-ports.md](contracts/storage-ports.md): oracles P-T1 to P-T8
- [contracts/storage-status.md](contracts/storage-status.md): oracles B-T1 to B-T8
- [quickstart.md](quickstart.md): V1 to V12

**Status**: **Approved by the owner, 2026-11-07 (Gate G4 passed).** All 47 tasks are in scope. **Progress (2026-11-08): all 47 tasks done. G13 accepted by the owner, 2026-11-08; recorded in `docs/quality-gates.md`.**

**Post-analysis amendment, 2026-11-07 (owner-approved, documentation only; scope, architecture and the 47 tasks unchanged).** It resolves the `/speckit-analyze` findings:
- U1: a `StorageLifecycle` port (`start`, `onEvent`), so the application never opens Dexie (T010, T029–T031, T040, T041; contracts/storage-ports.md §4–§5);
- M1: `createStorageLifecycle` and `createStorageStatusStore` factories, idempotent per instance (T026, T028, T030);
- M2: a database deleted elsewhere shows `unavailable`, not `stale-tab` (T037, T041; research R8; data-model §6);
- M3: the facade switches to memory at most once; the first notice wins (T029, T037, T041; data-model §6);
- M4: functional assertions and the 1 s budgets are separate; budgets use in-page start/end timestamps (T022, T023, T027; research R10);
- M5: spec Story 1 scenario 2 corrected (owner-approved); full offline start-up stays with 012 (T022);
- L1–L5: spec FR-001, Story 1 scenario 4 and FR-019 wording; `addedAt` checks for albums and artists (T018); watch assertions by value order (T016); T045 wording; schema-test path already corrected in plan and quickstart (T015).

**Tests**: These are **required**. Constitution X requires automated tests of persistence and migrations, and the plan fixes the strategy (R9). Within each story the tests are written first and must **fail** before the implementation tasks start. A test that cannot fail first is recorded in the task note with the reason.

**Organization**: Tasks are grouped by user story:
- US1: saved library data survives reloads and restarts (P1)
- US2: the app keeps working when the device cannot save (P1)
- US3: app updates never lose saved data (P2)

The domain types, ports, schema and pure infrastructure are foundational, because every story uses them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel. It touches different files and does not depend on an incomplete task.
- **[Story]**: US1–US3. Setup, Foundational and Polish tasks have no story label.

## Rules for every task (AGENTS.md)

- **Before you edit:**
  - State the files you will change and why (rule 3).
  - Finish and verify one task before starting the next (rule 4).
- **Layer rules** (001 `contracts/modules.md`, lint-enforced; extended by T006):
  - `src/domain/` imports nothing, not even zod or Dexie.
  - `dexie` and `zod` are imported only inside `src/infrastructure/`.
  - Presentation reaches storage only through `@/application/*`.
  - Only `src/application/container.ts` imports infrastructure.
  - Test fakes live in `src/test/fakes/` and are never imported by app code.
- **Scope** (constitution XIV): implement only what the spec, plan and current task describe. No settings repository (D-002-5), no business rules in repositories (FR-004), no view hook, no quota UI, no export. Raise any gap as a question.
- **Next-specific code:** before writing it, read the matching bundled guide in `node_modules/next/dist/docs/01-app/`.
- **Colours** come from semantic token utilities only; no raw colours outside `src/app/globals.css`.
- **Results:** report each check's command and its actual result. Anything not executed is **not run** (rules 6–7).
- **Time budgets in E2E (constitution X):** prove behaviour first with a generous timeout that only stops a hung test; check a budget separately from start/end timestamps taken in the browser (research R10). These are wall-clock measurements, not fully deterministic: a budget failure is reported with the measured value and investigated, never fixed by raising a timeout or retrying.
- **Machine load (lesson from 014):** never run `pnpm install`, `pnpm build` or edit E2E files while a Playwright run is in progress; the run serves the existing build. Wait for it to finish.
- **Never:**
  - Edit the 001 or 014 artifacts (`specs/001-app-shell/**`, `specs/014-visual-identity/**`).
  - Add a dependency beyond the three in T002.
  - Add an API route, Server Action, middleware or proxy (constitution XIII).
  - Commit or push unless the owner asks.

## Path Conventions

This is a single Next.js App Router project. Sources live in `src/` and tests in `tests/`. `@/` maps to `src/`.

---

## Phase 1: Setup

**Purpose**: A recorded baseline, the three dependencies with their licence review, and the tooling the new tests need.

- [x] T001 Run the baseline gates on the unchanged tree (branch `002-local-persistence`, which differs from `main` only by docs) and record the commands and results in the T001 note of this file. The runs are `pnpm typecheck`, `pnpm lint`, `pnpm test`, then `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` and the full `pnpm test:e2e` (wait for it to finish), then `pnpm build` and `pnpm scan:branding`. The expected baseline is 014's final state: 210 unit and component tests, E2E 566 passed, 0 failed, 166 skipped. Record any difference as baseline, not as a 002 regression. Change no files except `specs/002-local-persistence/tasks.md`.
- [x] T002 After T001's E2E run has finished, run `pnpm add dexie@4.4.7 zod@4.6.7` and `pnpm add -D fake-indexeddb@6.2.7`, so `package.json` pins exact versions like the existing entries. Then verify each licence against the installed `LICENSE` file (research R12): `dexie` Apache-2.0, `zod` MIT, `fake-indexeddb` Apache-2.0. A mismatch stops the task and goes to the owner. Record the commands, the licences found, and whether `dexie` ships a `NOTICE` file. Do not add `dexie-react-hooks` (R3).
- [x] T003 [P] Edit `THIRD_PARTY_NOTICES.md`: add the Apache-2.0 text for `dexie` (with its `NOTICE` content if the package has one) and the MIT text for `zod`, copied from the installed licence files, in the same style as the existing entries. `fake-indexeddb` is dev-only and needs no entry.
- [x] T004 [P] Edit `docs/architecture.md` §2 (plan amendment 1): pin `dexie` 4.4.7 and mark `dexie-react-hooks` as "not adopted in 002 (R3); revisit if a view needs it"; extend `zod`'s "Why" to "validates backup import files, provider responses and stored records on read (SET-04, 002)"; add licence-review rows for `dexie` (Apache-2.0, bundled in the client) and `zod` (MIT, bundled in the client), following the existing rows' columns. Change nothing else in §2.
- [x] T005 Add the Vitest `integration` project to `vitest.config.mts`: `name: 'integration'`, `environment: 'node'`, `include: ['tests/integration/**/*.test.ts']`, `setupFiles: ['fake-indexeddb/auto']`, `extends: true`, leaving the `node` and `dom` projects unchanged. Create `tests/integration/environment.test.ts` with one test that opens a throwaway `new Dexie('env-check')` with one table, writes and reads a row, and deletes the database, proving `fake-indexeddb` and Dexie work in this project. Run `pnpm test` and confirm that the new project runs and the existing 16 files still pass.
- [x] T006 Extend the layer rules (plan phase 1; constitution VIII). Test first, in `tests/lint/layers.test.ts`, add cases that must fail before the config change: `src/presentation/fixture.tsx` importing `dexie` and importing `zod` are rejected with the restricted-imports rule; `src/application/fixture.ts` importing `zod` and `dexie` are rejected; `src/domain/fixture.ts` importing `zod` is rejected; `src/infrastructure/fixture.ts` importing `dexie` and `zod` is **not** rejected. Run them and confirm the new rejections fail. Then edit `eslint.config.mjs`: add `{ group: ["dexie", "dexie/*", "zod", "zod/*"], message: "Dexie and zod are infrastructure only." }` to `applicationPatterns` and `uiPatterns`, and add `"zod", "zod/*"` to the domain group. Run `pnpm test tests/lint` and `pnpm lint`; both must pass.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: The domain types, the application ports, the schema, and the pure infrastructure pieces that every story uses.

**⚠️ CRITICAL**: No user-story work begins until this phase is complete.

- [x] T007 [P] Create `src/domain/ids.ts` (research R13): `type ProviderId = 'mock' | 'local' | 'sample' | (string & {})`, ``type EntityId = `${ProviderId}:${string}` `` and a pure `providerIdOf(id: EntityId): string` returning the part before the first `:`. Test first in `tests/unit/ids.test.ts`: `mock:trk_0042` → `mock`, `local:sha1-ab12` → `local`, `sample:night-drive` → `sample`, and an id containing more than one `:` (`mock:a:b`) → `mock`. Domain imports nothing.
- [x] T008 [P] Create `src/domain/models.ts` with the types of [data-model §1](data-model.md#1-domain-entities-srcdomainmodelsts-srcdomainidsts), copied from architecture §5 with these constraints verbatim: `Track.durationMs: number | null` (null = unknown until loaded); `Track.artists: { id: EntityId; name: string }[]` (name kept so lists render without lookups); `Playlist.id: string` (local UUID), `kind: 'user' | 'system-liked'`, `items: PlaylistItem[]` ("ordered, ADR-005; the order is the playlist order and is stored exactly"), `createdAt`, `updatedAt` as epoch milliseconds; `PlaylistItem { uid: string; trackId: EntityId; addedAt: number }` ("the same track may appear more than once"); `Like { trackId: EntityId; likedAt: number }` ("one per track"); `LibraryItem { kind: 'album' | 'artist' | 'track'; entityId: EntityId; addedAt: number }` ("one per (kind, entityId)"); `RecentSearch { query: string; searchedAt: number }` ("one per query; no cap here"). Types only: no playback, queue or provider types. Verified by `pnpm typecheck`.
- [x] T009 [P] Create `src/domain/errors.ts`: `class StorageError extends Error` with `kind: 'UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'VERSION_CONFLICT'`, `reason?: 'newer-version' | 'blocked' | 'closed-by-upgrade'` and `cause?: unknown` (data-model §2). Test first in `tests/unit/storage-error.test.ts`: it is an `Error` and a `StorageError`, carries its fields, `name` is `StorageError`, and `cause` is preserved.
- [x] T010 Extend `src/application/ports.ts` with the types of [contracts/storage-ports.md §1–§4](contracts/storage-ports.md): `Watchable<T>`, `Clock`, `IdGenerator`, `LikesRepository`, `PlaylistsRepository`, `LibraryItemsRepository`, `SnapshotsRepository`, `RecentSearchesRepository`, `StorageUnitOfWork`, `Storage`, `DiagnosticsEntry` (`at`, `kind: 'invalid-row' | 'storage-error'`, `table`, `key: string | null`, `reason`), `DiagnosticsLog`, and the lifecycle types `StorageEvent` (`blocked`, `upgraded-elsewhere`, `deleted-elsewhere`, `lost`), `StartResult` and `StorageLifecycle` (`start(): Promise<StartResult>`, never throws; `onEvent(listener)` returning an unsubscribe function). Keep `ObsoleteDataCleaner` unchanged. Types only. Document in the `StorageUnitOfWork` comment: "inside `run`, await only repository calls". Verified by `pnpm typecheck`.
- [x] T011 [P] Test first, `tests/unit/diagnostics-log.test.ts`: the log keeps entries in insertion order; `at` comes from the injected clock; when more than 200 entries are recorded the oldest are dropped and `entries()` has length 200; `entries()` returns a read-only snapshot. Then create `src/infrastructure/persistence/diagnostics-log.ts` (`RingDiagnosticsLog`, constructor takes a `Clock` and a capacity defaulting to 200; in memory only, research R6).
- [x] T012 [P] Create `src/infrastructure/persistence/system.ts` (`SystemClock` using `Date.now()`, `CryptoIdGenerator` using `crypto.randomUUID()`) and the test fakes `src/test/fakes/FixedClock.ts` (settable `now`) and `src/test/fakes/SequentialIds.ts` (`id-1`, `id-2`, …). Verified by `pnpm typecheck` and by their use in T011.
- [x] T013 Test first, `tests/unit/storage-errors.test.ts` (oracle P-T8): one case per row of the mapping table in [research R7](research.md#r7-opening-the-store-and-the-status-fr-016-fr-017-fr-019-sc-003-sc-007): `QuotaExceededError` → `QUOTA_EXCEEDED`; `VersionError` → `VERSION_CONFLICT` with reason `newer-version`; each of `OpenFailedError`, `DatabaseClosedError`, `SecurityError`, `InvalidStateError`, `UnknownError`, `MissingAPIError` → `UNAVAILABLE`; a Dexie error whose `inner` is one of these maps the same way; `ConstraintError`, `DataError` and a `TypeError` return `null` (a programming error, rethrown by the caller); `cause` carries the original error. Then create `src/infrastructure/persistence/errors.ts` exporting `toStorageError(error: unknown): StorageError | null`.
- [x] T014 Test first, `tests/unit/row-schemas.test.ts`: for each stored table built in 002 (`tracks`, `albums`, `artists`, `libraryItems`, `likes`, `playlists`, `recentSearches`), a valid row parses; a row missing a required field fails and the issue names the field; a row with an extra field `futureField` parses and **keeps** the field (FR-015). Then create `src/infrastructure/persistence/schemas.ts`: one zod 4 schema per table with `z.looseObject`, tied to its domain type with `satisfies` so type and schema cannot drift (data-model §3 rows, including the derived `tracks` columns `artistIds`, `providerId`, `addedAt` and `addedAt` on `albums` and `artists`). If `satisfies` cannot hold because loose objects add an index signature, tie them with a type-level equality assertion in the file and note it in the T014 record.
- [x] T015 Test first, `tests/integration/schema.test.ts` (oracle P-T7): open the database and assert that `db.tables` has exactly the twelve names of [data-model §3](data-model.md#3-stored-rows-database-mp-library-schema-version-1) and that each table's primary key and index list equals that table's declaration (`tracks`: `id` and indexes `album.id`, `*artistIds` (multi-entry), `addedAt`, `providerId`; `libraryItems`: `[kind+entityId]`, `kind`, `addedAt`; `playEvents`: auto-incrementing `id`, `trackId`, `startedAt`, `[trackId+startedAt]`; and so on for the rest). Then create `src/infrastructure/persistence/database.ts` exporting `MpDatabase extends Dexie` for database name `mp-library`, declaring `this.version(1).stores({...})` with exactly those strings (the first entry is the primary key; no `&` prefix, research R1). The test file lives in `tests/integration/`, not `tests/unit/`, because it needs `fake-indexeddb` (plan and quickstart V2 already name `tests/integration/schema.test.ts`).

**Checkpoint**: `pnpm typecheck`, `pnpm lint`, `pnpm test` pass; `domain/` coverage ≥ 90%.

---

## Phase 3: User Story 1 — saved library data survives reloads and restarts (P1) 🎯 MVP

**Goal**: Likes, playlists with their order, library items, track/album/artist snapshots and recent searches are stored exactly as saved, survive reloads and browser restarts, work offline, and are written all-or-nothing (FR-010 to FR-015).

**Independent Test**: quickstart V1, V6, V7. The contract suite passes on both backends; in E2E one record of every kind is seeded through the test hook, and is read back identically after a reload, after a new browser context from the same storage state, and in a second tab.

### Tests for User Story 1 (write first; they must fail)

- [x] T016 [US1] Create `tests/integration/storage-contract.ts` (a helper, not a test file) exporting `defineStorageContract(label, make)`, where `make()` returns a fresh `Storage` plus its `DiagnosticsLog`. Cover oracles P-T1, P-T2, P-T3 and P-T6 for every repository method of [contracts/storage-ports.md §2](contracts/storage-ports.md#2-repositories-library-areas-only):
  - **Likes:** `add` replaces the like of the same track; `remove` of an absent track is a no-op; `list` is `likedAt` descending.
  - **Playlists:** `put` with items `[a, b, a]` reads back in exactly that order with three distinct `uid`s (P-T2); `list` is `updatedAt` descending; `get` of an absent id is `null`; `delete` of an absent id is a no-op.
  - **Library items:** `(kind, entityId)` is unique; `list(kind)` filters; `addedAt` descending.
  - **Snapshots:** `getTracks(ids)` returns found entries **in the order of `ids`** and leaves out missing ids.
  - **Recent searches:** `record` moves an existing query to the top; no cap (record 25 queries, list returns 25); `remove` and `clear`.
  - **Unit of work (P-T3):** a `run` that writes snapshots, then a playlist, then throws leaves 0 new rows in either table, and the thrown error propagates.
  - **Watch (P-T6):** `watchList` delivers the initial value, then values reflecting `add`, `remove` and a committed `run`, in that order; no delivered value ever reflects a rolled-back `run`. Assert the order of distinct values, not exact emission counts (Dexie `liveQuery` emits asynchronously and may repeat a value).
  - Use `FixedClock` and `SequentialIds`; no real time.
- [x] T017 [P] [US1] Create `tests/integration/memory-storage.test.ts`: `defineStorageContract('MemoryStorage', …)` building a new `MemoryStorage`. Run it and confirm it **fails** (the module does not exist yet).
- [x] T018 [P] [US1] Create `tests/integration/dexie-storage.test.ts`: `defineStorageContract('DexieStorage', …)` with a fresh database name per test (deleted afterwards), plus the Dexie-only cases:
  - **P-T4:** rows seeded raw into each built table with a schema violation (a like without `likedAt`, a playlist whose `items` is not an array, and so on) are skipped by `list`, the valid rows load, `get` of an invalid row is `null`, and one `invalid-row` diagnostics entry exists per skipped row with the table and key.
  - **P-T5:** a row seeded with `futureField` keeps it after `put` (playlists), `putTracks`, `add` (likes), `save` and `record`.
  - **Derived columns:** after `putTracks`, the raw row has `artistIds`, `providerId` and `addedAt`; the domain `Track` read back has none of them; a second `putTracks` for the same id keeps the original `addedAt` and replaces the display fields; the same `addedAt` rule holds for a second `putAlbums` and a second `putArtists`.
  - **Atomicity on a real failure:** inside `run`, a playlist `put` containing a non-cloneable value (a function) makes the IndexedDB transaction fail, and the earlier writes of the same `run` are not kept.
  - Run it and confirm it **fails** (the module does not exist yet).

### Implementation for User Story 1

- [x] T019 [US1] Create `src/infrastructure/persistence/memory-storage.ts`: `MemoryStorage implements Storage`, with all five repositories, `StorageUnitOfWork` (snapshot the state before `fn`, restore it if `fn` throws), and `watch*` backed by its own change emitter that emits after each committed change only. It is production code: the session-only fallback (research R2). It follows the same ordering rules as the ports contract. Run T017 and confirm it passes.
- [x] T020 [US1] Create `src/infrastructure/persistence/dexie-storage.ts`: `DexieStorage implements Storage` over `MpDatabase` (T015). Every read parses rows with the T014 schemas, skips invalid rows and records a diagnostics entry (`kind: 'invalid-row'`, table, key, reason). Updates are read-modify-write inside a transaction so unknown fields are preserved (FR-015). `putTracks` sets and strips the derived columns. `unitOfWork.run` is `db.transaction('rw', <all library tables>, fn)`. `watch*` use Dexie's `liveQuery` wrapped as a `Watchable`; errors from the observable go through `toStorageError`. Failures from Dexie are converted with `toStorageError`; a `null` result rethrows the original error. Run T016 and T018 and confirm both pass.
- [x] T021 [US1] Edit `src/application/container.ts`: add lazy members `clock` (`SystemClock`), `ids` (`CryptoIdGenerator`), `diagnostics` (`RingDiagnosticsLog`) and `storage` (a `DexieStorage`; Dexie opens the database on first use), each overridable through `configureContainer`. Keep `obsoleteData` unchanged. The container stays the only application file importing infrastructure. T031 replaces the `storage` member with the resilience facade. Run `pnpm typecheck` and `pnpm lint`.
- [x] T022 [US1] Create `tests/e2e/persistence.spec.ts` with the US1 cases, using `window.__STORAGE__` from T023. Skip nothing by engine. It must **fail** before T023 because the hook does not exist:
  - **V6 reload:** seed one record of every kind (a like; a playlist with items `[a, b, a]`; library items of kind album, artist and track; a track, an album and an artist snapshot; a recent search) through `page.evaluate`, reload, read everything back, and deep-equal it to what was seeded (SC-001).
  - **V6 restart:** seed, then `context.storageState({ indexedDB: true })`, close the context, create a new context from that state, load the app, read back, deep-equal.
  - **V7 two tabs (FR-014, SC-006):** two pages in one context; on page B call `record('likes')` and wait until its initial value is recorded, so the subscription is active before timing starts.
    - **Functional:** page A takes `t0 = Date.now()` immediately before calling `likes.add`; the test waits (up to 10 s, only to stop a hung test) until page B's recorded entries contain the like.
    - **Performance (separate assertion):** that entry's `at` (taken by `Date.now()` in page B's subscription callback) minus `t0` is below 1000 ms. Both pages read the same machine clock, so test-runner latency is excluded; the measurement is still wall-clock and is reported with its value.
  - **Offline (FR-010, FR-011; Story 1 scenario 2):** with the context set offline after the first load, reading the seeded data still works. Also restart (a new context from the storage state) with every request to a catalog or provider endpoint blocked by `page.route`, and read back. Starting the app with no network at all is out of scope until feature 012 (offline app shell, PLAT-04).
- [x] T023 [US1] Create `src/presentation/testing/storage-hooks.ts` (flag-gated by `NEXT_PUBLIC_TEST_HOOKS`, like the 001 hooks; only this folder reads the flag) exposing `window.__STORAGE__ = { storage, diagnostics, watches, record(name) }`, where `record(name)` subscribes to the named `watch*` method and appends `{ at: Date.now(), value }` for every emitted value to `watches[name]`. Call its installer once from `AppShell` after mount, through a function the testing folder exports. Confirm the normal build has no trace of it (T024 runs the branding scan). Run T022 against a fresh test-hooks build and confirm it passes on all six projects.
- [x] T024 [US1] Verify US1: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build`, then `pnpm exec playwright test tests/e2e/persistence.spec.ts` (all six projects), then `pnpm build` and `pnpm scan:branding`. Record the results.

**Checkpoint**: US1 is complete and independently verifiable (quickstart V1, V6, V7). The store works on both backends; nothing yet decides when memory is used.

---

## Phase 4: User Story 2 — the app keeps working when the device cannot save (P1)

**Goal**: If the device store cannot be opened, or is lost mid-session, the app keeps working in memory for the session, shows the persistent banner with the D-002-6 text on every page, and never blocks the first paint (FR-016 to FR-019; SC-003, SC-007, SC-008).

**Independent Test**: quickstart V8, V10, V11. With `indexedDB` removed, the shell and every destination work and the banner shows (functional), and separately its in-page insertion time is below 1000 ms (performance, SC-003); with `indexedDB.open` delayed forever, the shell renders and is usable; axe is clean with the banner shown.

### Tests for User Story 2 (write first; they must fail)

- [x] T025 [P] [US2] Create `tests/component/StorageBanner.test.tsx` (oracles B-T1 to B-T3): for each of the four notices, render `StorageBanner` with `useStorageStatusStore.setState({ phase, notice })` and assert the exact text of [contracts/storage-status.md §2](contracts/storage-status.md#2-banner-text-fixed-copy) in an element with `role="status"`; assert no focusable descendants (`a, button, input, select, textarea, [tabindex]`) and no `tabindex`; assert nothing is rendered for `phase: 'opening'` or `'ready'` with `notice: null`; assert the classes include `bg-surface`, `border-divider` and `text-text` and no raw colour. It fails until T028 and T032.
- [x] T026 [P] [US2] Create `tests/integration/storage-lifecycle.test.ts` (the US2 part; T037 adds the US3 cases). Each test builds fresh instances: `MemoryStorage` or `DexieStorage` (unique database name), `ResilientStorage`, `createStorageStatusStore()` and `createStorageLifecycle({ lifecycle, status })`, with the fakes, and reads the status from that store:
  - open failure, with `indexedDB` made unavailable (`vi.stubGlobal('indexedDB', undefined)`): `startStorage` resolves, phase `unavailable`, notice `unavailable`, and the facade works in memory;
  - mid-session loss: after `ready`, an operation failing with an `UNAVAILABLE` error swaps the facade to memory, emits `lost` (status `{ unavailable, unavailable }`), and the call is retried and succeeds against memory; a second `UNAVAILABLE` failure afterwards does not switch again and earlier memory writes are still listed; an existing `watchList` subscription receives the memory backend's (empty) value;
  - `QUOTA_EXCEEDED` is reported to the caller as a `StorageError` with no swap and no partial data (the spec's "storage full" edge case);
  - a programming error (`ConstraintError`) is rethrown unchanged and does not swap;
  - `start()` called twice on one lifecycle instance (StrictMode) opens once;
  - `start()` never throws.
  They fail until T029 and T030.
- [x] T027 [US2] Add the US2 cases to `tests/e2e/persistence.spec.ts`; they fail until T032 and T033:
  - **B-T4:** an init script removes `window.indexedDB` (`Object.defineProperty(window, 'indexedDB', { value: undefined })`); every destination (`/`, `/explore`, `/library`, `/settings`) opens, the banner "Storage is unavailable: your changes won't be saved." is visible on each, and no `pageerror` fires (**functional**, waited for up to 10 s only to stop a hung test). **Performance (SC-003, separate assertion):** the same init script installs a `MutationObserver` at document creation that records `performance.now()` (measured from the page's time origin, that is, navigation start) when the banner element is first inserted; on the first load of each destination that value is below 1000 ms. It is a wall-clock measurement and is reported with its value.
  - **B-T6:** an init script wraps `indexedDB.open` so the request never completes; the shell, navigation and page content render and are usable, and no banner appears (SC-007, edge case "Store opens slowly").
  - **B-T7:** with the banner shown, axe reports 0 serious or critical issues on `/`, `/explore`, `/library`, `/settings`, `/library/liked`, `/settings/x1` and `/radio` (SC-008); keyboard Tab never lands in the banner; at 320 px there is no horizontal scroll.
  - **Reload loses session data:** with the store unavailable, add a like through the hook, reload (still unavailable), and the like is gone while the banner is shown again (Story 2, scenario 3).

### Implementation for User Story 2

- [x] T028 [US2] Create `src/application/stores/storage-status.ts`: a factory `createStorageStatusStore()` (Zustand `create`, the 001 `createSettingsStore` pattern) and the app singleton `useStorageStatusStore = createStorageStatusStore()`, holding `{ phase: 'opening' | 'ready' | 'unavailable'; notice: 'unavailable' | 'newer-version' | 'blocked-upgrade' | 'stale-tab' | null }` per [contracts/storage-status.md §1](contracts/storage-status.md#1-status-store-srcapplicationstoresstorage-statusts-zustand), initial `{ phase: 'opening', notice: null }`, with a `set(next)` action. All four notice values are declared here even though US3 sets two of them.
- [x] T029 [US2] Create `src/infrastructure/persistence/resilient-storage.ts`: `ResilientStorage implements Storage, StorageLifecycle`, delegating every repository and `unitOfWork` call to its current backend. It takes `primary`, a `fallback` factory (`() => new MemoryStorage(...)`) and the `DiagnosticsLog`. `start()` opens the primary and returns a `StartResult`; on an availability failure it switches to the fallback and returns `{ outcome: 'unavailable', cause: 'unavailable' }`. When an operation fails and `toStorageError` returns `UNAVAILABLE`, it swaps to a fresh fallback, emits `{ type: 'lost' }` through `onEvent`, records a `storage-error` diagnostics entry, and retries the operation on the fallback. It swaps **at most once per session**: once in memory, later `UNAVAILABLE` failures are retried on the same memory backend and emit nothing. It never writes the status store. `QUOTA_EXCEEDED` and `VERSION_CONFLICT` and programming errors do not swap. Existing `watch*` subscriptions are re-attached to the new backend. Run the T026 cases that cover the facade.
- [x] T030 [US2] Create `src/application/storage-lifecycle.ts`: `createStorageLifecycle({ lifecycle, status })` returning `{ start(): Promise<void> }`, idempotent **per instance** (the promise is held by the instance, not the module), never throws. `start` calls `lifecycle.start()` (the store is opened only through the port, never through Dexie), subscribes to `lifecycle.onEvent`, and maps results and events with the table in [contracts/storage-ports.md §5](contracts/storage-ports.md#5-use-case), the only place that mapping exists. Also export the app singleton `startStorage`, built lazily from `container.storageLifecycle` and `useStorageStatusStore`. Run the T026 cases.
- [x] T031 [US2] Edit `src/application/container.ts`: the `storage` member becomes a single `ResilientStorage` wrapping the `DexieStorage` of T021, and a new `storageLifecycle` member returns the same object. It stays the same object for the whole session ([contracts/storage-ports.md §4](contracts/storage-ports.md#4-the-storage-facade)). `configureContainer` can still override it in tests. Run `pnpm typecheck`, `pnpm lint` and the integration tests.
- [x] T032 [US2] Create `src/presentation/components/shell/StorageBanner.tsx` to [contracts/storage-status.md §2–§3](contracts/storage-status.md#2-banner-text-fixed-copy): the four texts as module constants; an `Info` icon from `lucide-react` with `aria-hidden`; `role="status"`; no tabindex or focusable content; classes `rounded-md border border-divider bg-surface px-4 py-3 text-body text-text`, wrapping text; renders `null` unless `notice !== null`. Edit `src/presentation/components/shell/AppShell.tsx`: render `<StorageBanner />` as the first child of the content `div` inside `<main>`, before `{children}`, and call `startStorage()` once from an effect after mount (through `@/application/storage-lifecycle`). Run T025.
- [x] T033 [US2] Edit `src/presentation/testing/storage-hooks.ts`: also expose `status` (a getter over `useStorageStatusStore`) and `showNotice(notice)` (sets the store, for the G11 screenshots of the two notices that E2E cannot produce, T045). Build with the test hooks and run T027; B-T4, B-T6, B-T7 and the reload case must pass on all six projects.
- [x] T034 [US2] Verify US2: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build`, `pnpm exec playwright test tests/e2e/persistence.spec.ts tests/e2e/a11y.spec.ts tests/e2e/states.spec.ts`, then `pnpm build` and `pnpm scan:branding`. Record the results.

**Checkpoint**: US1 and US2 are complete. The app starts without waiting for the store and survives its absence.

---

## Phase 5: User Story 3 — app updates never lose saved data (P2)

**Goal**: Data written by an earlier version is carried over; destructive upgrades cannot ship before export exists; an older tab stops writing and a blocked upgrade tells the listener what to do; data from a newer version is never modified (FR-020 to FR-023).

**Independent Test**: quickstart V4, V5, V9. A v1 fixture opens under a test-only v2 and keeps every record; a destructive entry fails the guard; `blocked`, `versionchange` and a newer pre-existing database behave as the contract says.

### Tests for User Story 3 (write first; they must fail)

- [x] T035 [P] [US3] Create `tests/unit/migrations-registry.test.ts`: `findDestructive(migrations)` returns the entries with `destructive: true`; with the real `MIGRATIONS` registry it returns none (FR-021); with a synthetic registry containing `{ version: 2, destructive: true, upgrade }` it returns that entry, proving the guard can fail; `MIGRATIONS` versions are strictly increasing and start at 2. It fails until T039.
- [x] T036 [P] [US3] Create `tests/integration/migrations.test.ts` (quickstart V4): write a fixture through `DexieStorage` at version 1 (one record of every kind); close it; reopen the same database name through a **test-only** subclass that declares version 2 (one added index and an `upgrade()` that adds a field to every playlist without removing anything); assert every record from the fixture is still readable, the added field is present, and unknown fields survived. This proves the harness for later versions; there are no earlier-version fixtures yet because version 1 is the first. It fails until T040.
- [x] T037 [US3] Add the US3 cases to `tests/integration/storage-lifecycle.test.ts` (oracle B-T8; they fail until T040 and T041):
  - **blocked:** with one connection holding version 1 open and refusing to close, opening a version-2 connection sets notice `blocked-upgrade` with phase still `opening`; closing the first connection lets the open finish, phase `ready`, notice cleared;
  - **versionchange (older tab):** a connection at version 1 receives `versionchange` from a version-2 open, closes itself, the lifecycle sets `{ phase: 'unavailable', notice: 'stale-tab' }`, and a later write goes to memory only and is not in the database;
  - **deleted elsewhere:** a second connection calls `Dexie.delete(<name>)`; the first connection closes, the status is `{ unavailable, unavailable }` (not `stale-tab`), and later writes go to memory;
  - **in-flight race:** an operation already in flight when the upgrade elsewhere occurs fails with `DatabaseClosedError`; the notice stays `stale-tab`, there is no second switch, and a like added in memory before that failure is still listed;
  - **newer data (FR-023):** a database pre-created at a higher version with one row: `startStorage` sets `{ phase: 'unavailable', notice: 'newer-version' }`, the facade works in memory, and reading the raw database afterwards shows the original version and the original row unchanged.
- [x] T038 [US3] Add the newer-data case to `tests/e2e/persistence.spec.ts` (B-T5, V9; it must fail until T041): an init script creates `mp-library` at a higher version (raw IndexedDB `open('mp-library', 99)` with one object store `likes` holding a row) before the app loads; the page shows both sentences of the `newer-version` notice; after the test, reopening the raw database reports version 99 and the row unchanged; with the store in memory the like added through the hook does not reach it (FR-023). Six projects.

### Implementation for User Story 3

- [x] T039 [US3] Create `src/infrastructure/persistence/migrations.ts`: `type Migration = { version: number; destructive: boolean; upgrade: (tx) => Promise<void> | void }`, `export const MIGRATIONS: readonly Migration[] = []` (empty after version 1), and `findDestructive(migrations)`. Run T035 and confirm it passes.
- [x] T040 [US3] Edit `src/infrastructure/persistence/database.ts`: after `version(1)`, declare each registry entry as the next `version(n)` with its `upgrade`; add `versionchange` and `blocked` handlers that report to `ResilientStorage` only (inside infrastructure): `blocked`; `versionchange` with `newVersion` greater than the current version → upgraded elsewhere; `versionchange` with `newVersion === null` → deleted elsewhere. The `versionchange` handler closes the connection. `ResilientStorage` re-emits these as `StorageEvent`s (`blocked`, `upgraded-elsewhere`, `deleted-elsewhere`) after switching to memory for the last two. Map a Dexie `VersionError` at open to `StorageError('VERSION_CONFLICT', reason 'newer-version')` through `toStorageError` (already covered by T013). Read the installed Dexie 4.4.7 typings for the exact event signatures. Run T036.
- [x] T041 [US3] Edit `src/infrastructure/persistence/resilient-storage.ts` (switch to memory on `upgraded-elsewhere` and `deleted-elsewhere`, at most once; on `VERSION_CONFLICT` with reason `newer-version` at open, return `{ outcome: 'unavailable', cause: 'newer-version' }` without writing to the database) and `src/application/storage-lifecycle.ts` (map with the contract table: `blocked` → `{ opening, blocked-upgrade }`, cleared when `start` resolves `ready`; `upgraded-elsewhere` → `{ unavailable, stale-tab }`; `deleted-elsewhere` and `lost` → `{ unavailable, unavailable }`; `newer-version` → `{ unavailable, newer-version }`; once `phase` is `unavailable`, ignore further events for the notice, first notice wins). Run T037, then rebuild with the test hooks and run T038 on all six projects.
- [x] T042 [US3] Verify US3: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build`, `pnpm exec playwright test tests/e2e/persistence.spec.ts`, then `pnpm build` and `pnpm scan:branding`. Record the results.

**Checkpoint**: All three stories are complete.

---

## Phase 6: Polish & cross-cutting (docs, gates, review)

**Purpose**: Keep the docs true (constitution XV) and run the gates. Results are reported exactly as they ran.

- [x] T043 [P] Apply the remaining plan amendments (the §2 part was done in T004): `docs/architecture.md` §4 (folder `infrastructure/persistence/`, plus `application/storage-lifecycle.ts` and `stores/storage-status.ts`), §7 (add `useStorageStatusStore`; the library-data row reads "read through repository `watch` ports (Dexie `liveQuery`, or memory in fallback)"), §11 (the storage-unavailable paragraph points to the four notices and carries the error-mapping table of R7), §12 (table names and indexes as in data-model §3, the derived `tracks` columns, which tables are defined only, and the migrations registry rule), ADR-004 amended per plan amendment 4, new ADR-012 per amendment 5; `docs/ux-specification.md` §7 (the `blocked-upgrade` and `stale-tab` texts beside the D-002-6 texts); `docs/testing/test-plan.md` §3.6 (the shared contract suite on both backends, the `integration` Vitest project, the E2E mechanics of R10); `specs/README.md` row 002.
- [x] T044 Run the full gate set on the final tree and record each command, its result and every failure, compared with the T001 baseline: `pnpm typecheck`, `pnpm lint`, `pnpm test:coverage` (`domain/` ≥ 90% line and branch), `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build`, `pnpm test:e2e` (all six projects, wait for it to finish), then `pnpm build` and `pnpm scan:branding`. A test that did not run is **not run**. Do not edit sources or run a build while the E2E is running.
- [x] T045 G11 review material: against the test-hooks build (`NEXT_PUBLIC_TEST_HOOKS=1 pnpm build`; the hook is needed for two of the notices), capture screenshots of the banner in `specs/002-local-persistence/review/` at 320, 375, 768, 1024 and 1440 px for each of the four notices, with the real failure paths where E2E can produce them (`unavailable`: `indexedDB` removed; `newer-version`: pre-created higher version) and `window.__STORAGE__.showNotice(...)` for `blocked-upgrade` and `stale-tab`, on `/` and `/settings`. Use a throwaway spec that is deleted afterwards. List the files in this task's note and state which notices came from a real failure and which from the hook. Request the owner's G11 sign-off.
- [x] T046 Run `/code-review` on the 002 diff and record the findings and their dispositions in this file. Fix confirmed defects within 002 scope; propose anything else in writing (rule 9). Check each finding against the code before acting.
- [x] T047 At owner acceptance (G13) only, add the `### 002-local-persistence` gate-status section and its G13 acceptance record to `docs/quality-gates.md`, in the format used for 001 and 014: gate table with evidence, exceptions and deviations accepted, deferred items (none new unless the owner defers one), open obligations (CI, 001's screen-reader pass, the 014 real high-contrast check), and follow-ups. Then mark 002 accepted in `specs/README.md`. Do not commit unless the owner asks.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001–T006)**: T001 first, and its E2E run must finish before T002 installs anything. T003 and T004 follow T002. T005 follows T002. T006 follows T002.
- **Foundational (T007–T015)**: after Setup. **Blocks every story.** T013 needs T009; T014 needs T008; T010 needs T008 and T009; T015 needs T005.
- **US1 (T016–T024)**: after Foundational. T016 before T017 and T018; T019 and T020 after their tests; T021 after T020; T022 before T023.
- **US2 (T025–T034)**: after US1 (it reuses `MemoryStorage`, `DexieStorage` and the container). T029 needs T019 and T020; T031 needs T029 and T030; T032 needs T028.
- **US3 (T035–T042)**: after US2 (it extends the resilience facade, lifecycle and status).
- **Polish (T043–T047)**: after every story. T047 waits for the owner's G13 decision.

### Within each story

- Tests first (they fail), then the implementation, then the verification task.
- Ports before implementations; the contract suite before either backend.

### Parallel opportunities

- T003 and T004 (different files, after T002).
- T007, T008 and T009 (different files); T011 and T012.
- US1: T017 and T018 once T016 exists.
- US2: T025 and T026.
- US3: T035 and T036.
- Polish: T043 runs alongside T044 only while T044 is not building or running E2E (docs edits do not affect a running E2E).

## Parallel Example: Foundational domain

```text
Task T007: src/domain/ids.ts + tests/unit/ids.test.ts
Task T008: src/domain/models.ts
Task T009: src/domain/errors.ts + tests/unit/storage-error.test.ts
# Then T010 (ports), then T011 + T012 in parallel, then T013, T014, T015
```

## Implementation Strategy

1. **Setup and foundation.** Phases 1–2 record a baseline, add the three dependencies with their licence review, and put the domain types, ports, schema and pure infrastructure in place, test-first.
2. **MVP = US1 + US2.** Both are P1. US1 gives a store that keeps data exactly as saved on both backends. US2 makes the app start without waiting for it, survive its absence, and say so. Stop and validate at each checkpoint.
3. **US3 (P2).** Safe upgrades, the stale-tab and blocked-upgrade notices, and untouched newer data.
4. **Polish.** Docs, then the full gates, the G11 banner screenshots, `/code-review`, and the G13 records.

**Task count**: 47 tasks.
- Setup: 6
- Foundational: 9
- US1: 9
- US2: 10
- US3: 8
- Polish: 5

---

## Implementation notes (2026-11-07)

Results are reported exactly as they ran. Nothing here is committed.

**T001 baseline** (branch `002-local-persistence`, docs-only difference from `main`): `pnpm typecheck` exit 0; `pnpm lint` exit 0; `pnpm test` 16 files, 210 tests passed; `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` exit 0; `pnpm test:e2e` **566 passed, 166 skipped, 0 failed** (4.7 min); normal `pnpm build` exit 0; `pnpm scan:branding` OK (157 source files, 348 compiled files). Identical to 014's final state.

**T002**: `dexie` 4.4.7 (Apache-2.0, ships a `NOTICE` file), `zod` 4.6.7 (MIT) and dev-only `fake-indexeddb` 6.2.7 (Apache-2.0), pinned exactly. Each licence was read from the installed `LICENSE` file and matches the plan. **T003**: the two runtime packages are in `THIRD_PARTY_NOTICES.md`, with Dexie's `NOTICE` reproduced. **T004**: architecture §2 amended.

**T005**: before the config change the new environment test was not picked up (16 files, 210 tests); after adding the `integration` project, 17 files, 211 tests pass. **T006**: the four new rejection cases failed on the old config (15 of 19 passing), then passed after the `eslint.config.mjs` change (19 of 19); infrastructure may still import Dexie and zod.

**T007, T009, T011, T013, T014, T015** were written test first and failed on the missing modules (T015 first failed on the missing module, then on one wrong expectation of mine: Dexie reports an auto-increment key as `++id`).

**T013, one design change found while writing it.** Dexie may wrap the browser's `VersionError` in an `OpenFailedError`. With "outer error wins", newer data would have been reported as plain `UNAVAILABLE` (the wrong banner). `toStorageError` now lets the more specific kind win anywhere in the wrapper chain (`VersionError`, then `QuotaExceededError`, then the generic unavailable names). This refinement was made in one step with its test, so there is no separate fail-first run for it. Whether the real Dexie wraps this way is confirmed in T037.

**T014, one defect caught.** The first version of the schema-to-type tie was not enforced (a tuple containing `never` still compiles). Enforcing it showed that all seven ties failed on the real code, because `looseObject` adds an index signature and interfaces such as `Track` are not assignable to index signatures. The tie now compares only the known keys, recursively, through a `schemaTies` constant that compiles only while every domain type is accepted. Checked by two deliberate drifts (`Like.likedAt` as a string: 1 error; `Track.title` and `Album.title` as numbers: 2 errors), both reverted.

**Doc correction**: data-model §3 declares **twelve** tables, not eleven; plan and T015 wording fixed.

**Gates after the foundation**: `pnpm typecheck` and `pnpm lint` exit 0; `pnpm test` 23 files, 283 tests passed; `pnpm test:coverage` `domain/` 100% lines, 96.29% branches (threshold 90%). E2E not re-run yet (nothing user-visible changed).

**US1 (T016–T024).**
- **Test-first:** the shared contract suite and both backend files failed on the missing modules; `MemoryStorage` then passed all 19 contract cases, and `DexieStorage` passed those plus its 5 Dexie-only cases (invalid rows skipped and logged once each, unknown fields kept on every kind of rewrite, derived `tracks` columns set and stripped, `addedAt` kept for tracks, albums and artists, and a real IndexedDB failure rolling back the whole unit). `persistence.spec.ts` failed first against the build with no hook (10 s timeouts on `window.__STORAGE__`).
- **Result:** `persistence.spec.ts` on all six projects: 30 passed (5 tests × 6). That covers reload, restart through `storageState({ indexedDB: true })`, a restart with catalog-like requests blocked and then the network cut, and two-tab delivery (functional and, separately, the 1 s measurement with in-browser stamps; the measured value is attached to each run as a `measured-ms` annotation in the Playwright report).
- **Test definition corrected:** my first version of the "catalog" check counted Next's own same-origin route prefetches (`?_rsc=`) as catalog requests and failed on every project. They are the app's routing, so the check now ignores them and says so.
- **Typecheck workarounds, all documented in code:** Dexie's `transaction()` generics exceed TypeScript's depth limit (TS2589) against our own generics, so every transaction goes through one narrow private helper; loose zod objects add an index signature, so the schema-to-type tie compares known keys recursively.
- **Known limitation, deliberate, documented in `memory-storage.ts`:** a unit of work in the in-memory fallback is rolled back by restoring a snapshot, so a write from another call site that happens while the unit is in flight is rolled back with it. The fallback has one user and units are short.
- **Gates after US1:** `pnpm typecheck` and `pnpm lint` exit 0; `pnpm test` 25 files, 327 tests passed; normal `pnpm build` exit 0 and `pnpm scan:branding` OK (170 source files, 348 compiled files: the test hook is absent from the normal build). The full E2E suite has not been re-run since the baseline (T044).

**US2 (T025–T034).**
- **Test-first:** the banner test and the lifecycle tests failed on the missing modules; the E2E cases were written before the banner and the hook existed.
- **Result:** unit and component tests: 27 files, 347 passed (lifecycle: 10 cases covering open failure, any failure to open, StrictMode double start, mid-session loss with retry on memory, re-attached subscriptions, switch at most once, QUOTA_EXCEEDED and programming errors not switching). `persistence.spec.ts` on all six projects: 66 passed (11 tests × 6). `a11y.spec.ts` and `states.spec.ts` ran in the same pass.
- **Two test-technique findings, both fixed in the tests:**
  - WebKit still exposes `webkitIndexedDB`, which Dexie falls back to, so removing only `indexedDB` left the store working there (the banner never appeared). The "storage blocked" init script now removes all four names (a probe showed the prefixed name on WebKit only).
  - One run of the three specs failed once on WebKit desktop: a `pageerror` "Fetch API cannot load …/settings?_rsc=… due to access control checks", raised when the test's navigation cancelled one of Next's own route prefetches (1 failure in 15 repeats). The check for application errors now ignores only that signature, documented in the test. After the change: 50 of 50 on both WebKit projects. The three specs were not re-run together after this change; the full E2E in T044 covers it.
- **Measured budgets** (one run per project, wall-clock, in-page stamps; reported as measurements, not as proof, and not fully deterministic): two-tab delivery (SC-006) 4–21 ms across the six projects; banner insertion from navigation start (SC-003) 46–142 ms on Chromium, 271–395 ms on Firefox, 82–445 ms on WebKit, the first load in each browser being the slowest (Firefox 395 ms, WebKit 445 ms). All under 1000 ms, with the least margin on a first cold load.
- **Residual risk for the manual screen-reader pass (deferred, 001):** the banner is inserted into the page already carrying `role="status"` and its text, as the approved contract specifies (nothing is rendered until a notice exists). Some screen readers announce a live region more reliably when the region exists before its text changes. Automated tests cannot hear this; it belongs in the deferred pass.
- **Gates after US2:** `pnpm typecheck` and `pnpm lint` exit 0; `pnpm test` 27 files, 347 tests passed; normal `pnpm build` exit 0; `pnpm scan:branding` OK (174 source files, 348 compiled files) and no reference to the hook in the normal client build.

**US3 (T035–T042).**
- **Test-first:** the registry test failed on the missing module; the migration harness failed meaningfully (the injected version 2 registry was ignored, so the database stayed at version 1); the five new lifecycle cases failed before the event handling existed.
- **T036, one improvement on the task text:** instead of a test-only subclass declaring version 2, `MpDatabase` takes the registry as a second constructor parameter (defaulting to the real, empty one), and the test injects a synthetic version 2. That exercises the same code path that applies the real registry.
- **Result:** integration tests: 77 passed (6 files). Real Dexie under `fake-indexeddb` confirmed: a blocked upgrade shows `blocked-upgrade` and clears once the other connection closes; an upgrade from another tab closes this one, shows `stale-tab`, and later writes stay in memory (the newer connection does not see them); a deletion elsewhere shows the plain `unavailable` notice. The in-flight race (a call held on the primary while another tab upgrades) keeps the first notice, does not switch twice (one `storage-error` entry, no `lost` event) and keeps the memory write.
- **Important finding, and a correction to my own research (R7, R8, data-model §6 updated):** the newer-data test failed: `start()` reported `ready`. A probe showed that **Dexie 4 does not raise `VersionError`** for a database newer than the declared version. It opens it and upgrades it again (IndexedDB version 50 became 51, adding the missing tables), which modifies exactly the data FR-023 says must not be touched. Waiting for an error could never have worked. `DexieStorage.open()` now reads the stored version first with `indexedDB.databases()` (which opens and creates nothing) and reports `VERSION_CONFLICT` with reason `newer-version` when it is higher than the declared version times ten, before Dexie sees the database. A real `VersionError` is still mapped the same way. Browsers without `indexedDB.databases()` are outside the supported set (D4) and skip the check.
- **E2E (B-T5):** `persistence.spec.ts` on all six projects, a database pre-created at version 99 from a same-origin page that runs no app code: both notice sentences show, the app works in memory, and the stored database afterwards has version 99, only the original `likes` store (no table was added) and only the original row. This E2E case was written after the implementation, so it has no failing-first run of its own; the same behaviour failed first at the integration level (the T037 newer-data case).
- **Gates after US3:** `pnpm typecheck` and `pnpm lint` exit 0; `pnpm test` 29 files, 359 tests passed; `persistence.spec.ts` 72 passed on six projects (12 tests × 6); normal `pnpm build` exit 0; `pnpm scan:branding` OK (175 source files, 348 compiled files).

**T043.** Applied to `docs/architecture.md` §4, §7, §11 (the four notices and the error-mapping table), §12 (schema v1 as built, the migrations registry rule, newer data never touched), ADR-004 (amended) and the new ADR-012; `docs/ux-specification.md` §7 (the two additional notice texts); `docs/testing/test-plan.md` §3.6; `specs/README.md` row 002. The §2 part was done in T004.

**T044 gates** (final tree, compared with the T001 baseline):

| Gate | Command | Result |
|---|---|---|
| G5 | `pnpm typecheck` | exit 0 |
| G6 | `pnpm lint` | exit 0, including the extended layer tests (19 cases) |
| G7/G8 | `pnpm test:coverage` | 29 files, 359 tests passed (baseline 16 files, 210 tests); `domain/` 100% lines, 96.29% branches (threshold 90%) |
| Build | `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` | exit 0 |
| G9/G10 | `pnpm test:e2e`, six projects, `workers: 2` | **638 passed, 166 skipped, 0 failed** (804 tests, 6.2 min; baseline 566 passed, 166 skipped, 0 failed). The 72 new passes are `persistence.spec.ts` (12 tests × 6). The skips are unchanged by-design skips |
| Branding | normal `pnpm build`, then `pnpm scan:branding` | build exit 0; scan OK (175 source files, 348 compiled files; the test hook is absent from the normal build) |

001's G9 residual risks (gaps 3, 5 and 6, rare WebKit and load-related flakes) are unchanged and not closed by this run; no flake occurred in the final run. The WebKit `_rsc` prefetch `pageerror` seen once during US2 is filtered in the one test that collects page errors, as documented above.

**T045 G11 review material (first capture, superseded by the re-capture of 2026-11-08 below).** 40 screenshots in `specs/002-local-persistence/review/`: the banner on `/` (home) and `/settings` at 320, 375, 768, 1024 and 1440 px for each of the four notices, named `<notice>-<page>-<width>.png`. Chromium only, against the test-hooks build, by a throwaway spec that was deleted afterwards.
- **From a real failure (no hook):** `unavailable` (IndexedDB and its prefixed names removed) and `newer-version` (`mp-library` pre-created at version 99 from a same-origin page).
- **Through the test hook `showNotice`, after the store had finished opening:** `blocked-upgrade` and `stale-tab`, which cannot occur for real in E2E while only version 1 exists.
- **A race in my first screenshot script, fixed:** it showed a hook notice before `startStorage()` finished, and the lifecycle's late "ready" cleared it (the script hung on `/settings`). The script now waits for `status().phase === 'ready'` first. This was a script race; the app behaviour is as designed (a late "ready" legitimately clears a notice that was only set by the test hook).
- **Looked at by me:** the longest text at 320 px (`newer-version`) and a wide layout (`blocked-upgrade`, 1024 px): the banner is in flow at the top of the content column, wraps without horizontal scroll, and covers neither the navigation nor the player dock.
- **Not covered:** other browsers, real devices, and the owner's visual review. The owner's G11 sign-off is pending.

**T046 `/code-review`** (reviewer `@code-review`, 2026-11-07; ten findings, each checked against the code by hand). Seven were fixed with tests written first (nine new or changed tests failed before the fix), two were left as designed, one was not changed for lack of evidence.

| # | Finding | Disposition |
|---|---|---|
| 1 | Repository calls made before `open()` finishes reach Dexie's auto-open, which skips the newer-data guard | **Valid and serious; fixed.** React runs child effects before the shell's, so a future consumer could touch storage first and trigger exactly the upgrade FR-023 forbids. `ResilientStorage` now opens the primary lazily on first use through one shared promise that every call and subscription waits for, and `MpDatabase` disables Dexie's auto-open (`autoOpen: false`). Test: an early call against a pre-created newer database works in memory, leaves the IndexedDB version unchanged, and `start()` afterwards reports `newer-version`. It failed before the fix. |
| 2 | A transient write failure switches the whole session to memory and hides the existing library | **As designed, no change.** FR-016, research R7 and the banner text ("your changes won't be saved") describe this; data on the device is not copied into memory by design. The claim that a later write overwrites a playlist still on disk is wrong: memory writes never reach disk. A retry-before-switch policy would be new scope. |
| 3, 4 | A watcher can leak a subscription, or receive a stale error, around a switch | **Valid in theory; fixed.** Each attach is a new generation and a subscription from an older generation is ignored (values and errors); a subscription that failed while being made cannot overwrite its replacement. Tests: a primary whose watch fails synchronously while subscribing, and subscriptions made before the store opens (delivered once it has, or cancelled before). **A bug in my first version of this fix was caught by that test:** a watcher failing while it was being attached had no `detach` yet, so the guard skipped re-attaching it to memory. An explicit `attached` flag fixed it. |
| 5 | A unit of work's callback runs again if the store becomes unavailable mid-unit | **Real documentation gap; fixed in the contract.** The `StorageUnitOfWork` comment and contracts/storage-ports.md §3 now say `fn` may run twice and must have no effect other than its repository calls and be safe to repeat. No behaviour change. |
| 6 | The banner's `role="status"` is inserted already filled, which many screen readers do not announce | **Valid (it was my own noted risk); fixed, with a deviation from the approved contract.** The live region is now always present and empty, and the visible box appears inside it. Oracle B-T3 changed from "nothing is rendered" to "the region exists and is empty"; contracts/storage-status.md §3 and §4 and research R11 are updated. It still needs a real screen-reader pass (deferred, 001). **Knock-on:** two assertions in `states.spec.ts` (001's skeleton checks) had assumed no other status region exists; they are scoped to the skeleton's own "Loading" region, behaviour unchanged. |
| 7 | In-memory rollback does not tell late subscribers; concurrent units are rolled back together | **Partly valid; the watcher part fixed.** After a rollback every watcher is told the restored state (a subscriber that joined while the unit was in flight had read uncommitted values). Test in the shared contract suite, failing before on the in-memory backend. The concurrent-unit limitation stays, documented in `memory-storage.ts`. |
| 8 | The two backends differ for rows with equal timestamps (no tiebreaker) | **Valid; fixed.** Shared comparators in `ordering.ts`, used by both backends: times descending, ties by key ascending. Test with equal timestamps inserted in reverse order, in the shared suite, failing before on the in-memory backend. The other differences (original `addedAt`, unknown fields) are not observable through the ports, because the in-memory store has no foreign writers. |
| 9 | The "already reported" set grows without bound | **Valid, minor; fixed.** Capped at 1000 entries, after which it starts over. |
| 10 | The unavailable-error allow-list omits `AbortError`, `TransactionInactiveError`, `NotFoundError` | **Not changed.** `TransactionInactiveError` is normally a bug (awaiting something that is not a database call inside a transaction), and broadening the list without evidence from real browsers risks hiding programming errors behind the "unavailable" fallback. Proposed follow-up: widen the list when a real failure is observed. |

**Gates re-run on the final tree, after the review fixes** (supersedes the T044 figures where they differ):

| Gate | Command | Result |
|---|---|---|
| G5 / G6 | `pnpm typecheck`, `pnpm lint` | exit 0 |
| G7/G8 | `pnpm test:coverage` | 29 files, **367** tests passed; `domain/` 100% lines, 96.29% branches |
| Build | `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` | exit 0 |
| G9/G10 | `pnpm test:e2e`, six projects | **638 passed, 166 skipped, 0 failed** (7.3 min) |
| Branding | normal `pnpm build`, `pnpm scan:branding` | build exit 0; scan OK (176 source files, 348 compiled files) |

**T045 re-captured on the final tree, 2026-11-08 (after the live-region fix, finding 6).** All 40 files in `specs/002-local-persistence/review/` were replaced: `<notice>-<home|settings>-<320|375|768|1024|1440>.png`, Chromium desktop engine with the viewport resized per width, against `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build`, by a throwaway spec that was deleted afterwards (the earlier set is superseded, not kept).
- **Real failure scenarios (no hook):** `unavailable` (`indexedDB` and its prefixed names removed) and `newer-version` (`mp-library` pre-created at version 99 from a same-origin page).
- **Test-hook scenarios (`window.__STORAGE__.showNotice`, called after the store finished opening):** `blocked-upgrade` and `stale-tab`. They cannot occur for real in E2E while only version 1 exists, so these two show the banner's appearance, not a real blocked upgrade or stale tab (those paths are covered by the lifecycle tests, not by these images).
- **Checked by script at every one of the 40 shots:** the region has `role="status"`; its box lies inside the viewport; no other element covers it (hit-test at three points); no horizontal scroll; exactly one status region on the page. For the two hook notices the live region was also confirmed to exist and be empty before the notice was shown. All 40 passed. Banner heights: 48 px (wide) to 136 px (`newer-version`, 320 px).
- **Looked at by me:** `newer-version` home 320 (longest text, wraps in the box, above the content, tab bar visible), `unavailable` settings 375, `stale-tab` home 768 (rail), `blocked-upgrade` settings 1024 (sidebar and dock visible). No visual issue found. The banner is in flow at the top of the content column and covers neither the navigation nor the player dock.
- **Observation, not a defect:** the `newer-version` banner reads "Storage is unavailable: your changes won't be saved. Data from a newer version of the app was found and has been left untouched." (the neutral sentence plus the newer-data sentence), as defined in the contract.
- **Not covered:** Firefox and WebKit, real devices, a real screen reader, and the owner's visual review. The owner's G11 sign-off is still pending.

**Proposed follow-ups (not 002 scope):** widen the unavailable-error list when a real failure is observed (finding 10); the first view hook (`useSyncExternalStore` over a `Watchable`) with the first consuming feature; settings read/write with feature 010.
