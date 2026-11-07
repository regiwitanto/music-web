# Implementation Plan: Local Persistence Foundation

**Branch**: `002-local-persistence` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-local-persistence/spec.md` (approved 2026-11-07, G1, after reconciliation D-002-4 and clarifications D-002-1, D-002-5, D-002-6)

**Status**: Approved (owner, 2026-11-07, G3), including the ADR-004 amendment (R3), the two new notice texts (R8) and proposed doc amendments 1–10.

## Summary

Add the on-device store that every later feature saves into. The listener-visible promise is that what they save on this device stays saved, and that the app keeps working, with an honest banner, when the device cannot save.

**Technical approach**
- **Database.** One IndexedDB database, `mp-library`, opened with Dexie 4.4.7. Schema version 1 declares every table of architecture §12 (D-002-1), but 002 builds only the library areas: likes, playlists, library items, track/album/artist snapshots and recent searches. Settings is defined only (D-002-5). See R1.
- **Ports and two implementations.** Repositories are application ports with two production implementations: `DexieStorage` and the session-only `MemoryStorage` fallback. One shared contract suite proves they behave alike (R2).
- **Reactive reads.** Reads are exposed as `watch*` methods returning a small `Watchable`. Dexie's `liveQuery` backs them, which also covers other tabs, and the memory backend emits its own changes. This **amends ADR-004**; `dexie-react-hooks` is not added (R3).
- **Correctness rules.** All-or-nothing writes go through a unit of work (R4). Rows are validated on read with zod, invalid rows are skipped and logged, and unknown fields are preserved (R5, R6).
- **Never blocking the first paint.** The store opens after mount. A status store drives an in-flow `role="status"` banner (D-002-6 copy) for four notices: unavailable, newer data, blocked upgrade, stale tab. Mid-session loss switches to memory (R7, R8, R11).
- **Upgrades.** A migrations registry refuses destructive upgrades until export exists in 010. Older tabs stop writing; newer data is never touched (R8).
- **Tests.** Unit, integration under `fake-indexeddb` (a new Vitest project), component, and six-project E2E. E2E uses test hooks for seeding and reading, and real browser failure paths (no `indexedDB`, a delayed open, a higher pre-existing version) instead of hooks (R9, R10).

## Technical Context

**Language/Version**: TypeScript 5 (strict flags as in 001), React 19.3, Node 24 LTS.

**Primary Dependencies**: Next.js 16.4.5 App Router, Zustand 5 (the status store).

**New dependencies** (R12; licences verified at install):

| Package | Version | Licence | Use | §2 status |
|---|---|---|---|---|
| `dexie` | 4.4.7 | Apache-2.0 | IndexedDB access, transactions, `liveQuery` | already "Keep (v4)" |
| `zod` | 4.6.7 | MIT | Row validation on read | already justified (SET-04); extend |
| `fake-indexeddb` | 6.2.7, dev only | Apache-2.0 | IndexedDB under Vitest | already listed |

**Storage**: IndexedDB database `mp-library`, schema version 1 ([data-model §3](data-model.md#3-stored-rows-database-mp-library-schema-version-1)). Nothing in `localStorage`. 014's `ObsoleteDataCleaner` is untouched.

**Testing**: Vitest gains a third project, `integration` (Node environment, `fake-indexeddb/auto`, `tests/integration/**/*.test.ts`). Existing `node` and `dom` projects are unchanged. Playwright: six projects, `persistence.spec.ts`, plus `context.storageState({ indexedDB: true })` for restarts.

**Target Platform**: D4 browsers. All support IndexedDB in normal browsing (spec Assumptions).

**Project Type**: Single client-heavy web application (Next.js App Router) in `src/`.

**Performance Goals**:
- The shell appears no later than in 001: the open is never awaited before paint (SC-007).
- The banner appears within 1 s of start-up (SC-003).
- A change reaches another tab within 1 s (SC-006).

**Constraints**:
- No backend, no network (constitution XIII, VI).
- Layer rules: Dexie and zod only in infrastructure. Presentation reaches storage through application ports and stores.
- No destructive migration until export (010).
- WCAG 2.2 AA for the banner.

**Scale/Scope**:
- Personal scale: thousands of items (ADR-005 revisits playlists above about 10k).
- Five repositories built, eleven tables declared, one banner, one status store, one use case.

No `NEEDS CLARIFICATION` remains: the spec's open decisions are D-002-5 and D-002-6, and every design unknown is resolved in [research.md](research.md) R1–R14. Two choices need explicit owner approval at G3: the ADR-004 amendment (R3) and the two new notice texts (R8).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | Pre-research | Post-design | Evidence |
|---|---|---|---|---|
| I | Specification-first | ✅ | ✅ | The spec is approved (G1, 2026-11-07). It lists PLAT-01 (library part) and UX-AC-12. This plan awaits G3. |
| II | Music-first UX | ✅ | ✅ | No playback yet. A storage failure never breaks a page: the app falls back to memory. The open never blocks the shell (R7). |
| III | Four destinations | ✅ | ✅ | Navigation is untouched. The banner is shell content, not a destination. |
| IV | Persistent global player | ✅ | ✅ | The dock is untouched. The banner is in flow, so it cannot cover it. |
| V | Single audio engine | N/A | N/A | No audio. |
| VI | Local-first data | ✅ | ✅ | All data lives on the device in IndexedDB; the app works offline. Export, import and reset arrive in 010. Destructive migrations are refused until then (R8). |
| VII | MusicProvider | ✅ | ✅ | Snapshots store provider-namespaced `EntityId`s and never parse them (provider-contract §3). No provider is called. |
| VIII | Strict TS, modular | ✅ | ✅ | Ports in application, Dexie and zod in infrastructure, a pure domain. The repository ports have two real implementations plus a shared contract suite. The `Watchable`, `StorageUnitOfWork` and `DiagnosticsLog` abstractions are required by those tests. New dependencies are justified in §2 (amendment 1). Layer lint gains no-Dexie and no-zod rules for presentation and application. |
| IX | Accessibility and responsive | ✅ | ✅ | The banner is `role="status"`, unfocusable, in flow, wraps at 320 px, token colours only. axe runs with it shown (B-T7). |
| X | Automated tests | ✅ | ✅ | Persistence and migrations are critical behaviour; the contract suite, migration harness, lifecycle and E2E cover them. Tests are deterministic: injected `Clock` and `IdGenerator`, no network, fixtures in code. |
| XI | Privacy | ✅ | ✅ | Nothing leaves the device. The diagnostics log stays in memory (R6). |
| XII | Licensing and branding | ✅ | ✅ | Two runtime packages with licence rows and notices (R12). The DB name and banner texts contain no brand names. |
| XIII | No backend | ✅ | ✅ | None. |
| XIV | No silent scope expansion | ✅ | ✅ | No settings repository (D-002-5), no business rules (FR-004), no hook for views (left to 004–006), no quota UI (009), no export (010). The two new notice texts and the ADR-004 amendment are put to the owner, not assumed. |
| XV | Docs and code consistency | ✅ | ✅ | Architecture §2, §4, §7, §11, §12 and ADR-004, UX §7, test-plan §3.6 and THIRD_PARTY_NOTICES are amended in the implementation change (below). |

**Result: PASS.** There are no violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-local-persistence/
├── spec.md                   # approved 2026-11-07 (G1)
├── plan.md                   # this file
├── research.md               # R1–R14
├── data-model.md             # entities, rows, validation, status state machine, migrations
├── quickstart.md             # gates and validation V1–V12
├── contracts/
│   ├── storage-ports.md      # repositories, unit of work, facade, use case; oracles P-T1–P-T8
│   └── storage-status.md     # status store, banner copy and rules; oracles B-T1–B-T8
├── checklists/requirements.md
└── tasks.md                  # /speckit-tasks (not created here)
```

### Source code (repository root)

```text
src/
  domain/
    ids.ts                                 NEW   ProviderId, EntityId
    models.ts                              NEW   Artwork, Track, Artist, Album, Playlist, PlaylistItem, Like, LibraryItem, RecentSearch
    errors.ts                              NEW   StorageError
  application/
    ports.ts                               EDIT  + Watchable, Clock, IdGenerator, repositories, StorageUnitOfWork, Storage, DiagnosticsLog, StorageLifecycle
    container.ts                           EDIT  + storage (ResilientStorage), diagnostics, clock, ids
    storage-lifecycle.ts                   NEW   createStorageLifecycle() + app singleton startStorage
    stores/storage-status.ts               NEW   createStorageStatusStore() + app singleton useStorageStatusStore
  infrastructure/persistence/
    database.ts                            NEW   Dexie subclass, schema v1, versionchange and blocked handlers
    schemas.ts                             NEW   zod row schemas (looseObject)
    errors.ts                              NEW   toStorageError()
    migrations.ts                          NEW   registry (empty after v1)
    dexie-storage.ts                       NEW   DexieStorage (repositories, unit of work, liveQuery watches)
    memory-storage.ts                      NEW   MemoryStorage (fallback)
    resilient-storage.ts                   NEW   facade (Storage + StorageLifecycle): opens, swaps to memory at most once, emits events
    diagnostics-log.ts                     NEW   ring buffer (200)
    system.ts                              NEW   SystemClock, CryptoIdGenerator
  presentation/
    components/shell/StorageBanner.tsx     NEW
    components/shell/AppShell.tsx          EDIT  render StorageBanner; call startStorage() once after mount
    testing/storage-hooks.ts               NEW   window.__STORAGE__ (flag-gated)
  test/fakes/
    FixedClock.ts, SequentialIds.ts        NEW
tests/
  unit/ids.test.ts, storage-error.test.ts, storage-errors.test.ts, row-schemas.test.ts,
       diagnostics-log.test.ts, migrations-registry.test.ts          NEW
  integration/environment.test.ts, schema.test.ts, storage-contract.ts (shared suite),
              memory-storage.test.ts, dexie-storage.test.ts, storage-lifecycle.test.ts,
              migrations.test.ts                                     NEW
  component/StorageBanner.test.tsx                                   NEW
  e2e/persistence.spec.ts                                            NEW
  lint/layers.test.ts                                                EDIT  Dexie/zod bans for presentation and application
vitest.config.mts                                                    EDIT  + integration project
eslint.config.mjs                                                    EDIT  ban dexie and zod outside infrastructure
package.json, pnpm-lock.yaml                                         EDIT  dexie, zod, fake-indexeddb (pinned)
THIRD_PARTY_NOTICES.md                                               EDIT  Dexie (Apache-2.0), zod (MIT)
```

**Structure Decision**: It keeps 001's layered layout. Architecture §4 names the Dexie folder `infrastructure/db/`; this plan uses `infrastructure/persistence/` because it also holds the memory backend and the resilience facade, which are not Dexie. Amendment 2 renames it in §4.

## Implementation phases (for `/speckit-tasks`; not executed here)

1. **Dependencies and tooling.** Install the three packages pinned and verify the licences. Add the Vitest `integration` project. Add the lint bans and their layer-test fixtures. Update the THIRD_PARTY_NOTICES and §2 rows.
2. **Domain.** `ids.ts`, `models.ts` and `errors.ts`, with unit tests where there is logic.
3. **Schema and pure infrastructure.** Schema v1 (P-T7), the zod schemas, error mapping (P-T8), the diagnostics ring buffer and the migrations registry guard. All test-first.
4. **The contract suite, then `MemoryStorage`.** Write the shared suite (P-T1 to P-T6) first; make it pass on memory.
5. **`DexieStorage`.** Make the same suite pass under `fake-indexeddb`, plus validation skip and unknown-field cases on seeded raw rows.
6. **Lifecycle.** `ResilientStorage`, the status store, `startStorage`, the blocked, versionchange and newer-version handling (B-T8), and the migration harness (V4).
7. **Banner and shell.** `StorageBanner` (B-T1 to B-T3), wired into `AppShell` with the start-up call.
8. **Test hooks and E2E.** `storage-hooks.ts` and `persistence.spec.ts` (V6 to V10, B-T7).
9. **Docs and gates.** The amendments below, G5–G10, then the G11 visual review of the banner, `/code-review`, and G13.

## Proposed doc amendments (for owner approval at G3)

Applied during implementation (phase 1 or 9), not now.

1. **Architecture §2.**
   - Pin `dexie` 4.4.7 and mark `dexie-react-hooks` as "not adopted in 002 (R3); revisit if a view needs it".
   - Extend `zod`'s "Why" to stored-record validation on read.
   - Add licence-review rows for `dexie` (Apache-2.0) and `zod` (MIT).
2. **Architecture §4.** `infrastructure/db/` becomes `infrastructure/persistence/` (database, schemas, migrations, Dexie and memory backends, resilience facade). Add `application/storage-lifecycle.ts` and `stores/storage-status.ts`.
3. **Architecture §7.** Add `useStorageStatusStore`. The library-data row becomes "read through repository `watch` ports (Dexie `liveQuery`, or memory in fallback)".
4. **ADR-004 amended (R3), needs explicit owner approval.** "Library data is read through repository `watch` ports, backed by Dexie `liveQuery` (cross-tab) or by the in-memory fallback. It is not copied into Zustand." Trade-off: one small hook per consuming feature instead of `useLiveQuery`.
5. **New ADR-012.** "Persistence behind application ports with two production backends: Dexie (IndexedDB) and an in-memory session fallback, chosen at runtime by a resilience facade. Atomic groups through a unit of work." Rationale: FR-016 and the layer rules.
6. **Architecture §11.** The storage-unavailable paragraph points to the four notices in [contracts/storage-status.md](contracts/storage-status.md). Add the error-mapping table (R7).
7. **Architecture §12.**
   - Table names and indexes as in data-model §3, noting the derived `tracks` columns and that `settings`, `playerSnapshot`, `playEvents`, `localFiles` and `localArtwork` are defined in v1 but built by their features.
   - Add the migrations registry rule.
8. **UX §7, needs explicit owner approval.** Add the `blocked-upgrade` and `stale-tab` texts beside the D-002-6 texts.
9. **Test plan §3.6.** Add the shared contract suite on both backends, the Vitest `integration` project, and the E2E mechanics of R10.
10. **specs/README.md.** Row 002 status as gates pass.

## Follow-ups recorded (not in 002 scope)

- **The first view hook** (a `useSyncExternalStore` wrapper around `Watchable`) arrives with the first consumer (004 or 005).
- **Liked songs**: how `likes` and the `system-liked` playlist relate is a 005 decision (R14).
- **Diagnostics persistence and export**: feature 013 (R6).
- **Settings read, write and validation**: feature 010 (D-002-5).
- **Quota checks, warnings, persistence request**: feature 009 (PLAT-06, SET-07).

## Complexity Tracking

No constitution violations. Nothing to justify.
