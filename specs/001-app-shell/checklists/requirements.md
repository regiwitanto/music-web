# Specification Quality Checklist: App Shell & Navigation

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-05
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

Validated by the agent on 2026-11-05, in one pass (iteration 1 of a maximum of 3). **This is not the human spec-review gate**, which is still pending.

**Evidence for the automated checks:**
- A grep for framework, storage and test-tool names returned nothing: Next.js, React, Tailwind, Dexie, Zustand, IndexedDB, localStorage, TypeScript, Radix, shadcn, Playwright, Vitest, CSS, HTML, `aria-*`, `h1`.
- `NEEDS CLARIFICATION` count: 0.
- No template tokens remain.
- The spec has 42 functional requirements and 10 success criteria.

**Judgement calls the reviewer should confirm:**
- **Pixel and contrast values appear on purpose.** They include the breakpoints, 240/72 px sidebar, 44/24 px targets, 150 ms skeleton delay, 4.5:1 and 3:1 contrast, and `#000000` for OLED. They are the approved, measurable UX requirements from ux-specification.md and design-system.md, not implementation choices.
- **URL paths** (`/`, `/explore`, …) are part of the approved information architecture (product-requirements §4). They are user-visible addresses.
- **SC-007** depends on a test-only marker for "created once". The method is left to the plan.
- **Scope boundaries are explicit:**
  - SHELL-03 (FR-013), SHELL-04 (FR-033), SET-06 (FR-032), other Settings sections (FR-024) and sidebar playlists (FR-007) are excluded.
  - Real playback controls are excluded (FR-017).
- **Open item O3** (theme persistence before the local-persistence feature) is a planning question. It does not block the spec.

### Revision 1 (2026-11-05, requested by the owner before G1)

These changes were re-validated against all checklist items above, and everything still passes.

**1. Nested routes**
- **FR-012** now lists the PRD §4 reserved patterns exactly. It separates reserved addresses ("Nothing here yet", parent destination current) from unknown ones (in-shell Not Found, no current destination).
- **FR-009** now refers to reserved addresses and also covers loading unknown addresses directly.
- Story 2's Independent Test and scenarios 2, 4 and 7 were updated. Scenario 8 was rewritten with concrete unknown examples, and scenario 9 was added.
- SC-007 and SC-008 were updated.
- An assumption was added on `/settings/<section>`.

**2. Skip to player**
- **FR-026:** only "Skip to content" is required, the idle dock takes no focus, and "Skip to player" is deferred to 008.
- Story 3 scenarios 1 and 2 were updated.
- An assumption was added.
- The 008 row in `specs/README.md` now carries the deferral, and ux-specification §8 was updated to match.

**3. Theme**
- **FR-019** says "immediately, by the time the control shows the new choice". "Within one frame" is gone.
- **FR-021** says the persisted theme and accent are applied before any app content is visible.
- Story 4's Independent Test and scenarios 2 and 3 were updated, as were SC-004 and the "slow start-up" edge case.
- UX-AC-10 in ux-specification §9 was reworded to match.

**Judgement calls, resolved by the owner on 2026-11-05** (recorded in the spec's Clarifications section):
- **D-001-1:** Not Found marks no destination as current. Confirmed.
- **D-001-2:** `/settings/<section>` accepts any single segment during MVP only. It must later be restricted to implemented sections.

**Gate G1: spec approved by the owner on 2026-11-05.** Next: `/speckit-plan` (not yet run). After approval: `/speckit-clarify` (optional) or `/speckit-plan`.
