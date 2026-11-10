# Quickstart and validation: Mock Catalog and Provider Registry (003)

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

## 1. Prerequisites

- `main` with 001, 014 and 002 merged; Node 24 LTS; `pnpm install` (no new packages in 003).
- No network is needed at any step.

## 2. Gates (run in this order)

| Gate | Command | Expected |
|---|---|---|
| G5 | `pnpm typecheck` | exit 0 |
| G6 | `pnpm lint` | exit 0, including the layer tests (no provider or registry import outside `container.ts`; zod only in infrastructure) |
| G7/G8 | `pnpm test:coverage` | all pass, including `tests/unit/*catalog*`, `tests/unit/provider-registry.test.ts`, `tests/contract/**`; `src/domain/**` ≥ 90% lines and branches |
| Build (hooks) | `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` | exit 0 |
| G9/G10 | `pnpm test:e2e` | all six projects pass, including `catalog.spec.ts`; earlier suites unchanged |
| Branding | `pnpm build`, then `pnpm scan:branding` | OK; none of `__CATALOG__`, `mockFail`, `mockLatency`, `__STORAGE__` in compiled files |

## 3. Validation scenarios

| # | Scenario | How | Expected | Spec |
|---|---|---|---|---|
| V1 | Determinism | `node scripts/mock-catalog/generate.mjs --check` (compares without writing), and the M-T2 test | identical | SC-001 |
| V2 | Integrity and branding of content | M-T1, M-T3, M-T4 | all pass | SC-002 |
| V3 | Contract | `pnpm vitest run tests/contract` | S-T1 passes; S-T2 to S-T7 show the named check failing | SC-003 |
| V4 | Paging completeness | M-T9 | 0 duplicates, 0 omissions | SC-004 |
| V5 | Speed with latency off | M-T15 | 95% under 100 ms; figure and machine recorded (wall-clock, not proof) | SC-005 |
| V6 | Time limit and abort | C-T8, C-T9, M-T13 | `TIMEOUT` at the limit, `ABORTED` with no late result | SC-006 |
| V7 | Shell not slowed | E2E: no request for the catalog chunk before the first catalog call; first-paint time reported against the 002 run | no catalog request; figure recorded | SC-007 |
| V8 | Every injectable error reaches the caller | M-T12 and E2E `?mockFail=search` | each code as injected; browse still works | SC-008 |
| V9 | Owner can judge the catalog | in `next dev`, open the browser console on any page and run `await __CATALOG__.catalog.search({ text: 'night', types: ['track','album','artist','playlist'] })`, `await __CATALOG__.catalog.listGenres()`, `await __CATALOG__.catalog.browse({ kind: 'featured' })`; plus a generated contact sheet of 24 album artworks in `specs/003-catalog-provider/review/` | names read as plausible and invented, artwork varied, genres and moods spread | SC-009 |
| V10 | Production build has no controls | `pnpm build` then `pnpm scan:branding` | OK | D-003-1 |

## 4. Manual check in development

`pnpm dev`, then in the console: `__CATALOG__.setLatency(1000, 1500)`, run a search, and see it wait; `__CATALOG__.fail('search', 'RATE_LIMITED')` and see the rejection's `code`; `__CATALOG__.clear()`. Or load `/?mockFail=search:TIMEOUT` and see a search reject with `TIMEOUT` after 2 s.
