# Quality Gates

> **Status:** Approved structure · **Created:** 2026-11-05
> **Owns:** the definition of each SDD quality gate, the evidence it requires, who approves it, and per-feature gate status.
> **Related:** principles in [constitution](../.specify/memory/constitution.md) · Global Definition of Done in [roadmap.md](roadmap.md#global-definition-of-done-applies-to-every-phase-from-01-on) · test levels and tooling in [testing/test-plan.md](testing/test-plan.md) · workflow in [AGENTS.md](../AGENTS.md)

**Rule:** a gate is **Passed** only when its evidence is recorded: a link, command output, a report file, or a dated owner sign-off. Without evidence, the status is **Not run** or **Blocked**. Agents never mark a gate passed on the owner's behalf.

**Tooling status (2026-11-05).** Only `pnpm lint` exists. These scripts **do not exist yet**:
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- the CI workflow
- axe integration
- the branding scan

They are introduced by the `001-app-shell` plan (roadmap Phase 01 deliverables). Gates G5–G12 cannot pass until they exist.

## 1. Gate definitions

### Specification and planning gates (per feature)

| Gate | When | Required evidence | Approver |
|---|---|---|---|
| **G1 Specification review** | After `/speckit-specify` (and `/speckit-clarify`) | `checklists/requirements.md` all items checked; 0 `[NEEDS CLARIFICATION]`; feature IDs and UX-AC listed; owner's dated approval noted in the spec's Status line | Owner |
| **G2 Acceptance-criteria completeness** | With G1 | Every FR is covered by at least one acceptance scenario or success criterion. Every UX-AC that the feature claims maps to a verification method in the [traceability matrix](testing/test-plan.md#5-traceability-matrix) | Owner |
| **G3 Architecture / plan approval** | After `/speckit-plan` | `plan.md` Constitution Check has no unjustified violations; it stays consistent with `docs/architecture.md` (or a proposed ADR amendment); new dependencies are justified | Owner |
| **G4 Task breakdown** | After `/speckit-tasks` + `/speckit-analyze` | Every FR maps to at least one task. Test tasks exist for critical behaviour (constitution X). `/speckit-analyze` reports 0 CRITICAL findings, and its HIGH findings are resolved or accepted in writing | Owner |

### Verification gates (per task while implementing; full run at feature end)

| Gate | Command / method | Pass condition |
|---|---|---|
| **G5 TypeScript** | `pnpm typecheck` (`tsc --noEmit`, strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`) | Exit 0, no new suppressions without a justification comment |
| **G6 Lint** | `pnpm lint` (ESLint, including the layer-boundary rules) | Exit 0, no new disabled rules without a justification comment |
| **G7 Unit** | `pnpm test` (Vitest, `domain/` + pure logic) | All pass; `domain/` ≥ 90% line and branch coverage |
| **G8 Integration** | `pnpm test` (store, use-case, repository, provider-contract suites under the fakes in the test plan) | All pass; every provider runs the contract suite |
| **G9 End-to-end** | `pnpm test:e2e` (Playwright: Chromium, Firefox, WebKit × desktop 1440×900 and mobile 390×844) | Every E2E flow the feature claims passes. Flakes are fixed, never retried away |
| **G10 Accessibility** | axe in E2E on every touched route × Light/Dark/OLED; manual screen-reader pass (VoiceOver macOS/iOS, plus NVDA or TalkBack) and a 200% zoom check before each phase gate | 0 serious or critical axe violations; the manual pass is recorded with the date, AT and browser versions |
| **G11 Visual review** | The owner reviews touched screens at 320/375/768/1024/1440 px in each theme (screenshots or live) | Owner sign-off; no token or brand-rule violations ([design-system.md](design-system.md)) |
| **G12 Regression** | Full G5–G10 run on the merged result; earlier features' UX-AC still pass | All green; at phase gates, the manual matrices ([test-plan §6](testing/test-plan.md#6-browser-audio-limitations-matrix), [§8](testing/test-plan.md#8-manual-beta-checklist)) run as the roadmap requires |

### Final gate

| Gate | When | Required evidence | Approver |
|---|---|---|---|
| **G13 Feature review** | After `/speckit-implement` + `/speckit-converge` | G5–G12 evidence; `/code-review` findings resolved; spec, docs and code consistent (constitution XV); Global DoD met | Owner |

## 2. Gate status by feature

Only features with a spec are listed. Statuses: **Passed** (with an evidence link), **Pending** (waiting on the owner), **Not run**, **Blocked** (with a reason), **N/A** (with a reason).

### 001-app-shell

| Gate | Status | Evidence |
|---|---|---|
| G1 Specification review | **Passed** 2026-11-05 | Owner approval, 2026-11-05 (recorded in the spec Status line and Clarifications D-001-1/2). The checklist passed: [checklists/requirements.md](../specs/001-app-shell/checklists/requirements.md) |
| G2 AC completeness | **Passed** 2026-11-05 | Owner approval of the spec, 2026-11-05. FR→scenario/SC mapping as in the spec; UX-AC list in the spec header |
| G3 Plan approval | **Passed** 2026-11-05 | Owner approval, 2026-11-05 (recorded in the plan Status line). Plan: [plan.md](../specs/001-app-shell/plan.md), [research.md](../specs/001-app-shell/research.md), [data-model.md](../specs/001-app-shell/data-model.md), [contracts/](../specs/001-app-shell/contracts/), [quickstart.md](../specs/001-app-shell/quickstart.md). Constitution Check: PASS, no violations. Revised 2026-11-05 per owner review (research R15: Appearance selection shown from first paint) |
| G4 Task breakdown | **Passed** 2026-11-05 | Owner approval, 2026-11-05. [tasks.md](../specs/001-app-shell/tasks.md): 108 tasks in 9 phases, all in scope. Confirmed decisions: per-component mount counters `{ shell: 1, sidebar: 1, bottomNav: 1, dock: 1 }`; Milestone 1 (T001–T054) is a review checkpoint, not feature completion; test hooks excluded from normal production builds ([ui-shell.md §7.2](../specs/001-app-shell/contracts/ui-shell.md#72-exclusion-from-production-builds)). **Post-analysis amendments**, approved by the owner 2026-11-05, documentation only, with scope and task count unchanged: round 1 resolved K1 (license review), X1–X3, G1, I1, G2, A1, U1 and seven LOW items; round 2 resolved C1 (deterministic skeleton threshold), U1, U2, I1 and I2. Round 3 resolved H1: JavaScript chunks are held until released, with a hydration-not-occurred check. **Analysis status:** `/speckit-analyze` third run on 2026-11-05 reported 0 CRITICAL, 1 HIGH (H1), 0 MEDIUM and 0 LOW, and H1 was remediated in round 3. The fourth run on 2026-11-05 reported 0 CRITICAL, 0 HIGH, 1 MEDIUM (M1) and 0 LOW; M1 was remediated the same day (V25 waits for the post-hydration mount signal instead of `networkidle`). The analysis gate's "no CRITICAL findings" condition is met. Implementation awaits owner approval |
| G5 TypeScript | Not run | Script not yet created |
| G6 Lint | Not run | — |
| G7 Unit | Not run | Script not yet created |
| G8 Integration | Not run | Script not yet created |
| G9 E2E | Not run | Script not yet created |
| G10 Accessibility | Not run | — |
| G11 Visual review | Not run | — |
| G12 Regression | N/A until code exists | — |
| G13 Feature review | Not run | — |
