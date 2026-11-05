<!--
Sync Impact Report
- Version change: (unratified template) → 1.0.0
- Modified principles: all template placeholders replaced (5 placeholder slots → 15 principles)
- Added sections: Core Principles I–XV; Platform & Source Constraints;
  Development Workflow & Quality Gates; Governance
- Removed sections: none
- Templates requiring updates: none — plan-template.md's "Constitution Check" reads this file
  at runtime; spec/tasks/checklist templates are unaffected ✅
- Deferred TODOs: none
-->

# Metrolist Web Reimagined Constitution

"Metrolist Web Reimagined" is an internal working title. It MUST NOT appear in any public-facing
surface (see Principle XII and D5 in `docs/product-requirements.md`).

## Core Principles

### I. Specification-First Development

- Every feature MUST have an approved specification in `specs/NNN-*/spec.md` before a plan is
  written, and an approved plan before tasks are generated or code is written.
- A specification describes WHAT and WHY. HOW belongs in the feature plan.
- Every specification MUST list the feature IDs (from `docs/product-requirements.md` §5) and the
  UX acceptance criteria (UX-AC-xx) it covers.

*Rationale:* Fixed, reviewable intent keeps a solo developer and AI agents aligned and stops
rework.

### II. Music-First UX

- Playback MUST NOT be interrupted by navigation, panel or dialog changes, or errors in a page.
- Loading, buffering, empty, error and preview-only states MUST always be shown explicitly.
- Navigation and Home section order MUST stay fixed and predictable. Novelty never outranks
  predictability.

*Rationale:* The product exists to play music reliably; everything else is in service of that.

### III. Exactly Four Primary Destinations

- The app MUST have exactly four primary navigation destinations, in this order: **Home, Explore,
  Library, Settings**.
- Desktop and tablet use a sidebar. Mobile uses a bottom navigation bar.
- Secondary routes nest under one of the four destinations and keep it marked active.
- Adding, removing, renaming or reordering a destination requires a recorded product decision and
  a constitution amendment.

*Rationale:* A small, stable top level builds muscle memory (lesson from the reference audit).

### IV. Persistent Global Player

- Now Playing is global UI state, never a navigation destination or route.
- The player dock (mini player / player bar) and the expanded player MUST be owned by the
  persistent application shell, so they never unmount on route changes.
- Every player surface MUST reflect one shared playback state. No surface may show conflicting
  state.

*Rationale:* Players owned by individual pages break continuity and drift out of sync.

### V. Single Active Audio Engine

- At most one audio output element/engine instance may exist for the lifetime of the page. It is
  created outside the UI component tree and never re-created.
- Exactly one controller connects the engine to application state. UI code MUST NOT talk to the
  audio element or OS media APIs directly.
- Playback MUST NOT start without a user gesture, including after a reload.

*Rationale:* Two engines mean overlapping audio, races and untestable behaviour.

### VI. Local-First Data

- The library, settings, history and player state MUST be stored on the user's device, and the app
  MUST work fully offline from that data.
- Users MUST be able to export their data in a versioned, documented format, import it back, and
  reset it.
- Any schema change that can destroy data MUST offer an export first.

*Rationale:* There are no accounts. The user's data is theirs and lives with them.

### VII. Independent MusicProvider Abstraction

- All catalog metadata and audio sources MUST go through the `MusicProvider` contract
  (`docs/provider-contract.md`) and its registry.
- UI decides behaviour from capability flags, never from provider identity.
- Entity IDs are namespaced by provider and opaque outside the registry.
- A new provider is merged only after it passes the contract test suite and the compliance
  checklist.

*Rationale:* New compliant sources can be added without touching screens.

### VIII. Strict TypeScript and Modular Architecture

- TypeScript MUST run in strict mode. Disabling type checks (`any`, `@ts-ignore`,
  `@ts-expect-error` without a reason) requires a justification comment.
- The layer rules in `docs/architecture.md` §3 (presentation → application → domain;
  infrastructure behind interfaces) MUST be enforced by lint rules, not only by convention.
- The domain layer MUST stay pure: no UI framework, storage or browser globals.
- New abstractions need a second implementation or a test that requires them. New dependencies
  need a justification line in `docs/architecture.md` §2.

*Rationale:* Small, typed modules stay testable; the reference app's multi-thousand-line files
show the alternative.

### IX. Accessibility and Responsive Design

- The app MUST meet WCAG 2.2 AA. Every P0 flow MUST be completable with a keyboard only and with
  a screen reader.
- Layouts MUST work from 320 px to wide desktop without horizontal page scroll, and no content may
  be hidden behind the player or navigation.
- The user's system reduced-motion and colour-scheme preferences MUST be honoured.
- Accessibility regressions block merge on the same terms as functional regressions.

*Rationale:* Accessibility is a P0 product goal (G4), not polish.

### X. Automated Testing of Critical Behaviour

- Critical behaviour MUST have automated tests: queue rules, playback state machine, persistence
  and backup round-trip, provider contracts, navigation continuity, theming and accessibility
  scans.
- Tests MUST be deterministic (injected clock and RNG, fixed fixtures, no real network).
- Test audio MUST be generated at test time. No third-party audio is committed for tests.
- Results MUST be reported exactly as they ran. A test that did not run is "not run", never
  "passed".

*Rationale:* Unverified claims are the most expensive defects in AI-assisted development.

### XI. Privacy by Default

- No analytics, telemetry, tracking, third-party scripts or remote logging without an approved
  decision.
- User data MUST NOT leave the device except through an explicit user action (such as exporting
  a backup or a diagnostics file).
- No secrets may be shipped in client code.

*Rationale:* "All data stays in this browser" is a product promise.

### XII. Licensing and Authorized Music Sources

- Audio MUST come only from user-owned files, bundled tracks licensed CC0 or CC BY (vetted, with
  attribution recorded), or sources whose terms explicitly permit third-party playback.
- Unofficial YouTube or YouTube Music access, stream extraction, signature deciphering, token
  minting, ad removal, unauthorized downloading, DRM or region bypass, and client impersonation
  are prohibited.
- Code, schemas, strings, icons or assets from the reference repository (GPL-3.0) or any other
  product MUST NOT be copied without a recorded license review.
- No third-party brand names, logos or trade dress may appear in public-facing surfaces. The
  public name comes from one display-name constant.

*Rationale:* Legal exposure and breakage risk; see `docs/metrolist-audit.md` §11–12.

### XIII. No Unnecessary Backend Services

- The application MUST run entirely in the browser: no API routes, server actions, database
  servers, auth services or proxies.
- Server-side rendering is limited to the static shell and routing.
- Introducing any backend component requires an approved ADR first.

*Rationale:* Personal scale; no operations, cost or auth burden (ADR-001).

### XIV. No Silent Scope Expansion by AI Agents

- Agents MUST implement only what the approved spec, plan and current task describe.
- Missing product decisions MUST be raised as questions or `[NEEDS CLARIFICATION]` markers, never
  invented.
- Out-of-scope improvements are proposed in writing, not done.
- Agents MUST stop at every human approval gate.

*Rationale:* The human owner keeps control of the product.

### XV. Documentation and Code Consistency

- When a decision, ID, contract or requirement changes, the owning document (see each doc's
  "Owns" line), the affected specs and the code MUST be updated in the same change.
- A conflict between documents is resolved by an explicit decision, never by silently overriding
  one of them.

*Rationale:* Specs that drift from the code stop being specs.

## Platform & Source Constraints

- Stack, browser targets (D4), deployment (D1, standard `next build`, no static export) and local
  storage (D2) are defined in `docs/product-requirements.md` §7 and §9 and in the ADRs in
  `docs/architecture.md` §13. Changing them requires a new or amended ADR.
- The music-source policy is `docs/product-requirements.md` §6. The provider compliance checklist
  is `docs/provider-contract.md` §8.
- The reference repository `../metrolist-reference` is read-only inspiration and MUST never be
  modified.

## Development Workflow & Quality Gates

- Each feature follows: Specify → Clarify (when needed) → Plan → Tasks → Analyze → Implement →
  Converge → Review, using the `/speckit-*` commands. The agent operating rules are in `AGENTS.md`.
- Human approval is REQUIRED after the specification (and clarifications), after the plan, before
  implementation starts, and at the final review.
- Each plan MUST pass the plan template's Constitution Check. Violations are justified in its
  Complexity Tracking table or the plan is revised.
- A gate is passed only with recorded evidence. The gate definitions are in
  `docs/quality-gates.md`. The Definition of Done is in `docs/roadmap.md`.

## Governance

- This constitution overrides other practices and guidance. The documents in `docs/` own the
  details. The constitution owns the principles. Where they conflict, the conflict is raised to
  the owner and resolved explicitly.
- Amendments are made with `/speckit-constitution`, need the owner's approval, and record a Sync
  Impact Report plus any follow-up changes to dependent docs and specs.
- Versioning uses semver:
  - MAJOR: a principle is removed or redefined incompatibly.
  - MINOR: a principle or section is added or materially expanded.
  - PATCH: wording and clarifications.
- Compliance is checked at every plan (Constitution Check), at `/speckit-analyze`, and at review.

**Version**: 1.0.0 | **Ratified**: 2026-11-05 | **Last Amended**: 2026-11-05
