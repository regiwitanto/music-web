# Development Roadmap

> **Status:** Phase 00 draft · **Last reviewed:** 2026-11-05 · **Amended:** 2026-11-07 (O8: one permanent dark visual identity; SET-01 and SET-02 withdrawn)
> **Owns:** phase sequencing, the scope of each phase (by feature ID), deliverables, dependencies, acceptance criteria, Definition of Done, risks, and the proposed Spec Kit feature breakdown.
> **Related:** feature IDs and priorities in [product-requirements.md §5](product-requirements.md#5-features-and-priorities) · UX criteria (UX-AC-xx) in [ux-specification.md §9](ux-specification.md#9-measurable-ux-acceptance-criteria) · test approach in [testing/test-plan.md](testing/test-plan.md)

The roadmap has no calendar dates. The pace is personal, so each phase ends at its gate, not on a date.

## Global Definition of Done (applies to every phase from 01 on)

- `pnpm lint`, `pnpm typecheck` (`tsc --noEmit`) and `pnpm test` pass locally, and in CI once it is set up in Phase 01.
- New domain and application logic has unit tests. Each new user flow has at least one E2E test, or a recorded manual script when E2E isn't practical.
- axe reports no serious or critical issues on any touched page.
- The touched UX-AC criteria are verified, and the results are recorded in the feature's spec or PR. **Never claim tests passed unless they actually ran.**
- Docs are updated whenever a decision, ID or contract changes.
- No new dependency is added without a justification line in [architecture.md §2](architecture.md#2-technology-stack-evaluation).

---

## Phase 00 — Research & Foundation *(this phase)*

| | |
|---|---|
| **Objectives** | Understand the reference app. Fix the product scope, information architecture, architecture and source policy before writing any code. |
| **Scope** | Documentation only. No feature specs and no app code. (Spec Kit was installed during this phase; SDD initialization — constitution, feature index, first spec — followed on 2026-11-05.) |
| **Deliverables** | The 8 documents in `docs/`. Decisions D1–D5, approved 2026-11-05 ([product-requirements.md §9](product-requirements.md#9-decisions-approved-by-the-owner-2026-11-05)). |
| **Dependencies** | None. |
| **Acceptance criteria** | All 8 docs exist and link to each other. Every feature has an ID and a priority. Each phase has a gate. Audit findings are tagged Confirmed or Inferred. No contradictions on the 4-destination IA or the source policy. |
| **Definition of Done** | ✅ The owner reviewed the docs and approved D1–D5 (2026-11-05). The docs reflect those decisions. |
| **Risks** | Over-specifying before validating the UX. *Mitigation:* the UX-AC criteria are measurable, but layouts may still change during Phases 01–02. |

## Phase 01 — Design System & App Shell

| | |
|---|---|
| **Objectives** | Tooling, tokens and a responsive shell with the 4 destinations, before any real features. |
| **Scope** | SHELL-01, SHELL-02, SHELL-05; SET-01 and SET-02 (theme and accent switching only; shipped in 001, **withdrawn** by O8 on 2026-11-06 and removed by 014, which replaces them with one permanent dark visual identity); PLAT-02 baseline; the design-system tokens and base components. |
| **Deliverables** | Constitution (via Spec Kit). Tooling: Vitest, RTL, Playwright, ESLint layer rules, CI workflow. Tokens in `globals.css`. shadcn setup. Sidebar, BottomNav, an empty PlayerBar placeholder, and placeholder pages for the 4 destinations. Theme bootstrap with no flash (ADR-009; superseded by ADR-011, the identity is static CSS). Folder layout ([architecture.md §4](architecture.md#4-folder-layout)). The `APP_DISPLAY_NAME` constant, used in `<title>` and metadata (ADR-010), replaces the scaffold's "Create Next App" metadata. A standard `next build` with **no** `output: 'export'` (D1). |
| **Dependencies** | Phase 00 sign-off. |
| **Acceptance criteria** | UX-AC-05 (shell only), UX-AC-07 (shell), UX-AC-09, UX-AC-10, UX-AC-11 (UX-AC-10 and -11 amended 2026-11-07 for 014), UX-AC-25 (branding scan in CI). Lint rules block `domain/` from importing React or Dexie. |
| **Definition of Done** | Global DoD, plus a Playwright smoke test that navigates all 4 destinations in Chromium, Firefox and WebKit at mobile and desktop widths. |
| **Risks** | Next 16 API differences. *Mitigation:* read the bundled docs first. shadcn and Tailwind v4 integration friction. *Mitigation:* pin versions and add components one at a time. |

## Phase 02 — Core UI & Navigation (mock data)

| | |
|---|---|
| **Objectives** | Every screen built with the mock provider, every state visible, with no real audio yet. |
| **Scope** | SRC-01 (MockProvider and fixtures); ProviderRegistry; HOME-01, -02, -04 to -07 (mock-driven, with empty history); EXP-01 to EXP-08; LIB-01 to -08 *UI* running on Dexie (likes, playlists, library items, recent searches); SET-05; context menus; toasts; loading, empty and error states. |
| **Deliverables** | Home, Explore (search, filters, genre, mood, artist, album), Library (types, sort, filter, search, playlist CRUD), Settings (About). Dexie schema v1 (all tables). Mock fixture generator script. |
| **Dependencies** | Phase 01. |
| **Acceptance criteria** | UX-AC-14, UX-AC-15, UX-AC-22, UX-AC-23 (without keyboard reorder); UX-AC-12 for library data; mock failure injection shows every error state. |
| **Definition of Done** | Global DoD. Provider contract tests pass against MockProvider. |
| **Risks** | Fixtures don't feel realistic, so Home and Explore can't be judged well. *Mitigation:* a reasonably sized catalog and generated artwork. Scope creep into recommendation logic. *Mitigation:* use mock rules only until Phase 04. |

## Phase 03 — Playback & Local Data

| | |
|---|---|
| **Objectives** | Reliable playback of local and sample audio, with a correct queue, a persistent player and OS media controls. |
| **Scope** | SRC-02, SRC-03; LIB-09 (pointer and keyboard), LIB-10; NP-01 to NP-10, NP-12, NP-13; SHELL-04 shortcuts; SET-03; SET-04 (export, import, reset); **SET-07 storage management and PLAT-06 quota handling** (D2); PLAT-01 (player snapshot); HOME-03 Continue Listening; recording play events. |
| **Deliverables** | `AudioEngine` (Html and Fake), `PlaybackController`, the domain queue module plus property tests, the MediaSession adapter, capability detection, local import (`music-metadata`) into IndexedDB/Dexie, the storage use case plus the Storage settings screen ([architecture.md §12.1](architecture.md#121-storage-quota-handling)), generated test-tone fixtures, mini player, expanded player, queue panel and tab, backup round-trip. **Sample audio:** the first vetted CC0 / CC BY tracks, plus `LICENSES.json` and the license-manifest test ([provider-contract.md §9.3](provider-contract.md#93-sampleprovider-sample--src-03)). Each track is downloaded only after it passes the vetting checklist. |
| **Dependencies** | Phase 02 (screens, Dexie). D2 and D3 are approved; sample tracks still need per-track vetting by the owner. |
| **Acceptance criteria** | UX-AC-01 to UX-AC-04, UX-AC-06, UX-AC-08, UX-AC-13, UX-AC-16 to UX-AC-20, UX-AC-23 (keyboard reorder), UX-AC-24. |
| **Definition of Done** | Global DoD. The manual audio and storage matrix ([testing/test-plan.md §6](testing/test-plan.md#6-browser-audio-limitations-matrix)) has been run on real browsers covering the D4 targets: desktop Chrome, Edge, Firefox and Safari, an iPhone with iOS Safari 17+, and an Android Chrome phone. Results are recorded with versions. |
| **Risks** | iOS background audio and Media Session gaps. Storage quota limits and eviction for large local libraries. Codec differences, especially WebKit on Linux in CI. Not enough verifiable CC0 / CC BY samples (A4). *Mitigation:* MP3 samples, real-device checks, quota handling with clear messages, and hiding the sample action when no samples exist. |

## Phase 04 — Discovery & Personalization

| | |
|---|---|
| **Objectives** | Home sections driven by real listening history, using deterministic rules. |
| **Scope** | HOME-05, HOME-06 and HOME-07 switch from mock rules to history-based ones ([architecture.md §6](architecture.md#6-recommendation-rules)); HOME-08 (P1); HOME-09 (P1); EXP-09 suggestions (P1). |
| **Deliverables** | The `domain/recommendations` module with unit tests, play-event pruning, cold-start fallbacks, and a debug view (dev only) that shows why an item was recommended. |
| **Dependencies** | Phase 03 (play events). |
| **Acceptance criteria** | Rules are deterministic for given inputs and seed (unit tests). Cold start shows the mock fallback. Recommendations never include tracks that cannot be played unless they are labelled "Preview only". Computing Home takes ≤ 50 ms for 10k play events (benchmark test). |
| **Definition of Done** | Global DoD. |
| **Risks** | A small catalog makes the rules look repetitive. *Mitigation:* per-artist caps and rotating by date seed. |

## Phase 05 — UX Polishing & PWA

| | |
|---|---|
| **Objectives** | A polished, installable experience whose shell works offline. Close the accessibility and performance gaps. |
| **Scope** | NP-04 refinement, NP-15, NP-11 (LRC lyrics), NP-14 sleep timer, SHELL-03, SHELL-04 help dialog, LIB-11, LIB-12, SET-06, PLAT-03, PLAT-04, motion polish, gesture polish (swipe to skip in the mini player). |
| **Deliverables** | `app/manifest.ts` (name and short name from `APP_DISPLAY_NAME`; original icons with no third-party branding), icons, a service worker that caches the app shell (following the bundled `progressive-web-apps.md`), an offline banner, the artwork colour sampler, the lyrics panel, and a performance pass. |
| **Dependencies** | Phase 03. Phase 04 is preferred but not required. |
| **Acceptance criteria** | UX-AC-21 (performance budgets). Lighthouse PWA installability passes. The shell loads offline and local tracks play offline. All UX-AC from earlier phases still pass (regression). |
| **Definition of Done** | Global DoD, plus a full regression run. |
| **Risks** | Service-worker caching bugs serve a stale app. *Mitigation:* versioned caches, an "Update available" prompt, and a kill switch. |

## Phase 06 — Closed Beta & Stabilization

| | |
|---|---|
| **Objectives** | Validate with 3–10 friends, fix the issues found, and stabilize. |
| **Scope** | PLAT-05 diagnostics export, a beta onboarding note, a feedback channel, bug fixes, and P1 items reprioritized from feedback. No new P2 features. |
| **Deliverables** | Beta deployment with a standard `next build` on Vercel or a Node host (D1), a "How to report a bug" page in About, the triage process (P0/P1/P2 bug labels), and the release notes. |
| **Dependencies** | Phases 03 and 05. A public display name is optional: the neutral placeholder is acceptable for the beta (D5), but "Metrolist Web Reimagined" must never be used. Every manual verification deferred under [quality-gates §1](quality-gates.md#deferral-of-manual-verifications) is done and recorded before the beta deployment, including the 001 screen-reader pass (T106, deferred 2026-11-06). A failure found there is triaged as P0 if it blocks a P0 flow (constitution IX). |
| **Entry gate** | All P0 features are done. Zero open P0 bugs. Every P0 UX-AC passes. The owner has used it for 14 days without data loss. |
| **Acceptance criteria** | Every beta-reported crash or data-loss bug is either fixed or has a documented workaround. The manual beta checklist ([testing/test-plan.md §8](testing/test-plan.md#8-manual-beta-checklist)) is run on each tester's browser and device combination. |
| **Definition of Done** | Two consecutive weeks with no new P0 or P1 bugs. A decision is recorded on what follows: P2 (compliant provider, sync and backend, Android) and, per D6, the outcome of the YouTube Music feasibility study ([Long-term direction](#long-term-direction-d6)). |
| **Risks** | Testers expect streaming of a mainstream catalog. *Mitigation:* explain the scope clearly at onboarding. Device diversity. *Mitigation:* the diagnostics export. |

---

## Long-term direction (D6)

*Recorded 2026-11-05 as owner decision D6 ([product-requirements.md §9](product-requirements.md#9-decisions-approved-by-the-owner-2026-11-05)).*

**Goal.** In the long term, the product becomes a **hybrid offline music player and YouTube Music client**, comparable in scope to Metrolist. The offline player is what Phases 01–06 build. The YouTube Music client part is future work.

**What does not change now**
- The local-first MVP, phases 01–06, the feature order in [specs/README.md](../specs/README.md) and the current scope of every feature stay as they are.
- No YouTube or YouTube Music code, provider, dependency, proxy or experiment is added.
- The following remain binding until they are explicitly amended:
  - constitution principles XII (authorized sources) and XIII (no backend);
  - product-requirements §6 (music-source policy);
  - ADR-007;
  - the `AGENTS.md` "Never" list;
  - the decision in metrolist-audit §12.
- The public-facing UI still must not use "Metrolist", "YouTube" or other third-party names (D5, XII).

**Required first step: the YouTube Music feasibility study (research only)**
- **Form.** A written report in `docs/` that the owner reviews. It produces **no code**, prototypes against private endpoints, or network calls to YouTube services.
- **Timing.** It can start early, in parallel with the MVP phases, because it is documentation only. Implementation cannot start until the study is complete and the decisions below are recorded.
- **Questions it must answer:**
  1. **Platform policy.** What do the YouTube Terms of Service and the YouTube API Services terms and policies permit for a third-party web or PWA music client? For example: audio-only or background playback, separating audio from video, caching or offline storage, ads, and use of a logged-in user's account.
  2. **Official access paths.** Does any official, documented API or embed exist that gives access to the YouTube Music catalog, library or playback? What are its capabilities, quotas, approval or audit process and limits? Which of the product's wanted features would it fail to support?
  3. **Technical feasibility in a browser.** What does each path need in terms of CORS, authentication (OAuth scopes versus cookies), DRM or signed streams, region and age restrictions, and reliability? Would it need a server component (constitution XIII, ADR-001)?
  4. **Risk.** What are the legal, account-suspension, breakage, maintenance and beta-tester exposure risks of each path? The study builds on metrolist-audit §12, which found the unofficial InnerTube approach high-risk.
  5. **Compliance fit.** Can any path pass the provider compliance checklist ([provider-contract.md §8](provider-contract.md#8-compliance-checklist-for-new-providers)) as a `MusicProvider`?
  6. **Recommendation.** Go, no-go, or a narrower compliant alternative, with the doc and constitution changes each option would need.
- **Gate after the study.** The owner records a decision.
  - **Any "go"** requires, before any spec is written:
    - a constitution amendment via `/speckit-constitution` (a principle redefinition is a MAJOR version);
    - a new ADR superseding or amending ADR-007 (and ADR-001 if a backend is needed);
    - updates to product-requirements §6 and the `AGENTS.md` prohibitions.

    Only then can a Spec Kit feature be specified.
  - **A "no-go"** keeps the current policy, and D6 is revised.

**Note.** Integrations that use stream extraction, signature deciphering, token minting, client impersonation, ad removal, or DRM or region bypass are prohibited by the current constitution (XII). The study must judge every candidate path against those rules, not assume an exception.

---

## Priority matrix by phase

| Priority | Ph 01 | Ph 02 | Ph 03 | Ph 04 | Ph 05 | Ph 06 |
|---|---|---|---|---|---|---|
| **P0** | SHELL-01/02/05, PLAT-02; SET-01/02 withdrawn (O8), replaced by the 014 visual identity | SRC-01, HOME-01/02/04–07 (mock), EXP-01–08, LIB-01–08, SET-05 | SRC-02/03, LIB-09/10, NP-01–10/12/13, SHELL-04, SET-03/04/07, PLAT-01/06, HOME-03 | HOME-05–07 (history rules) | — | Fixes |
| **P1** | — | — | — | HOME-08/09, EXP-09 | NP-11/14/15, SHELL-03, LIB-11/12, SET-06, PLAT-03/04, SHELL-04 help | PLAT-05, items reprioritized from feedback |
| **P2** | — | — | — | — | — | Not scheduled: SRC-04, EXP-10, LIB-13, NP-16/17, sync, Android |

## Spec Kit feature breakdown

> **Superseded on 2026-11-05** by the owner-approved feature index in [specs/README.md](../specs/README.md). That file now owns the feature list, its order, the feature-ID mapping and the dependencies. The earlier 13-name proposal is kept in git history.

The constitution has been ratified: [.specify/memory/constitution.md](../.specify/memory/constitution.md) (v1.0.0).
