# Implementation Plan: Mock Catalog and Provider Registry

**Branch**: `003-catalog-provider` | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-catalog-provider/spec.md` (approved 2026-11-08, G1, after clarification D-003-1)

**Status**: Draft, awaiting owner approval (G3). Four choices need explicit approval: the catalog-port refinements (R2), the scan addition that also guards 002's hook (R10), the provider display name "Demo catalog" (R13), and the doc amendments below.

## Summary

Give every Phase 02 screen one place to get music metadata from, and a realistic, invented catalog to fill it. No screen is built here.

**Technical approach**
- **One door.** Application code calls `container.catalog`, typed by a new `Catalog` port. Behind it, `ProviderRegistry` orders providers (`local`, `sample`, `mock`), routes by ID prefix, applies time limits (2 s on-device, 8 s remote), handles cancellation, converts every failure to a `ProviderError`, and fans out searches (R1, R9).
- **The mock catalog.** `MockProvider` serves a committed JSON fixture made by a seeded, dependency-free generator: 12 genres, 8 moods, 40 artists, 80 albums, 600 tracks, 20 curated playlists. Names are invented, artwork is generated SVG gradients as `data:` URLs, and no track is playable (R3, R4).
- **Lazy loading.** The fixture is loaded by dynamic `import()` on the first catalog request, so the shell does not download it. That first load has 8 s; each request's 2 s limit starts after it (R5).
- **Validation.** The provider validates its source once with zod. A bad fixture gives `INVALID_RESPONSE` and a diagnostics entry. The registry converts errors but does not re-validate (R6).
- **Search, browse, paging.** Accent- and case-insensitive name matching with three ranking tiers. Browse by genre, mood or the featured list. Cursor paging (default 20, maximum 50) with fingerprinted cursors, so a foreign cursor gives `NOT_FOUND` (R7, R8).
- **Dev and test controls only (D-003-1).** Latency and per-request failure injection through `window.__CATALOG__` and `?mockFail=` / `?mockLatency=`. They exist only in `next dev` and test-hooks builds, and the branding scan proves they are absent from a normal build (R10).
- **Contract suite.** A shared `runProviderContract` checks capabilities, ID prefixes, paging, abort, invalid data and, for streaming providers, streams. The mock passes it, and five broken test providers prove each check catches its fault (R11).

## Technical Context

**Language/Version**: TypeScript 5 (strict flags as in 001), React 19.3, Node 24 LTS.

**Primary Dependencies**: Next.js 16.4.5 App Router; zod 4.6.7 (already pinned by 002, infrastructure only). **No new dependency** (R14).

**Storage**: None. The catalog is read-only, shipped with the app, held in memory once loaded. 002's store is not touched; saving catalog items stays 005's job.

**Testing**: Vitest `node` project gains `tests/contract/**/*.test.ts`. Unit tests for the fixture, search, cursors, errors and the registry (fake timers for time limits). One E2E file, `catalog.spec.ts`, on the six projects against the test-hooks build. The normal-build scan covers the new hook strings.

**Target Platform**: D4 browsers. `AbortSignal.any` is avoided because iOS Safari 17.0 to 17.3 lack it (R9).

**Project Type**: Single client-heavy web application (Next.js App Router) in `src/`.

**Performance Goals**:
- With latency off, 95% of catalog requests under 100 ms on the development machine (SC-005; reported wall-clock).
- The shell downloads no catalog data before the first catalog call (SC-007).
- A time-out fires within 250 ms of the limit (SC-006).

**Constraints**:
- No backend, no network (constitution XIII).
- Layer rules: providers and registry in infrastructure; only `container.ts` imports them; zod infrastructure only.
- Production builds carry no latency or failure injection (D-003-1).
- Deterministic tests: fixed fixture, seeded random source, fake timers, latency 0 (constitution X).

**Scale/Scope**: About 870 catalog entities and roughly 250 KB of raw JSON (40 to 60 KB compressed; measured at implementation). One port, one registry, one provider, one generator, one contract suite.

No `NEEDS CLARIFICATION` remains. The spec's open decision was D-003-1; every design unknown is resolved in [research.md](research.md) R1–R14.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | Pre-research | Post-design | Evidence |
|---|---|---|---|---|
| I | Specification-first | ✅ | ✅ | Spec approved (G1, 2026-11-08). It lists SRC-01, the registry and the contract suite. This plan awaits G3. |
| II | Music-first UX | ✅ | ✅ | No screen yet. A provider failure never fails a whole search (FR-016), and the shell is not slowed by the catalog (R5). |
| III | Four destinations | ✅ | ✅ | Navigation untouched. |
| IV | Persistent global player | ✅ | ✅ | Untouched. |
| V | Single audio engine | N/A | N/A | No audio; no mock track is playable. |
| VI | Local-first data | ✅ | ✅ | The catalog ships with the app and works offline once loaded. Nothing is stored. |
| VII | MusicProvider | ✅ | ✅ | This feature builds it: one registry, capability flags drive behaviour, IDs namespaced and opaque, and the contract suite is the merge condition. The mock passes it (S-T1). The compliance checklist (provider-contract §8) is answered for the mock in its README (invented data, no third party, zod validation, contract tests, graceful failure). |
| VIII | Strict TS, modular | ✅ | ✅ | Types in domain, ports in application, registry and provider in infrastructure, wired only in the container. The new abstractions (`Catalog`, `MusicProvider`) have real implementations and are required by the contract suite and by three later providers. No new dependency. |
| IX | Accessibility and responsive | N/A | N/A | No UI. Artwork colours are chosen to read on the dark identity (R4); judged at 004–006 with real screens. |
| X | Automated tests | ✅ | ✅ | Provider contracts are listed critical behaviour. Deterministic: fixed fixture, seeded random source, fake timers, no network. Contract suite plus meta-tests, registry oracles C-T1–C-T18, catalog oracles M-T1–M-T15, E2E in six projects. |
| XI | Privacy | ✅ | ✅ | No network, no personal data; diagnostics entries carry IDs and validation paths only. |
| XII | Licensing and branding | ✅ | ✅ | All names and artwork invented and generated in this repository; denylist test plus the existing source scan; display name "Demo catalog" (R13). No third-party asset. |
| XIII | No backend | ✅ | ✅ | None. |
| XIV | No silent scope expansion | ✅ | ✅ | No screens, no sample or local providers, no playable mock tracks, no saving. The three contract refinements (R2), the display name (R13) and the extra scan string for 002 (R10) are put to the owner. |
| XV | Docs and code consistency | ✅ | ✅ | provider-contract §2, §5, §9.1, §10, architecture §4, §5, §11, test-plan §2, §3.3 and specs/README are amended in the implementation change (below). |

**Result: PASS.** No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-catalog-provider/
├── spec.md                        # approved 2026-11-08 (G1)
├── plan.md                        # this file
├── research.md                    # R1–R14
├── data-model.md                  # catalog types, errors, ports, raw fixture, indexes, cursors, lifecycle
├── quickstart.md                  # gates and validation V1–V10
├── contracts/
│   ├── catalog-port.md            # registry rules; oracles C-T1–C-T18
│   ├── mock-catalog.md            # identity, content, semantics, controls; oracles M-T1–M-T15
│   └── provider-contract-suite.md # the shared suite and its meta-tests; oracles S-T1–S-T7
├── checklists/requirements.md
└── tasks.md                       # /speckit-tasks (not created here)
```

### Source code (repository root)

```text
src/
  domain/
    catalog.ts                                   NEW   catalog value types (types only)
    errors.ts                                    EDIT  + ProviderError, ProviderErrorCode, retryable table
  application/
    ports.ts                                     EDIT  + MusicProvider, Catalog, MockCatalogControls, StreamSource, Lyrics;
                                                       DiagnosticsEntry.kind + 'invalid-response' | 'provider-error'
    container.ts                                 EDIT  + catalog (ProviderRegistry over MockProvider);
                                                       + catalogControls (dev and test-hooks builds only)
  infrastructure/providers/
    registry.ts                                  NEW   ProviderRegistry (order, routing, init, limits, abort, errors, fan-out)
    cursors.ts                                   NEW   provider and registry cursor encode/decode
    mock/mock-provider.ts                        NEW   MockProvider (init, indexes, search, browse, get*, controls)
    mock/schema.ts                               NEW   zod schema of the raw fixture
    mock/artwork.ts                              NEW   SVG data-URL builder
    mock/search.ts                               NEW   normalisation and ranking
    mock/fixtures/catalog.json                   NEW   generated, committed
    mock/README.md                               NEW   provider-contract §8 checklist answered for the mock
  presentation/testing/
    catalog-hooks.ts                             NEW   window.__CATALOG__, ?mockFail, ?mockLatency (flag-gated)
  presentation/components/shell/AppShell.tsx     EDIT  call installCatalogHooks() in the existing mount effect
  test/fakes/
    test-providers.ts                            NEW   configurable test providers (two prefixes, never-answering, throwing)
    broken-providers.ts                          NEW   the five broken providers for the meta-tests
    SeededRandom.ts                              NEW   deterministic random source for latency tests
scripts/
  mock-catalog/generate.mjs                      NEW   generateCatalog(seed); CLI writes or --check
  mock-catalog/words.mjs                         NEW   invented word parts
  scan-branding.mjs                              EDIT  + __CATALOG__, mockFail, mockLatency, __STORAGE__
tests/
  unit/mock-catalog-fixture.test.ts              NEW   M-T1–M-T7
  unit/mock-catalog-search.test.ts               NEW   M-T8–M-T10, M-T15
  unit/mock-catalog-controls.test.ts             NEW   M-T11–M-T14
  unit/provider-error.test.ts                    NEW   retryable table
  unit/provider-registry.test.ts                 NEW   C-T1–C-T18
  contract/provider-contract.ts                  NEW   runProviderContract and the check functions
  contract/mock-provider.contract.test.ts        NEW   S-T1
  contract/broken-providers.test.ts              NEW   S-T2–S-T7
  lint/layers.test.ts                            EDIT  + a fixture proving providers cannot be imported outside container.ts
  e2e/catalog.spec.ts                            NEW   lazy chunk, search per browser, ?mockFail, first-paint figure
  e2e/fixtures.ts                                EDIT  + CatalogHooks type, waitForCatalogHooks
vitest.config.mts                                EDIT  node project includes tests/contract/**/*.test.ts
```

**Structure Decision**: The layered layout of 001 and 002 is kept. Providers go in `infrastructure/providers/` as architecture §4 already names; the generator goes in `scripts/` next to the branding scan. `catalog-hooks.ts` sits beside 002's `storage-hooks.ts`.

## Implementation phases (for `/speckit-tasks`; not executed here)

1. **Tooling.** Vitest include for `tests/contract`; the scan strings (run the scan on a normal build to confirm `__STORAGE__` is still absent, R10); the lint fixture.
2. **Domain.** `catalog.ts`, `ProviderError` with its retryable table (test-first).
3. **Ports and test providers.** `MusicProvider`, `Catalog`, `MockCatalogControls` in `ports.ts`; test and broken providers in `src/test/fakes/`.
4. **Contract suite.** The check functions and `runProviderContract`, proven first against the broken providers (S-T2–S-T7), so the suite exists before the mock.
5. **Registry.** C-T1–C-T18 test-first, with test providers and fake timers; cursors.
6. **Generator and fixture.** `generate.mjs` and its words, the committed `catalog.json`, then M-T1–M-T7. Smoke-check that a dynamically imported JSON chunk builds under Turbopack (R5 risk) before building on it.
7. **Mock provider.** Schema, artwork, search, browse, init and indexes: M-T8–M-T11, then S-T1.
8. **Controls and wiring.** `MockCatalogControls`, container wiring with the flag-gated controls, `catalog-hooks.ts`, the `AppShell` call: M-T12–M-T14.
9. **E2E.** `catalog.spec.ts` against the test-hooks build (V7, V8), six projects.
10. **Docs and gates.** The amendments below; G5–G10; the normal-build scan (V10); the owner's look at the catalog (V9: console session plus an artwork contact sheet in `review/`); `/code-review`; G13.

## Proposed doc amendments (for owner approval at G3)

Applied during implementation (phase 1 or 10), not now.

1. **provider-contract §2, needs explicit owner approval (R2).** `getPlaylist` returns the playlist with its tracks; genre and mood IDs use `<provider>:<local id>`; `SearchResult.failedProviders`; `MusicProvider.onDevice`.
2. **provider-contract §5.** Time limits keyed on `onDevice` (2 s) or remote (8 s); `init` has 8 s and the request's limit starts after it; page-size rules (R8).
3. **provider-contract §9.1.** Exact counts (R3); artwork as generated SVG `data:` URLs (R4); display name "Demo catalog" (R13, needs explicit owner approval); test controls available **only in development and test-hooks builds** (D-003-1), with the `?mockFail=<kind>[:<CODE>]` and `?mockLatency=<min>-<max>` formats; validation of the source once at load (R6).
4. **provider-contract §10.** The order is enforced by the registry; duplicate IDs refused; fan-out cursors (R8, R9).
5. **Architecture §4.** List `providers/registry.ts`, `providers/cursors.ts`, `providers/mock/*`, `presentation/testing/catalog-hooks.ts`, `scripts/mock-catalog/`.
6. **Architecture §5.** Point to `domain/catalog.ts` for the catalog shapes; note that taxonomy IDs are namespaced.
7. **Architecture §11.** `ProviderError` conversion rules (R9) beside the storage error table; the two new diagnostics kinds.
8. **Test plan §2 and §3.3.** Contract tests run in Vitest's `node` project (jsdom only when a provider needs the DOM); the suite tests the provider directly plus once through a registry; meta-tests with broken providers; the `corruptSource` input.
9. **`scripts/scan-branding.mjs` header, needs explicit owner approval (R10).** The test-hook list gains 003's strings and 002's `__STORAGE__`.
10. **specs/README.md.** Row 003 status as gates pass.

## Follow-ups recorded (not in 003 scope)

- **Mock tracks pointing at sample audio** (provider-contract §9.1 allows it): proposed with sample audio in 009.
- **User-facing error messages** (provider-contract §6 patterns): with the first screens, 004–006.
- **About's provider list** from `providers()`: 010 (SET-05).
- **A view hook over `Catalog`** (loading, error, retry state per `AsyncViewState`): with the first consuming screen (004).

## Complexity Tracking

No constitution violations. Nothing to justify.
