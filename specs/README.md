# Feature Specification Index

> **Status:** Approved index · **Created:** 2026-11-05
> **Owns:** the list of Spec Kit features, their order, the feature IDs each one covers, and the dependencies between them.
> **Supersedes:** the "Proposed Spec Kit feature breakdown" in [docs/roadmap.md](../docs/roadmap.md) (owner decision, 2026-11-05).
> **Related:** feature IDs and priorities in [product-requirements.md §5](../docs/product-requirements.md#5-features-and-priorities) · phases in [roadmap.md](../docs/roadmap.md) · principles in [constitution](../.specify/memory/constitution.md) · gates in [quality-gates.md](../docs/quality-gates.md)

Each feature gets its own directory, `specs/NNN-name/`, created with `/speckit-specify` **only when it is next in line**. Do not write specs or plans ahead of time. Numbers are sequential and follow the implementation order below.

## 1. Index

| # | Feature | Phase | Covers (feature IDs) | Depends on | Spec status |
|---|---|---|---|---|---|
| 001 | `001-app-shell` — App shell & navigation | 01 | SHELL-01, SHELL-02, SHELL-05, SET-01, SET-02 (switching and persistence only), PLAT-02 (baseline); D5 display name | — | **Approved 2026-11-05**; plan approved 2026-11-05 (G3 passed); tasks approved 2026-11-05 (G4 passed); `/speckit-analyze` fourth run 0 CRITICAL, 0 HIGH; all findings remediated by owner-approved documentation amendments (2026-11-05); implementation complete 2026-11-06; screen-reader pass (T106) Deferred by the owner 2026-11-06 to Phase 06 closed-beta preparation; visual review (T107, G11) passed on the owner's confirmation 2026-11-06; automated gates G5–G8 pass; G9 Partial; G10 automated Passed, manual SR pass Deferred; see docs/quality-gates.md; **accepted (G13, owner, 2026-11-06)** with recorded exceptions |
| 002 | `002-local-persistence` — Local persistence foundation | 02 | PLAT-01 (library storage built here; the settings area is only defined, built by 010; private-mode fallback) | 001 | **Draft 2026-11-06; resumed 2026-11-07 after 014 was accepted.** Reconciled with the O8 withdrawal of appearance settings (D-002-4); clarifications D-002-1, D-002-5 (settings area defined only) and D-002-6 (neutral "Storage is unavailable" banner) recorded; D-002-2 and the appearance half of D-002-3 are superseded. **Spec approved 2026-11-07 (G1)**; plan approved 2026-11-07 (G3); tasks approved 2026-11-07 (G4, 47 tasks; `/speckit-analyze` 0 CRITICAL, all findings remediated); **implemented 2026-11-07 (T001–T046)**: G5–G10 automated gates pass (E2E 638 passed, 0 failed, 166 skipped; branding scan OK), `/code-review` done (seven findings fixed, two as designed, one not changed); G11 banner screenshots re-captured on the final tree 2026-11-08 (live-region fix included), **accepted by the owner 2026-11-08 (G13)**; deferrals and open obligations (CI, screen-reader pass incl. the banner, 014 high-contrast check) recorded in docs/quality-gates.md |
| 003 | `003-catalog-provider` — Mock catalog & provider registry | 02 | SRC-01 (+ registry and the provider contract suite) | 001 | **Draft 2026-11-08** ([spec](003-catalog-provider/spec.md)); clarification D-003-1 recorded (mock latency and failure injection in dev and test-hooks builds only); **spec approved 2026-11-08 (G1)**; plan drafted 2026-11-08 ([plan](003-catalog-provider/plan.md), R1–R14), awaiting G3 |
| 004 | `004-explore` — Explore | 02 | EXP-01, EXP-02, EXP-03, EXP-04, EXP-05, EXP-06, EXP-07, EXP-08 | 002, 003 | Not started |
| 005 | `005-library` — Library | 02 | LIB-01, LIB-02, LIB-03, LIB-04, LIB-05, LIB-06, LIB-07, LIB-08, LIB-09 | 002, 003 | Not started |
| 006 | `006-home` — Home (mock-driven rules) | 02 | HOME-01, HOME-02, HOME-04, HOME-05ᵃ, HOME-06ᵃ, HOME-07ᵃ | 003, 005 | Not started |
| 007 | `007-audio-engine` — Audio engine, queue & playback control | 03 | NP-12, PLAT-01ᵇ (player snapshot); queue domain; play-event recording | 002, 003 | Not started |
| 008 | `008-global-player-ui` — Global player UI | 03 | NP-01, NP-02, NP-03, NP-04, NP-05, NP-06, NP-07, NP-08, NP-09, NP-10, NP-13, SHELL-04ᶜ (shortcuts), HOME-03; "Skip to player" link (deferred from 001) | 001, 007 | Not started |
| 009 | `009-local-files-storage` — Local files, sample audio & storage | 03 | SRC-02, SRC-03, LIB-10, SET-07, PLAT-06 | 002, 005, 007 | Not started |
| 010 | `010-settings-data` — Settings: playback, data & About | 02–03 | SET-03, SET-04, SET-05; restrict `/settings/<section>` (O7) | 002, 007, 009 | Not started |
| 011 | `011-personal-discovery` — Personal discovery | 04 | HOME-05ᵃ, HOME-06ᵃ, HOME-07ᵃ (history rules), HOME-08, HOME-09, EXP-09 | 006, 007 | Not started |
| 012 | `012-pwa-polish` — PWA, offline & polish | 05 | PLAT-03, PLAT-04, NP-04ᵈ (refinement), NP-11, NP-14, NP-15, SHELL-03, SHELL-04ᶜ (help dialog), LIB-11, LIB-12, SET-06 | 008, 009 | Not started |
| 013 | `013-beta-diagnostics` — Beta & diagnostics | 06 | PLAT-05 (+ beta onboarding, bug-report page) | 012 | Not started |
| 014 | `014-visual-identity` — Single permanent visual identity (replaces the theme system) | 01 (change to accepted 001 scope) | Removes SET-01 and SET-02; amends PLAT-02 colour-scheme handling, UX-AC-10, UX-AC-11; supersedes ADR-009 and open item O3 | 001 | **Context prepared 2026-11-06**; constitution v2.0.0 (IX-A1) and baseline docs updated 2026-11-07 (Abyss Copper direction); **spec approved 2026-11-07 (G1)** after clarifications D-014-1, D-014-2; plan approved 2026-11-07 (G3); tasks approved 2026-11-07 (G4, 38 tasks); **implemented 2026-11-07 (38 tasks)** and **accepted (G13, owner, 2026-11-07)** with recorded exceptions: automated gates G5–G10 pass (E2E 566 passed, 0 failed, 166 skipped; branding scan OK), G11 recorded on the owner's acceptance, `/code-review` done (one fix, follow-ups proposed); real Windows High Contrast check **Deferred** to Phase 06 closed-beta preparation (D-014-2); CI not run, no waiver for 014 (open obligation); see docs/quality-gates.md. **Implemented before 002 resumes** (out of numeric order, see O8) |

**Intentional splits.** A few IDs appear in two features because the approved roadmap delivers them in stages:
- ᵃ HOME-05/06/07 ship first with mock rules (006, Phase 02). The history-based rules arrive in 011 (Phase 04).
- ᵇ PLAT-01 is split between the library and settings stores (002) and the player snapshot (007).
- ᶜ SHELL-04 shortcuts are P0 (008). The help dialog is P1 (012).
- ᵈ NP-04 is delivered in 008. 012 refines it.

**Unscheduled (P2):** SRC-04, EXP-10, LIB-13, NP-16, NP-17, plus sync, a backend and Android. These are not specified until the owner records a decision after Phase 06.

## 2. Dependency map

```mermaid
graph LR
  F001[001 app-shell] --> F002[002 local-persistence]
  F001 --> F003[003 catalog-provider]
  F002 --> F004[004 explore]
  F003 --> F004
  F002 --> F005[005 library]
  F003 --> F005
  F003 --> F006[006 home]
  F005 --> F006
  F002 --> F007[007 audio-engine]
  F003 --> F007
  F001 --> F008[008 global-player-ui]
  F007 --> F008
  F002 --> F009[009 local-files-storage]
  F005 --> F009
  F007 --> F009
  F002 --> F010[010 settings-data]
  F007 --> F010
  F009 --> F010
  F006 --> F011[011 personal-discovery]
  F007 --> F011
  F008 --> F012[012 pwa-polish]
  F009 --> F012
  F012 --> F013[013 beta-diagnostics]
```

**Why this order (changes to the proposed 9-feature list):**
- **Local Persistence moves up to 002.** Explore (recent searches), Library and Home all store data locally.
- **Mock catalog & provider registry is added as 003.** Explore, Library and Home all read the catalog through the provider contract. It was missing from the proposed list.
- **Explore and Library come before Home.** Quick Access needs Liked Songs and playlists (LIB-01/02), so Home is built after them.
- **Audio Engine (007) comes before Global Player UI (008).** The UI only observes the single engine (constitution IV, V).
- **Local files, sample audio and storage are added as 009.** These are SRC-02/03, LIB-10, SET-07 and PLAT-06 (D2/D3). They were missing from the proposed list.
- **Settings is split.**
  - Theme and accent shipped in 001; withdrawn by O8 and removed by 014.
  - Playback preferences, backup and About ship in 010, after their dependencies exist.
  - Storage ships in 009.
  - Reduced-motion override ships in 012.
- **012 and 013 carry the Phase 05–06 roadmap scope.**
- **Phase 02 parallelism.** After 002 and 003, the 004 and 005 specs can be planned in parallel. They are implemented one at a time.

## 3. Consistency notes (2026-11-05 check)

This index, the constitution, `AGENTS.md`, `docs/quality-gates.md` and `specs/001-app-shell/spec.md` were checked against the 8 baseline docs.

- **Information architecture.** Four destinations, with Now Playing as global UI state. This matches PRD §4, UX §2–3, architecture §8 and constitution III–IV. ✅
- **Source policy and branding.** The constitution's source and branding rules (XII) match PRD §6 and D5, the provider contract §8 and the audit §11–12. ✅
- **Decisions D1–D5.** The constitution and AGENTS.md respect them: no backend, local storage, CC0/CC BY samples only, D4 browsers, the display-name constant. ✅
- **Feature-ID coverage.** All 71 PRD §5 IDs were checked by script:
  - every P0/P1 ID is in the index;
  - duplicates appear only for the documented splits (ᵃ–ᵈ);
  - every P2 ID is listed as unscheduled. ✅
- **UX-AC in 001.** UX-AC-05, -07, -09, -10, -11 and -25 match roadmap Phase 01 acceptance (UX-AC-05 and -07 at shell scope). ✅
- **Spec 001 contains no implementation detail.** A grep for framework, storage and test-tool names returned nothing. Tooling and strict-tsconfig work is left to the 001 plan. ✅
- **Deviations from the roadmap, approved by the owner:**
  - feature order and naming (this file);
  - SET-05 timing (O1);
  - LIB-09 placement (O2).

## 4. Open items found during SDD initialization

| # | Item | Proposed handling |
|---|---|---|
| O1 | SET-05 (About) is Phase 02 in the roadmap, but here it ships with 010 (Phase 02–03). | Accept the slip, or split an "About" slice out of 010 when 010 is specified. |
| O2 | LIB-09 timing is ambiguous. Roadmap Phase 02 accepts UX-AC-23 "without keyboard reorder", while Phase 03 lists LIB-09 "pointer and keyboard". | Placed in 005. Resolve in `/speckit-clarify` for 005: pointer only in 005, keyboard later; or both in 005. |
| O3 | UX-AC-10 requires theme persistence in 001, before the local database exists (002). | A 001 plan decision (ADR-009 pre-paint mirror). 002 then makes the database authoritative. **Superseded by O8 (2026-11-07):** no appearance setting remains; ADR-011 replaces ADR-009. |
| O4 | The doc status labels disagree: the PRD says "final", the others say "draft". The ADR table lists ADR-010 before ADR-007. | Cosmetic. Not edited; for the owner to tidy. |
| O5 | The Spec Kit git-branch hook is not installed, so specs are not created on feature branches. | Optional: `git switch -c 001-app-shell` before planning. |
| O6 | Spec Kit has no `review` command. | Review = the owner's review plus `/code-review` on the feature diff (see `AGENTS.md`). |
| O7 | Owner decision D-001-2 (2026-11-05): `/settings/<section>` accepts any single segment during MVP. | **Required follow-up.** When Settings sections are implemented, restrict the pattern to those sections; every other segment shows Not Found. The 010 spec must include this as a requirement, and 009 must too if it adds the Storage section's deep link. |
| O8 | Owner decision 2026-11-06: remove the theme and accent customization system (SET-01, SET-02) and use one permanent, carefully designed dark visual identity. | Specified as **014**, the next unreserved ID (003–013 stay reserved, so accepted 001 artifacts and their cross-references are not renumbered). 014 is implemented **before** 002 resumes. Prerequisites: a constitution amendment (Principle IX: "colour-scheme preferences MUST be honoured") and baseline-doc updates (PRD SET-01/02, UX Appearance and UX-AC-10/11, design-system themes and accents, roadmap Phase 01, architecture ADR-009). 001's artifacts stay unchanged as historical evidence; 014 records what changes. **Done 2026-11-07:** constitution v2.0.0 (IX-A1); baseline docs updated with owner decisions K1–K4: visual direction **Abyss Copper** (`#101B23`, `#182731`, accent Muted Copper `#D8AD88`, text `#E8EDF0` / `#A9B9C1`; remaining tokens derived in the 014 plan), SET-01/02 **Withdrawn** (IDs kept), Settings Appearance removed and SET-06 moved to Accessibility. |
