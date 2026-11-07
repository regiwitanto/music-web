# Quickstart: Validating 002 (Local Persistence Foundation)

**Feature**: [spec.md](spec.md) · **Contracts**: [storage-ports.md](contracts/storage-ports.md), [storage-status.md](contracts/storage-status.md) · **Data model**: [data-model.md](data-model.md)

## 1. Prerequisites

- Node 24 LTS, pnpm, `pnpm install` (adds `dexie`, `zod`, `fake-indexeddb` at the pinned versions of research R12).
- Playwright browsers installed.
- E2E runs against a test-hooks build: `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` (001 quickstart §2).

## 2. Automated gates

| Gate | Command | Expected |
|---|---|---|
| G5 | `pnpm typecheck` | 0 errors |
| G6 | `pnpm lint` | 0 errors; layer rules: Dexie and zod only in `src/infrastructure/`, presentation never imports them |
| G7/G8 | `pnpm test` / `pnpm test:coverage` | All pass, including the new `integration` project (contract suite on both backends, lifecycle, migrations harness); `domain/` ≥ 90% |
| G9/G10 | `pnpm test:e2e` | All six projects pass `persistence.spec.ts` and the existing suites; axe clean with the banner shown |
| Branding | `pnpm build` then `pnpm scan:branding` | OK (the test hooks are absent from the normal build) |

Results are reported exactly as they ran; anything not executed is **not run**. The 1 s budgets are wall-clock measurements taken in the browser: they are reported with their measured values, are not fully deterministic, and a generous Playwright timeout is never counted as meeting them.

## 3. Validation scenarios

| # | Scenario | How | Expected |
|---|---|---|---|
| V1 | Every repository works the same on both backends | `tests/integration/memory-storage.test.ts`, `tests/integration/dexie-storage.test.ts` (shared suite `storage-contract.ts`) | P-T1 to P-T6 pass for `MemoryStorage` and `DexieStorage` |
| V2 | Schema version 1 declares every area | `tests/integration/schema.test.ts` | P-T7 (D-002-1, D-002-5) |
| V3 | Errors map to the three kinds | `tests/unit/storage-errors.test.ts` | P-T8 |
| V4 | Upgrades keep data; destructive upgrades are refused | `tests/integration/migrations.test.ts`, `tests/unit/migrations-registry.test.ts` | Test-only v2 keeps every v1 record; a `destructive: true` entry fails the guard (FR-020, FR-021) |
| V5 | Other tab and newer data | `tests/integration/storage-lifecycle.test.ts` | B-T8; `VersionError` leaves the data untouched and switches to memory (FR-022, FR-023) |
| V6 | Saved data survives reload and restart | `persistence.spec.ts`: seed one record of every kind through `window.__STORAGE__`, reload, read back; then `storageState({ indexedDB: true })` into a new context and read back | 100% identical (SC-001), six projects |
| V7 | Two tabs | `persistence.spec.ts`: two pages; B's subscription active first; `likes.add` in A | Functional: B receives the like. Performance (separate): B's receipt stamp minus A's start stamp < 1000 ms, in-browser timestamps, reported with the measured value (SC-006, FR-014; research R10) |
| V8 | Store unavailable | `persistence.spec.ts` with `indexedDB` removed | B-T4: functional banner and destinations; separately, banner insertion < 1000 ms from navigation start, measured in the page (SC-003) |
| V9 | Newer data | `persistence.spec.ts` with `mp-library` pre-created at a higher version | B-T5 (FR-023) |
| V10 | Shell never waits for the store | `persistence.spec.ts` with `indexedDB.open` delayed forever | B-T6 (SC-007) |
| V11 | Banner accessibility | `tests/component/StorageBanner.test.tsx`, axe in E2E | B-T1 to B-T3, B-T7 |
| V12 | Nothing else regressed | full `pnpm test` and `pnpm test:e2e` | Every 001 and 014 test still passes (G12) |

## 4. Manual check (optional, owner)

Open the app in a private window of each browser you use. If storage is unavailable there, the banner reads "Storage is unavailable: your changes won't be saved." on every page and nothing breaks. Some browsers allow IndexedDB in private windows; then no banner appears, which is also correct.
