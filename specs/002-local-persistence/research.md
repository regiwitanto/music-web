# Research: Local Persistence Foundation (002)

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-11-07

Each item records the decision, why, and the alternatives considered. Items marked **needs owner approval at G3** change an approved document or add a user-visible text, and are listed again in the plan's "Proposed doc amendments".

---

## R1. The database and schema version 1 (FR-001, FR-002; D-002-1, D-002-5)

**Decision**: One IndexedDB database named `mp-library`, opened with Dexie (4.4.7, pinned). Schema version 1 declares **every** table of [architecture §12](../../docs/architecture.md#12-persistence-dexie-schema-v1), including the tables owned by later features, so features 007, 009 and 010 need no upgrade:

| Table | Declared as | Built and tested in 002? |
|---|---|---|
| `tracks` | `id, album.id, *artistIds, addedAt, providerId` | Yes (snapshots) |
| `albums`, `artists` | `id` | Yes (snapshots) |
| `libraryItems` | `[kind+entityId], kind, addedAt` | Yes |
| `likes` | `trackId, likedAt` | Yes |
| `playlists` | `id, name, updatedAt, createdAt` | Yes |
| `recentSearches` | `query, searchedAt` | Yes |
| `settings` | `key` | **Defined only** (D-002-5) |
| `playerSnapshot` | `id` | Defined only (feature 007) |
| `playEvents` | `++id, trackId, startedAt, [trackId+startedAt]` | Defined only (007, 011) |
| `localFiles` | `trackId, size, importedAt` | Defined only (009) |
| `localArtwork` | `artworkId` | Defined only (009) |

- The first entry is Dexie's primary key. Architecture §12 writes it as `&id`; in Dexie a primary key is unique by definition, so the declaration omits the `&`. The key and indexes are the same.
- `tracks` needs two **derived columns** because Dexie cannot index a computed value: `artistIds` (the ids from `artists[]`, indexed multi-entry) and `providerId` (the prefix of `id`), plus `addedAt`. They are set by the repository, never by callers, and are stripped when a row is mapped back to a domain `Track`.
- A schema test asserts the exact table names and index lists above, so a later change that edits version 1 instead of adding version 2 fails.

**Rationale**: D-002-1 fixed "all areas in version 1". Declaring a table costs nothing, and adding one later would force an upgrade for every installed copy.

**Alternatives considered**: one database per area (rejected: no cross-table transactions, FR-012); declaring only the built tables (rejected: contradicts D-002-1).

## R2. Repositories behind application ports, with a real second implementation (FR-003, FR-016; constitution VIII)

**Decision**: The application layer declares the repository ports in `src/application/ports.ts` (contract: [contracts/storage-ports.md](contracts/storage-ports.md)). Two implementations exist in `src/infrastructure/persistence/`: `DexieStorage` and `MemoryStorage`. The in-memory one is **production code**, not a test fake: it is the session-only fallback of FR-016. That gives the ports a genuine second implementation (constitution VIII, architecture §3 rule 4), and one shared **contract test suite** runs against both, so the fallback behaves exactly like the real store ("the same behaviour for every feature except that nothing survives a reload").

The ports built here, minimal and without business rules (FR-004):

| Port | Operations |
|---|---|
| `LikesRepository` | `add`, `remove`, `has`, `list`, `watchList` |
| `PlaylistsRepository` | `put` (whole playlist, ordered `items[]`, ADR-005), `get`, `list`, `delete`, `watchList`, `watch(id)` |
| `LibraryItemsRepository` | `save`, `remove`, `has`, `list(kind?)`, `watchList(kind?)` |
| `SnapshotsRepository` | `putTracks`, `putAlbums`, `putArtists`, `getTracks(ids)`, `getAlbums(ids)`, `getArtists(ids)` |
| `RecentSearchesRepository` | `record`, `list`, `remove`, `clear`, `watchList` (no cap: EXP-02's 10 is feature 004's rule) |
| `StorageUnitOfWork` | `run(fn)` (R4) |

There is no `SettingsRepository` (D-002-5) and no repository for `playerSnapshot`, `playEvents`, `localFiles` or `localArtwork`.

**Rationale**: Presentation never touches Dexie (architecture §3 rule 2), and the memory fallback needs the same surface.

**Alternatives considered**: a generic table-access facade (rejected: leaks Dexie's query model and cannot be mirrored in memory); a fake used only by tests (rejected: the fallback needs a real one anyway).

## R3. Reactive reads: our own `watch` port, not `useLiveQuery` — **needs owner approval at G3**

**Decision**: Reads that views subscribe to are exposed as `watch*` methods returning a minimal `Watchable<T>` (`subscribe(next, error?) → unsubscribe`, defined in `ports.ts`). `DexieStorage` implements them with Dexie's `liveQuery`, which also notifies other tabs and windows. `MemoryStorage` implements them with its own change emitter. No hook is added in 002: the first consumers (004–006) wrap a `Watchable` in a small `useSyncExternalStore` hook of their own.

This **amends ADR-004** ("read through Dexie `useLiveQuery`"): the reads still come from the database and are not copied into Zustand, but they go through the repository port instead of `useLiveQuery` in components. `dexie-react-hooks` is therefore **not added** in 002.

**Rationale**:
- `useLiveQuery` observes a Dexie database, so it cannot observe the in-memory fallback. The same view would not update in private mode.
- Layer rule: presentation may not import Dexie. A `Watchable` keeps that rule.
- It removes a dependency.

**Alternatives considered**: keep `useLiveQuery` and have the fallback fake a Dexie database with `fake-indexeddb` in the browser (rejected: ships a test library and still fails when IndexedDB itself is unavailable); polling (rejected: wasteful, and misses SC-006's 1 s with fast changes).

**Verification note**: that Dexie's `liveQuery` reaches other tabs is checked in the six-project E2E (V7), because `fake-indexeddb` in one process cannot show it.

## R4. All-or-nothing writes (FR-012)

**Decision**: `StorageUnitOfWork.run(fn)` runs `fn` as one atomic unit over all library tables. Inside `fn`, the repositories behave normally and take part in the unit automatically.
- **Dexie**: `db.transaction('rw', libraryTables, fn)`. Dexie propagates the transaction through its promise zone, so repository calls inside `fn` join it. If `fn` throws, or a write fails, the whole transaction aborts.
- **Memory**: the state is snapshotted before `fn` and restored if `fn` throws.
- Rule for callers: inside `run`, await only repository calls (an IndexedDB transaction closes if you await anything else, such as a network call). This is stated in the port documentation and enforced by tests, not by types.

**Rationale**: It is the smallest mechanism that satisfies "a playlist change and the track details it needs are kept together or not at all".

**Alternatives considered**: purpose-built composite methods for each case (rejected: guesses what 004–006 need, constitution XIV); optimistic writes with manual undo (rejected: can leave partial data after a crash).

## R5. Validation on read and unknown fields (FR-013, FR-015)

**Decision**: Every row read from the store is parsed with a **zod 4** schema in `src/infrastructure/persistence/schemas.ts`.
- Schemas are written with `z.looseObject`, so fields this version does not know **pass through** and are written back unchanged on a rewrite (FR-015). Rewrites are read-modify-write inside a transaction, never blind replacement.
- A row that fails its schema is **skipped** and one `DiagnosticsEntry` is recorded (R6). The rest of the data loads. The listener sees nothing.
- Each schema is tied to its domain type with `satisfies z.ZodType<Model>`, so the type and the schema cannot drift apart silently.
- zod stays in infrastructure, because the domain "may import nothing" (architecture §3).

**Rationale**: zod is already approved (architecture §2) for backup import validation (SET-04) and for validating settings on read. Using it now means feature 010 reuses the same schemas.

**Alternatives considered**: hand-written type guards (rejected: duplicates the types and will be rewritten for backup import); validating on write only (rejected: does not protect against data written by another version).

## R6. The diagnostics record (FR-013)

**Decision**: A `DiagnosticsLog` port with one in-memory implementation: a ring buffer of the last **200** entries (`kind`, `table`, `key`, `reason`, `at`). It is not persisted in 002. Exporting it is feature 013 (PLAT-05), which decides whether and how to persist it.

**Rationale**: Writing the log into the store that is misbehaving would hide the failures it exists to report, and an unbounded log would grow forever. The spec says only that it is "a local log".

**Alternatives considered**: a persisted log table (rejected: it would add a table and a retention policy that nobody has specified, and it fails when the store is the problem).

## R7. Opening the store and the status (FR-016, FR-017, FR-019; SC-003, SC-007)

**Decision**:
- **When**: after mount, never before first paint. `AppShell` calls `startStorage()` in an effect: the app singleton of `createStorageLifecycle`, which opens the store only through the `StorageLifecycle` port (the application never touches Dexie; [contracts/storage-ports.md §4–§5](contracts/storage-ports.md#4-the-storage-facade)). The shell, navigation and every page render without waiting. Screens that need data wait for `status.phase === 'ready'` using the 001 loading states.
- **Status**: a small Zustand store `useStorageStatusStore` holds `phase` (`opening`, `ready`, `unavailable`) and an optional `notice` (R8, [contracts/storage-status.md](contracts/storage-status.md)).
- **Failure at open**: any availability failure (R8 error mapping) switches the facade to `MemoryStorage` and sets `phase: 'unavailable'`.
- **Failure mid-session**: a `ResilientStorage` decorator wraps the real store. When an operation fails with `UNAVAILABLE`, it swaps to a fresh `MemoryStorage`, emits a `lost` event (the lifecycle sets the status), and retries the operation on memory. It swaps **at most once per session**: later `UNAVAILABLE` failures, for example an operation that was in flight during the switch, are retried on the same memory backend, so writes made in memory are never discarded. Data that was already on the device is not copied into memory (spec: "session-only data").
- **Error mapping** (`src/infrastructure/persistence/errors.ts`):

| Raised by Dexie or the browser | Reported as (`StorageError`) |
|---|---|
| `QuotaExceededError` | `QUOTA_EXCEEDED` |
| `VersionError` (the database is newer than this version) | `VERSION_CONFLICT` with reason `newer-version` |
| `OpenFailedError`, `DatabaseClosedError`, `SecurityError`, `InvalidStateError`, `UnknownError`, `MissingAPIError` (no `indexedDB`) | `UNAVAILABLE` |
| Anything else (`ConstraintError`, `DataError`, `TypeError`...) | Not a storage error: these are caller or programming errors, they are rethrown unchanged and caught by tests |

FR-019 ("reported as the storage error kinds, never as unhandled errors") is read as covering the three failure modes it names. A programming error must not be swallowed or trigger the private-mode fallback.

**Rationale**: Meets "the shell appears no later than in 001" (SC-007) and "the banner within 1 s" (SC-003).

**Alternatives considered**: awaiting the open before rendering (rejected: violates SC-007); a React error boundary (rejected: storage failures are not render errors).

## R8. Upgrades, other tabs and newer data (FR-020 to FR-023; Story 3)

**Decision**:
- **Migrations registry.** Every schema version after 1 is declared in `src/infrastructure/persistence/migrations.ts` as an entry `{ version, destructive, upgrade }`. A unit test fails if any entry has `destructive: true` (FR-021: not allowed until export exists in 010) and checks that each `upgrade` is covered by a fixture test. Version 1 is the first version, so no earlier-version fixtures exist yet. The harness is proven with a test-only second version declared inside the test (opens a v1 fixture, applies a v2 `upgrade`, keeps every record).
- **Older tab (the one that is told to stop).** Dexie raises `versionchange` when a newer tab upgrades. The handler closes the connection, switches this tab to memory mode, and emits `upgraded-elsewhere` (notice `stale-tab`): this tab stops writing (FR-022).
- **Deleted elsewhere.** A `versionchange` with `newVersion === null` means the database is being deleted, for example by a future "reset all data" (010) in another tab. It is reported as `deleted-elsewhere` and shows the `unavailable` notice, not `stale-tab`, whose text ("out of date") would be untrue.
- **Newer tab (the one waiting).** While another tab keeps the old version open, the upgrade is `blocked`. The handler sets notice `blocked-upgrade`. When the other tab closes or reloads, the open continues and the notice clears.
- **Newer data.** `VersionError` at open means stored data is from a newer app version (a rollback). The store is not touched. The app switches to memory mode with notice `newer-version` (FR-023).
- **Notice texts**. Three texts are new and are fixed in [contracts/storage-status.md](contracts/storage-status.md) (**needs owner approval at G3**, and UX §7 is amended in the same change):
  - `blocked-upgrade`: "A newer version is ready, but another tab is still open. Close the other tab or reload it to finish updating."
  - `stale-tab`: "This tab is out of date and has stopped saving. Reload this page to continue."
  - `newer-version`: the D-002-6 text (neutral sentence plus "Data from a newer version of the app was found and has been left untouched.").

**Rationale**: Each text is the smallest sentence that tells the listener what to do (FR-022), in the plain, blame-free style of 001 FR-038.

**Alternatives considered**: a dialog instead of the banner (rejected: spec says a banner and "never takes focus or blocks content"); silently retrying forever (rejected: the listener never learns why nothing is saved).

## R9. Test strategy (constitution X)

**Decision**: four levels.

| Level | What | Where |
|---|---|---|
| Unit | Schemas (valid, invalid, unknown fields), error mapping, ring buffer, migrations registry guard, schema-v1 shape | `tests/unit/` |
| Integration | One **contract suite** run against both `MemoryStorage` and `DexieStorage` (under `fake-indexeddb`): CRUD per repository, ordering, atomic groups with an injected failure, validation skip with a diagnostics entry, unknown-field preservation, watch notifications; plus lifecycle (open failure, mid-session loss, newer data, `blocked`, `versionchange`) and the migration harness | `tests/integration/` (new Vitest project, Node, `fake-indexeddb/auto`) |
| Component | The banner: text, `role="status"`, no focus, no focusable content, wrapping at 320 px classes | `tests/component/` |
| E2E | Persistence across reload and across a new browser context with the same storage state; unavailable store; newer data; two tabs; the shell never waits for the store | `tests/e2e/` (all six projects) |

Determinism: an injected `Clock` and `IdGenerator` (ports, with fixed fakes); no network; fixtures are code, not committed binary databases.

**Rationale**: The contract suite is the one place that proves the fallback equals the real store. `fake-indexeddb` supports `versionchange` and `blocked`, so the upgrade rules are tested without a browser.

## R10. E2E mechanics and test hooks (FR-024; SC-001 to SC-003, SC-006, SC-007)

**Decision**:
- **Test hooks** (`src/presentation/testing/storage-hooks.ts`), flag-gated by `NEXT_PUBLIC_TEST_HOOKS` and excluded from normal builds like the 001 hooks (the branding scan already checks the build output): they expose `window.__STORAGE__` with the repositories, the `watch` subscriptions (recorded into an array the test reads), the status, and the diagnostics entries.
- **No hook is needed to make the store unavailable.** The test installs an init script that removes or breaks `window.indexedDB` (open fails), or delays `indexedDB.open` forever (to prove the shell does not wait), or pre-creates `mp-library` at a **higher version** with raw IndexedDB (newer data). This tests the real failure paths.
- **Browser restart**: `context.storageState({ indexedDB: true })`, then a new context created from it (Playwright 1.64 supports it), as test-plan E2E-08 describes.
- **Two tabs**: two pages in one context; write in A, read the recorded `watch` in B.
- **Functional correctness and time budgets are separate assertions.** A test first proves the behaviour (the banner appears, the change arrives) with a generous Playwright timeout; that timeout only stops a hung test and is **never** evidence of a budget. The 1 s budgets (SC-003, SC-006) are then checked against timestamps taken **inside the browser**:
  - SC-003: start = navigation start (`performance.now()` is measured from the page's time origin); end = the `performance.now()` recorded by a `MutationObserver`, installed by an init script at document creation, when the banner element is first inserted.
  - SC-006: page B's subscription is confirmed active (its initial value recorded) **before** the start stamp is taken, so subscription set-up is not measured. Start = `Date.now()` on page A immediately before `likes.add`; end = `Date.now()` in page B's subscription callback when the value containing the like arrives. Both pages read the same machine clock.
- These are **wall-clock measurements**: they are not fully deterministic and can be affected by machine load (001 G9 gap 6). A budget failure is reported with the measured value as a performance result and investigated; it is never fixed by raising a timeout or by retrying the test.
- **Not coverable in E2E**: an older tab blocking a newer one cannot be produced, because only version 1 exists. It is covered by the integration tests (R8).

## R11. The banner (FR-017; Story 2 scenario 4)

**Decision**: `StorageBanner` is rendered inside `AppShell` as the first child of the content column, in normal flow (not fixed), so it can never cover content or the navigation. It has `role="status"` (a polite live region), no tabindex, no links or buttons, an information icon and the notice text, and uses token utilities only (`bg-surface`, `border-divider`, `text-text`). It wraps at 320 px. It renders nothing while `phase` is `opening` or `ready` and no notice is set.

**Rationale**: In flow is the only placement that cannot overlap the player dock, the bottom navigation or the sidebar; the skip link and focus rules of 001 are untouched because the banner is not focusable. The live region announces the text once when it appears.

**Alternatives considered**: a fixed top bar (rejected: it can cover content and needs layout offsets); a toast (rejected: the spec requires persistence).

## R12. Dependencies and licence review (constitution VIII, XII)

| Package | Version (pinned) | Licence | In the build output | Entry in architecture §2 |
|---|---|---|---|---|
| `dexie` | 4.4.7 | Apache-2.0 | Yes (client bundle) | Already "Keep (v4)"; add the pinned version and a licence-review row |
| `zod` | 4.6.7 | MIT | Yes (client bundle: schemas run in the browser) | Already justified for SET-04; extend the "Why" to stored-record validation and add a licence-review row |
| `fake-indexeddb` | 6.2.7 | Apache-2.0 | No (dev only) | Already listed |
| `dexie-react-hooks` | 4.4.0 | Apache-2.0 | — | **Not adopted** (R3) |

Rules from §2: each licence is verified against the installed `LICENSE` file when installed (a mismatch stops the task), and `THIRD_PARTY_NOTICES.md` gets the Apache-2.0 text (with any `NOTICE` file) and the MIT text for the two runtime packages, in the same change.

## R13. Domain additions (architecture §5; constitution VIII)

**Decision**: Three pure modules, matching the folder layout of architecture §4:
- `src/domain/ids.ts`: `ProviderId`, `EntityId`.
- `src/domain/models.ts`: the library-related entities, copied from architecture §5: `Artwork`, `Track`, `Artist`, `Album`, `Playlist`, `PlaylistItem`, plus `Like`, `LibraryItem` and `RecentSearch`.
- `src/domain/errors.ts`: `StorageError` with its three kinds and `reason`.

`Clock` and `IdGenerator` are application ports (browser time and `crypto.randomUUID` are browser globals, which the domain may not touch).

Feature 003 (catalog and provider) imports these types and may refine field names but not concepts (architecture §5). Playback, queue and provider types are **not** added here.

## R14. Details left to the owning features

- **Liked songs.** Architecture §5 has both a `likes` table and a playlist `kind: 'system-liked'`. How the two relate is a feature 005 (Library) rule. 002 stores both as defined and decides nothing about it.
- **Recent searches cap, history pruning, playlist limits**: consumer rules (FR-004), not enforced here.
- **Ordering**: `list` methods return a documented stable order: likes by `likedAt` descending, library items by `addedAt` descending, playlists by `updatedAt` descending, recent searches by `searchedAt` descending. Times are stored values, never recomputed (spec edge case "Clock changes").
