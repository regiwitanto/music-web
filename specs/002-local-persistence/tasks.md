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

**Status**: **Approved by the owner, 2026-11-07 (Gate G4 passed).** All 47 tasks are in scope. Implementation has not started; it waits for the owner's approval to start implementation.

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

- [ ] T001 Run the baseline gates on the unchanged tree (branch `002-local-persistence`, which differs from `main` only by docs) and record the commands and results in the T001 note of this file. The runs are `pnpm typecheck`, `pnpm lint`, `pnpm test`, then `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` and the full `pnpm test:e2e` (wait for it to finish), then `pnpm build` and `pnpm scan:branding`. The expected baseline is 014's final state: 210 unit and component tests, E2E 566 passed, 0 failed, 166 skipped. Record any difference as baseline, not as a 002 regression. Change no files except `specs/002-local-persistence/tasks.md`.
- [ ] T002 After T001's E2E run has finished, run `pnpm add dexie@4.4.7 zod@4.6.7` and `pnpm add -D fake-indexeddb@6.2.7`, so `package.json` pins exact versions like the existing entries. Then verify each licence against the installed `LICENSE` file (research R12): `dexie` Apache-2.0, `zod` MIT, `fake-indexeddb` Apache-2.0. A mismatch stops the task and goes to the owner. Record the commands, the licences found, and whether `dexie` ships a `NOTICE` file. Do not add `dexie-react-hooks` (R3).
- [ ] T003 [P] Edit `THIRD_PARTY_NOTICES.md`: add the Apache-2.0 text for `dexie` (with its `NOTICE` content if the package has one) and the MIT text for `zod`, copied from the installed licence files, in the same style as the existing entries. `fake-indexeddb` is dev-only and needs no entry.
- [ ] T004 [P] Edit `docs/architecture.md` §2 (plan amendment 1): pin `dexie` 4.4.7 and mark `dexie-react-hooks` as "not adopted in 002 (R3); revisit if a view needs it"; extend `zod`'s "Why" to "validates backup import files, provider responses and stored records on read (SET-04, 002)"; add licence-review rows for `dexie` (Apache-2.0, bundled in the client) and `zod` (MIT, bundled in the client), following the existing rows' columns. Change nothing else in §2.
- [ ] T005 Add the Vitest `integration` project to `vitest.config.mts`: `name: 'integration'`, `environment: 'node'`, `include: ['tests/integration/**/*.test.ts']`, `setupFiles: ['fake-indexeddb/auto']`, `extends: true`, leaving the `node` and `dom` projects unchanged. Create `tests/integration/environment.test.ts` with one test that opens a throwaway `new Dexie('env-check')` with one table, writes and reads a row, and deletes the database, proving `fake-indexeddb` and Dexie work in this project. Run `pnpm test` and confirm that the new project runs and the existing 16 files still pass.
- [ ] T006 Extend the layer rules (plan phase 1; constitution VIII). Test first, in `tests/lint/layers.test.ts`, add cases that must fail before the config change: `src/presentation/fixture.tsx` importing `dexie` and importing `zod` are rejected with the restricted-imports rule; `src/application/fixture.ts` importing `zod` and `dexie` are rejected; `src/domain/fixture.ts` importing `zod` is rejected; `src/infrastructure/fixture.ts` importing `dexie` and `zod` is **not** rejected. Run them and confirm the new rejections fail. Then edit `eslint.config.mjs`: add `{ group: ["dexie", "dexie/*", "zod", "zod/*"], message: "Dexie and zod are infrastructure only." }` to `applicationPatterns` and `uiPatterns`, and add `"zod", "zod/*"` to the domain group. Run `pnpm test tests/lint` and `pnpm lint`; both must pass.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: The domain types, the application ports, the schema, and the pure infrastructure pieces that every story uses.

**⚠️ CRITICAL**: No user-story work begins until this phase is complete.

- [ ] T007 [P] Create `src/domain/ids.ts` (research R13): `type ProviderId = 'mock' | 'local' | 'sample' | (string & {})`, ``type EntityId = `${ProviderId}:${string}` `` and a pure `providerIdOf(id: EntityId): string` returning the part before the first `:`. Test first in `tests/unit/ids.test.ts`: `mock:trk_0042` → `mock`, `local:sha1-ab12` → `local`, `sample:night-drive` → `sample`, and an id containing more than one `:` (`mock:a:b`) → `mock`. Domain imports nothing.
- [ ] T008 [P] Create `src/domain/models.ts` with the types of [data-model §1](data-model.md#1-domain-entities-srcdomainmodelsts-srcdomainidsts), copied from architecture §5 with these constraints verbatim: `Track.durationMs: number | null` (null = unknown until loaded); `Track.artists: { id: EntityId; name: string }[]` (name kept so lists render without lookups); `Playlist.id: string` (local UUID), `kind: 'user' | 'system-liked'`, `items: PlaylistItem[]` ("ordered, ADR-005; the order is the playlist order and is stored exactly"), `createdAt`, `updatedAt` as epoch milliseconds; `PlaylistItem { uid: string; trackId: EntityId; addedAt: number }` ("the same track may appear more than once"); `Like { trackId: EntityId; likedAt: number }` ("one per track"); `LibraryItem { kind: 'album' | 'artist' | 'track'; entityId: EntityId; addedAt: number }` ("one per (kind, entityId)"); `RecentSearch { query: string; searchedAt: number }` ("one per query; no cap here"). Types only: no playback, queue or provider types. Verified by `pnpm typecheck`.
- [ ] T009 [P] Create `src/domain/errors.ts`: `class StorageError extends Error` with `kind: 'UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'VERSION_CONFLICT'`, `reason?: 'newer-version' | 'blocked' | 'closed-by-upgrade'` and `cause?: unknown` (data-model §2). Test first in `tests/unit/storage-error.test.ts`: it is an `Error` and a `StorageError`, carries its fields, `name` is `StorageError`, and `cause` is preserved.
- [ ] T010 Extend `src/application/ports.ts` with the types of [contracts/storage-ports.md §1–§4](contracts/storage-ports.md): `Watchable<T>`, `Clock`, `IdGenerator`, `LikesRepository`, `PlaylistsRepository`, `LibraryItemsRepository`, `SnapshotsRepository`, `RecentSearchesRepository`, `StorageUnitOfWork`, `Storage`, `DiagnosticsEntry` (`at`, `kind: 'invalid-row' | 'storage-error'`, `table`, `key: string | null`, `reason`), `DiagnosticsLog`, and the lifecycle types `StorageEvent` (`blocked`, `upgraded-elsewhere`, `deleted-elsewhere`, `lost`), `StartResult` and `StorageLifecycle` (`start(): Promise<StartResult>`, never throws; `onEvent(listener)` returning an unsubscribe function). Keep `ObsoleteDataCleaner` unchanged. Types only. Document in the `StorageUnitOfWork` comment: "inside `run`, await only repository calls". Verified by `pnpm typecheck`.
- [ ] T011 [P] Test first, `tests/unit/diagnostics-log.test.ts`: the log keeps entries in insertion order; `at` comes from the injected clock; when more than 200 entries are recorded the oldest are dropped and `entries()` has length 200; `entries()` returns a read-only snapshot. Then create `src/infrastructure/persistence/diagnostics-log.ts` (`RingDiagnosticsLog`, constructor takes a `Clock` and a capacity defaulting to 200; in memory only, research R6).
- [ ] T012 [P] Create `src/infrastructure/persistence/system.ts` (`SystemClock` using `Date.now()`, `CryptoIdGenerator` using `crypto.randomUUID()`) and the test fakes `src/test/fakes/FixedClock.ts` (settable `now`) and `src/test/fakes/SequentialIds.ts` (`id-1`, `id-2`, …). Verified by `pnpm typecheck` and by their use in T011.
- [ ] T013 Test first, `tests/unit/storage-errors.test.ts` (oracle P-T8): one case per row of the mapping table in [research R7](research.md#r7-opening-the-store-and-the-status-fr-016-fr-017-fr-019-sc-003-sc-007): `QuotaExceededError` → `QUOTA_EXCEEDED`; `VersionError` → `VERSION_CONFLICT` with reason `newer-version`; each of `OpenFailedError`, `DatabaseClosedError`, `SecurityError`, `InvalidStateError`, `UnknownError`, `MissingAPIError` → `UNAVAILABLE`; a Dexie error whose `inner` is one of these maps the same way; `ConstraintError`, `DataError` and a `TypeError` return `null` (a programming error, rethrown by the caller); `cause` carries the original error. Then create `src/infrastructure/persistence/errors.ts` exporting `toStorageError(error: unknown): StorageError | null`.
- [ ] T014 Test first, `tests/unit/row-schemas.test.ts`: for each stored table built in 002 (`tracks`, `albums`, `artists`, `libraryItems`, `likes`, `playlists`, `recentSearches`), a valid row parses; a row missing a required field fails and the issue names the field; a row with an extra field `futureField` parses and **keeps** the field (FR-015). Then create `src/infrastructure/persistence/schemas.ts`: one zod 4 schema per table with `z.looseObject`, tied to its domain type with `satisfies` so type and schema cannot drift (data-model §3 rows, including the derived `tracks` columns `artistIds`, `providerId`, `addedAt` and `addedAt` on `albums` and `artists`). If `satisfies` cannot hold because loose objects add an index signature, tie them with a type-level equality assertion in the file and note it in the T014 record.
- [ ] T015 Test first, `tests/integration/schema.test.ts` (oracle P-T7): open the database and assert that `db.tables` has exactly the eleven names of [data-model §3](data-model.md#3-stored-rows-database-mp-library-schema-version-1) and that each table's primary key and index list equals that table's declaration (`tracks`: `id` and indexes `album.id`, `*artistIds` (multi-entry), `addedAt`, `providerId`; `libraryItems`: `[kind+entityId]`, `kind`, `addedAt`; `playEvents`: auto-incrementing `id`, `trackId`, `startedAt`, `[trackId+startedAt]`; and so on for the rest). Then create `src/infrastructure/persistence/database.ts` exporting `MpDatabase extends Dexie` for database name `mp-library`, declaring `this.version(1).stores({...})` with exactly those strings (the first entry is the primary key; no `&` prefix, research R1). The test file lives in `tests/integration/`, not `tests/unit/`, because it needs `fake-indexeddb` (plan and quickstart V2 already name `tests/integration/schema.test.ts`).

**Checkpoint**: `pnpm typecheck`, `pnpm lint`, `pnpm test` pass; `domain/` coverage ≥ 90%.

---

## Phase 3: User Story 1 — saved library data survives reloads and restarts (P1) 🎯 MVP

**Goal**: Likes, playlists with their order, library items, track/album/artist snapshots and recent searches are stored exactly as saved, survive reloads and browser restarts, work offline, and are written all-or-nothing (FR-010 to FR-015).

**Independent Test**: quickstart V1, V6, V7. The contract suite passes on both backends; in E2E one record of every kind is seeded through the test hook, and is read back identically after a reload, after a new browser context from the same storage state, and in a second tab.

### Tests for User Story 1 (write first; they must fail)

- [ ] T016 [US1] Create `tests/integration/storage-contract.ts` (a helper, not a test file) exporting `defineStorageContract(label, make)`, where `make()` returns a fresh `Storage` plus its `DiagnosticsLog`. Cover oracles P-T1, P-T2, P-T3 and P-T6 for every repository method of [contracts/storage-ports.md §2](contracts/storage-ports.md#2-repositories-library-areas-only):
  - **Likes:** `add` replaces the like of the same track; `remove` of an absent track is a no-op; `list` is `likedAt` descending.
  - **Playlists:** `put` with items `[a, b, a]` reads back in exactly that order with three distinct `uid`s (P-T2); `list` is `updatedAt` descending; `get` of an absent id is `null`; `delete` of an absent id is a no-op.
  - **Library items:** `(kind, entityId)` is unique; `list(kind)` filters; `addedAt` descending.
  - **Snapshots:** `getTracks(ids)` returns found entries **in the order of `ids`** and leaves out missing ids.
  - **Recent searches:** `record` moves an existing query to the top; no cap (record 25 queries, list returns 25); `remove` and `clear`.
  - **Unit of work (P-T3):** a `run` that writes snapshots, then a playlist, then throws leaves 0 new rows in either table, and the thrown error propagates.
  - **Watch (P-T6):** `watchList` delivers the initial value, then values reflecting `add`, `remove` and a committed `run`, in that order; no delivered value ever reflects a rolled-back `run`. Assert the order of distinct values, not exact emission counts (Dexie `liveQuery` emits asynchronously and may repeat a value).
  - Use `FixedClock` and `SequentialIds`; no real time.
- [ ] T017 [P] [US1] Create `tests/integration/memory-storage.test.ts`: `defineStorageContract('MemoryStorage', …)` building a new `MemoryStorage`. Run it and confirm it **fails** (the module does not exist yet).
- [ ] T018 [P] [US1] Create `tests/integration/dexie-storage.test.ts`: `defineStorageContract('DexieStorage', …)` with a fresh database name per test (deleted afterwards), plus the Dexie-only cases:
  - **P-T4:** rows seeded raw into each built table with a schema violation (a like without `likedAt`, a playlist whose `items` is not an array, and so on) are skipped by `list`, the valid rows load, `get` of an invalid row is `null`, and one `invalid-row` diagnostics entry exists per skipped row with the table and key.
  - **P-T5:** a row seeded with `futureField` keeps it after `put` (playlists), `putTracks`, `add` (likes), `save` and `record`.
  - **Derived columns:** after `putTracks`, the raw row has `artistIds`, `providerId` and `addedAt`; the domain `Track` read back has none of them; a second `putTracks` for the same id keeps the original `addedAt` and replaces the display fields; the same `addedAt` rule holds for a second `putAlbums` and a second `putArtists`.
  - **Atomicity on a real failure:** inside `run`, a playlist `put` containing a non-cloneable value (a function) makes the IndexedDB transaction fail, and the earlier writes of the same `run` are not kept.
  - Run it and confirm it **fails** (the module does not exist yet).

### Implementation for User Story 1

- [ ] T019 [US1] Create `src/infrastructure/persistence/memory-storage.ts`: `MemoryStorage implements Storage`, with all five repositories, `StorageUnitOfWork` (snapshot the state before `fn`, restore it if `fn` throws), and `watch*` backed by its own change emitter that emits after each committed change only. It is production code: the session-only fallback (research R2). It follows the same ordering rules as the ports contract. Run T017 and confirm it passes.
- [ ] T020 [US1] Create `src/infrastructure/persistence/dexie-storage.ts`: `DexieStorage implements Storage` over `MpDatabase` (T015). Every read parses rows with the T014 schemas, skips invalid rows and records a diagnostics entry (`kind: 'invalid-row'`, table, key, reason). Updates are read-modify-write inside a transaction so unknown fields are preserved (FR-015). `putTracks` sets and strips the derived columns. `unitOfWork.run` is `db.transaction('rw', <all library tables>, fn)`. `watch*` use Dexie's `liveQuery` wrapped as a `Watchable`; errors from the observable go through `toStorageError`. Failures from Dexie are converted with `toStorageError`; a `null` result rethrows the original error. Run T016 and T018 and confirm both pass.
- [ ] T021 [US1] Edit `src/application/container.ts`: add lazy members `clock` (`SystemClock`), `ids` (`CryptoIdGenerator`), `diagnostics` (`RingDiagnosticsLog`) and `storage` (a `DexieStorage`; Dexie opens the database on first use), each overridable through `configureContainer`. Keep `obsoleteData` unchanged. The container stays the only application file importing infrastructure. T031 replaces the `storage` member with the resilience facade. Run `pnpm typecheck` and `pnpm lint`.
- [ ] T022 [US1] Create `tests/e2e/persistence.spec.ts` with the US1 cases, using `window.__STORAGE__` from T023. Skip nothing by engine. It must **fail** before T023 because the hook does not exist:
  - **V6 reload:** seed one record of every kind (a like; a playlist with items `[a, b, a]`; library items of kind album, artist and track; a track, an album and an artist snapshot; a recent search) through `page.evaluate`, reload, read everything back, and deep-equal it to what was seeded (SC-001).
  - **V6 restart:** seed, then `context.storageState({ indexedDB: true })`, close the context, create a new context from that state, load the app, read back, deep-equal.
  - **V7 two tabs (FR-014, SC-006):** two pages in one context; on page B call `record('likes')` and wait until its initial value is recorded, so the subscription is active before timing starts.
    - **Functional:** page A takes `t0 = Date.now()` immediately before calling `likes.add`; the test waits (up to 10 s, only to stop a hung test) until page B's recorded entries contain the like.
    - **Performance (separate assertion):** that entry's `at` (taken by `Date.now()` in page B's subscription callback) minus `t0` is below 1000 ms. Both pages read the same machine clock, so test-runner latency is excluded; the measurement is still wall-clock and is reported with its value.
  - **Offline (FR-010, FR-011; Story 1 scenario 2):** with the context set offline after the first load, reading the seeded data still works. Also restart (a new context from the storage state) with every request to a catalog or provider endpoint blocked by `page.route`, and read back. Starting the app with no network at all is out of scope until feature 012 (offline app shell, PLAT-04).
- [ ] T023 [US1] Create `src/presentation/testing/storage-hooks.ts` (flag-gated by `NEXT_PUBLIC_TEST_HOOKS`, like the 001 hooks; only this folder reads the flag) exposing `window.__STORAGE__ = { storage, diagnostics, watches, record(name) }`, where `record(name)` subscribes to the named `watch*` method and appends `{ at: Date.now(), value }` for every emitted value to `watches[name]`. Call its installer once from `AppShell` after mount, through a function the testing folder exports. Confirm the normal build has no trace of it (T024 runs the branding scan). Run T022 against a fresh test-hooks build and confirm it passes on all six projects.
- [ ] T024 [US1] Verify US1: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build`, then `pnpm exec playwright test tests/e2e/persistence.spec.ts` (all six projects), then `pnpm build` and `pnpm scan:branding`. Record the results.

**Checkpoint**: US1 is complete and independently verifiable (quickstart V1, V6, V7). The store works on both backends; nothing yet decides when memory is used.

---

## Phase 4: User Story 2 — the app keeps working when the device cannot save (P1)

**Goal**: If the device store cannot be opened, or is lost mid-session, the app keeps working in memory for the session, shows the persistent banner with the D-002-6 text on every page, and never blocks the first paint (FR-016 to FR-019; SC-003, SC-007, SC-008).

**Independent Test**: quickstart V8, V10, V11. With `indexedDB` removed, the shell and every destination work and the banner shows (functional), and separately its in-page insertion time is below 1000 ms (performance, SC-003); with `indexedDB.open` delayed forever, the shell renders and is usable; axe is clean with the banner shown.

### Tests for User Story 2 (write first; they must fail)

- [ ] T025 [P] [US2] Create `tests/component/StorageBanner.test.tsx` (oracles B-T1 to B-T3): for each of the four notices, render `StorageBanner` with `useStorageStatusStore.setState({ phase, notice })` and assert the exact text of [contracts/storage-status.md §2](contracts/storage-status.md#2-banner-text-fixed-copy) in an element with `role="status"`; assert no focusable descendants (`a, button, input, select, textarea, [tabindex]`) and no `tabindex`; assert nothing is rendered for `phase: 'opening'` or `'ready'` with `notice: null`; assert the classes include `bg-surface`, `border-divider` and `text-text` and no raw colour. It fails until T028 and T032.
- [ ] T026 [P] [US2] Create `tests/integration/storage-lifecycle.test.ts` (the US2 part; T037 adds the US3 cases). Each test builds fresh instances: `MemoryStorage` or `DexieStorage` (unique database name), `ResilientStorage`, `createStorageStatusStore()` and `createStorageLifecycle({ lifecycle, status })`, with the fakes, and reads the status from that store:
  - open failure, with `indexedDB` made unavailable (`vi.stubGlobal('indexedDB', undefined)`): `startStorage` resolves, phase `unavailable`, notice `unavailable`, and the facade works in memory;
  - mid-session loss: after `ready`, an operation failing with an `UNAVAILABLE` error swaps the facade to memory, emits `lost` (status `{ unavailable, unavailable }`), and the call is retried and succeeds against memory; a second `UNAVAILABLE` failure afterwards does not switch again and earlier memory writes are still listed; an existing `watchList` subscription receives the memory backend's (empty) value;
  - `QUOTA_EXCEEDED` is reported to the caller as a `StorageError` with no swap and no partial data (the spec's "storage full" edge case);
  - a programming error (`ConstraintError`) is rethrown unchanged and does not swap;
  - `start()` called twice on one lifecycle instance (StrictMode) opens once;
  - `start()` never throws.
  They fail until T029 and T030.
- [ ] T027 [US2] Add the US2 cases to `tests/e2e/persistence.spec.ts`; they fail until T032 and T033:
  - **B-T4:** an init script removes `window.indexedDB` (`Object.defineProperty(window, 'indexedDB', { value: undefined })`); every destination (`/`, `/explore`, `/library`, `/settings`) opens, the banner "Storage is unavailable: your changes won't be saved." is visible on each, and no `pageerror` fires (**functional**, waited for up to 10 s only to stop a hung test). **Performance (SC-003, separate assertion):** the same init script installs a `MutationObserver` at document creation that records `performance.now()` (measured from the page's time origin, that is, navigation start) when the banner element is first inserted; on the first load of each destination that value is below 1000 ms. It is a wall-clock measurement and is reported with its value.
  - **B-T6:** an init script wraps `indexedDB.open` so the request never completes; the shell, navigation and page content render and are usable, and no banner appears (SC-007, edge case "Store opens slowly").
  - **B-T7:** with the banner shown, axe reports 0 serious or critical issues on `/`, `/explore`, `/library`, `/settings`, `/library/liked`, `/settings/x1` and `/radio` (SC-008); keyboard Tab never lands in the banner; at 320 px there is no horizontal scroll.
  - **Reload loses session data:** with the store unavailable, add a like through the hook, reload (still unavailable), and the like is gone while the banner is shown again (Story 2, scenario 3).

### Implementation for User Story 2

- [ ] T028 [US2] Create `src/application/stores/storage-status.ts`: a factory `createStorageStatusStore()` (Zustand `create`, the 001 `createSettingsStore` pattern) and the app singleton `useStorageStatusStore = createStorageStatusStore()`, holding `{ phase: 'opening' | 'ready' | 'unavailable'; notice: 'unavailable' | 'newer-version' | 'blocked-upgrade' | 'stale-tab' | null }` per [contracts/storage-status.md §1](contracts/storage-status.md#1-status-store-srcapplicationstoresstorage-statusts-zustand), initial `{ phase: 'opening', notice: null }`, with a `set(next)` action. All four notice values are declared here even though US3 sets two of them.
- [ ] T029 [US2] Create `src/infrastructure/persistence/resilient-storage.ts`: `ResilientStorage implements Storage, StorageLifecycle`, delegating every repository and `unitOfWork` call to its current backend. It takes `primary`, a `fallback` factory (`() => new MemoryStorage(...)`) and the `DiagnosticsLog`. `start()` opens the primary and returns a `StartResult`; on an availability failure it switches to the fallback and returns `{ outcome: 'unavailable', cause: 'unavailable' }`. When an operation fails and `toStorageError` returns `UNAVAILABLE`, it swaps to a fresh fallback, emits `{ type: 'lost' }` through `onEvent`, records a `storage-error` diagnostics entry, and retries the operation on the fallback. It swaps **at most once per session**: once in memory, later `UNAVAILABLE` failures are retried on the same memory backend and emit nothing. It never writes the status store. `QUOTA_EXCEEDED` and `VERSION_CONFLICT` and programming errors do not swap. Existing `watch*` subscriptions are re-attached to the new backend. Run the T026 cases that cover the facade.
- [ ] T030 [US2] Create `src/application/storage-lifecycle.ts`: `createStorageLifecycle({ lifecycle, status })` returning `{ start(): Promise<void> }`, idempotent **per instance** (the promise is held by the instance, not the module), never throws. `start` calls `lifecycle.start()` (the store is opened only through the port, never through Dexie), subscribes to `lifecycle.onEvent`, and maps results and events with the table in [contracts/storage-ports.md §5](contracts/storage-ports.md#5-use-case), the only place that mapping exists. Also export the app singleton `startStorage`, built lazily from `container.storageLifecycle` and `useStorageStatusStore`. Run the T026 cases.
- [ ] T031 [US2] Edit `src/application/container.ts`: the `storage` member becomes a single `ResilientStorage` wrapping the `DexieStorage` of T021, and a new `storageLifecycle` member returns the same object. It stays the same object for the whole session ([contracts/storage-ports.md §4](contracts/storage-ports.md#4-the-storage-facade)). `configureContainer` can still override it in tests. Run `pnpm typecheck`, `pnpm lint` and the integration tests.
- [ ] T032 [US2] Create `src/presentation/components/shell/StorageBanner.tsx` to [contracts/storage-status.md §2–§3](contracts/storage-status.md#2-banner-text-fixed-copy): the four texts as module constants; an `Info` icon from `lucide-react` with `aria-hidden`; `role="status"`; no tabindex or focusable content; classes `rounded-md border border-divider bg-surface px-4 py-3 text-body text-text`, wrapping text; renders `null` unless `notice !== null`. Edit `src/presentation/components/shell/AppShell.tsx`: render `<StorageBanner />` as the first child of the content `div` inside `<main>`, before `{children}`, and call `startStorage()` once from an effect after mount (through `@/application/storage-lifecycle`). Run T025.
- [ ] T033 [US2] Edit `src/presentation/testing/storage-hooks.ts`: also expose `status` (a getter over `useStorageStatusStore`) and `showNotice(notice)` (sets the store, for the G11 screenshots of the two notices that E2E cannot produce, T045). Build with the test hooks and run T027; B-T4, B-T6, B-T7 and the reload case must pass on all six projects.
- [ ] T034 [US2] Verify US2: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build`, `pnpm exec playwright test tests/e2e/persistence.spec.ts tests/e2e/a11y.spec.ts tests/e2e/states.spec.ts`, then `pnpm build` and `pnpm scan:branding`. Record the results.

**Checkpoint**: US1 and US2 are complete. The app starts without waiting for the store and survives its absence.

---

## Phase 5: User Story 3 — app updates never lose saved data (P2)

**Goal**: Data written by an earlier version is carried over; destructive upgrades cannot ship before export exists; an older tab stops writing and a blocked upgrade tells the listener what to do; data from a newer version is never modified (FR-020 to FR-023).

**Independent Test**: quickstart V4, V5, V9. A v1 fixture opens under a test-only v2 and keeps every record; a destructive entry fails the guard; `blocked`, `versionchange` and a newer pre-existing database behave as the contract says.

### Tests for User Story 3 (write first; they must fail)

- [ ] T035 [P] [US3] Create `tests/unit/migrations-registry.test.ts`: `findDestructive(migrations)` returns the entries with `destructive: true`; with the real `MIGRATIONS` registry it returns none (FR-021); with a synthetic registry containing `{ version: 2, destructive: true, upgrade }` it returns that entry, proving the guard can fail; `MIGRATIONS` versions are strictly increasing and start at 2. It fails until T039.
- [ ] T036 [P] [US3] Create `tests/integration/migrations.test.ts` (quickstart V4): write a fixture through `DexieStorage` at version 1 (one record of every kind); close it; reopen the same database name through a **test-only** subclass that declares version 2 (one added index and an `upgrade()` that adds a field to every playlist without removing anything); assert every record from the fixture is still readable, the added field is present, and unknown fields survived. This proves the harness for later versions; there are no earlier-version fixtures yet because version 1 is the first. It fails until T040.
- [ ] T037 [US3] Add the US3 cases to `tests/integration/storage-lifecycle.test.ts` (oracle B-T8; they fail until T040 and T041):
  - **blocked:** with one connection holding version 1 open and refusing to close, opening a version-2 connection sets notice `blocked-upgrade` with phase still `opening`; closing the first connection lets the open finish, phase `ready`, notice cleared;
  - **versionchange (older tab):** a connection at version 1 receives `versionchange` from a version-2 open, closes itself, the lifecycle sets `{ phase: 'unavailable', notice: 'stale-tab' }`, and a later write goes to memory only and is not in the database;
  - **deleted elsewhere:** a second connection calls `Dexie.delete(<name>)`; the first connection closes, the status is `{ unavailable, unavailable }` (not `stale-tab`), and later writes go to memory;
  - **in-flight race:** an operation already in flight when the upgrade elsewhere occurs fails with `DatabaseClosedError`; the notice stays `stale-tab`, there is no second switch, and a like added in memory before that failure is still listed;
  - **newer data (FR-023):** a database pre-created at a higher version with one row: `startStorage` sets `{ phase: 'unavailable', notice: 'newer-version' }`, the facade works in memory, and reading the raw database afterwards shows the original version and the original row unchanged.
- [ ] T038 [US3] Add the newer-data case to `tests/e2e/persistence.spec.ts` (B-T5, V9; it must fail until T041): an init script creates `mp-library` at a higher version (raw IndexedDB `open('mp-library', 99)` with one object store `likes` holding a row) before the app loads; the page shows both sentences of the `newer-version` notice; after the test, reopening the raw database reports version 99 and the row unchanged; with the store in memory the like added through the hook does not reach it (FR-023). Six projects.

### Implementation for User Story 3

- [ ] T039 [US3] Create `src/infrastructure/persistence/migrations.ts`: `type Migration = { version: number; destructive: boolean; upgrade: (tx) => Promise<void> | void }`, `export const MIGRATIONS: readonly Migration[] = []` (empty after version 1), and `findDestructive(migrations)`. Run T035 and confirm it passes.
- [ ] T040 [US3] Edit `src/infrastructure/persistence/database.ts`: after `version(1)`, declare each registry entry as the next `version(n)` with its `upgrade`; add `versionchange` and `blocked` handlers that report to `ResilientStorage` only (inside infrastructure): `blocked`; `versionchange` with `newVersion` greater than the current version → upgraded elsewhere; `versionchange` with `newVersion === null` → deleted elsewhere. The `versionchange` handler closes the connection. `ResilientStorage` re-emits these as `StorageEvent`s (`blocked`, `upgraded-elsewhere`, `deleted-elsewhere`) after switching to memory for the last two. Map a Dexie `VersionError` at open to `StorageError('VERSION_CONFLICT', reason 'newer-version')` through `toStorageError` (already covered by T013). Read the installed Dexie 4.4.7 typings for the exact event signatures. Run T036.
- [ ] T041 [US3] Edit `src/infrastructure/persistence/resilient-storage.ts` (switch to memory on `upgraded-elsewhere` and `deleted-elsewhere`, at most once; on `VERSION_CONFLICT` with reason `newer-version` at open, return `{ outcome: 'unavailable', cause: 'newer-version' }` without writing to the database) and `src/application/storage-lifecycle.ts` (map with the contract table: `blocked` → `{ opening, blocked-upgrade }`, cleared when `start` resolves `ready`; `upgraded-elsewhere` → `{ unavailable, stale-tab }`; `deleted-elsewhere` and `lost` → `{ unavailable, unavailable }`; `newer-version` → `{ unavailable, newer-version }`; once `phase` is `unavailable`, ignore further events for the notice, first notice wins). Run T037, then rebuild with the test hooks and run T038 on all six projects.
- [ ] T042 [US3] Verify US3: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build`, `pnpm exec playwright test tests/e2e/persistence.spec.ts`, then `pnpm build` and `pnpm scan:branding`. Record the results.

**Checkpoint**: All three stories are complete.

---

## Phase 6: Polish & cross-cutting (docs, gates, review)

**Purpose**: Keep the docs true (constitution XV) and run the gates. Results are reported exactly as they ran.

- [ ] T043 [P] Apply the remaining plan amendments (the §2 part was done in T004): `docs/architecture.md` §4 (folder `infrastructure/persistence/`, plus `application/storage-lifecycle.ts` and `stores/storage-status.ts`), §7 (add `useStorageStatusStore`; the library-data row reads "read through repository `watch` ports (Dexie `liveQuery`, or memory in fallback)"), §11 (the storage-unavailable paragraph points to the four notices and carries the error-mapping table of R7), §12 (table names and indexes as in data-model §3, the derived `tracks` columns, which tables are defined only, and the migrations registry rule), ADR-004 amended per plan amendment 4, new ADR-012 per amendment 5; `docs/ux-specification.md` §7 (the `blocked-upgrade` and `stale-tab` texts beside the D-002-6 texts); `docs/testing/test-plan.md` §3.6 (the shared contract suite on both backends, the `integration` Vitest project, the E2E mechanics of R10); `specs/README.md` row 002.
- [ ] T044 Run the full gate set on the final tree and record each command, its result and every failure, compared with the T001 baseline: `pnpm typecheck`, `pnpm lint`, `pnpm test:coverage` (`domain/` ≥ 90% line and branch), `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build`, `pnpm test:e2e` (all six projects, wait for it to finish), then `pnpm build` and `pnpm scan:branding`. A test that did not run is **not run**. Do not edit sources or run a build while the E2E is running.
- [ ] T045 G11 review material: against the test-hooks build (`NEXT_PUBLIC_TEST_HOOKS=1 pnpm build`; the hook is needed for two of the notices), capture screenshots of the banner in `specs/002-local-persistence/review/` at 320, 375, 768, 1024 and 1440 px for each of the four notices, with the real failure paths where E2E can produce them (`unavailable`: `indexedDB` removed; `newer-version`: pre-created higher version) and `window.__STORAGE__.showNotice(...)` for `blocked-upgrade` and `stale-tab`, on `/` and `/settings`. Use a throwaway spec that is deleted afterwards. List the files in this task's note and state which notices came from a real failure and which from the hook. Request the owner's G11 sign-off.
- [ ] T046 Run `/code-review` on the 002 diff and record the findings and their dispositions in this file. Fix confirmed defects within 002 scope; propose anything else in writing (rule 9). Check each finding against the code before acting.
- [ ] T047 At owner acceptance (G13) only, add the `### 002-local-persistence` gate-status section and its G13 acceptance record to `docs/quality-gates.md`, in the format used for 001 and 014: gate table with evidence, exceptions and deviations accepted, deferred items (none new unless the owner defers one), open obligations (CI, 001's screen-reader pass, the 014 real high-contrast check), and follow-ups. Then mark 002 accepted in `specs/README.md`. Do not commit unless the owner asks.

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
