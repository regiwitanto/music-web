# Implementation Plan: Single Permanent Visual Identity

**Branch**: `014-visual-identity` (Spec Kit feature; work is on git `main`, see open item O5) | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-visual-identity/spec.md` (approved 2026-11-07, G1, after clarifications D-014-1 and D-014-2)

**Status**: Approved (owner, 2026-11-07, G3), including proposed doc amendments 1–7 and additions (a)–(c). **Implemented and accepted (G13, owner, 2026-11-07).** One derived value changed during implementation: `--border-strong` is `#7F98A7` (see research R2).

## Summary

Replace 001's theme and accent system with the one permanent dark identity, **Abyss Copper** (ADR-011).

**Technical approach**
- **Static tokens.** The tokens become one static `:root` block in `globals.css`, with `color-scheme: dark`, plus `viewport.colorScheme: 'dark'`. There is no pre-paint script and no `<html>` attributes, so the identity is present from the first frame by construction (R1).
- **Derived tokens.** The roles design-system §2.1 left open get values with computed contrast (R2–R5):
  - raised `#213441`, border-strong `#7F98A7`, divider `#2A3D49`, danger `#F2949A`;
  - on-accent `#101B23`, accent hover `#E2BD9C`, accent pressed `#C99B73`;
  - the overlays;
  - the scrim, `--bg` at 85%;
  - an overlay shadow.
- **Removal.** The entire 001 appearance system is deleted across all layers (R7). One small port, `ObsoleteDataCleaner`, removes the stale `mp.appearance` value after mount (R6).
- **Settings.** The page shows five non-interactive "Coming soon" rows (R8, D-014-1).
- **Forced colours.** One forced-colours block adds borders where state relied on colour or background (R9). It is verified by Chromium emulation (D-014-2).
- **Tests.** The token-contrast test, the theme E2E and the axe matrix are rewritten for the single identity (R10, R11).

## Technical Context

**Language/Version**: TypeScript 5 (strict flags as in 001), React 19.3, Node 24 LTS. Unchanged from 001.

**Primary Dependencies**: Next.js 16.4.5 App Router, Tailwind CSS v4 (`@theme inline`), shadcn/ui primitives, `lucide-react`, `zustand` v5. **No dependency is added.**
- `zustand` loses its only current user, `stores/settings.ts`, and is kept for 007 and 010, which architecture §7 plans for. It is not removed, to avoid churn.
- `viewport.colorScheme` was checked in the bundled `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md`.

**Storage**: None written. The one read-free operation is `localStorage.removeItem('mp.appearance')` (data-model §2).

**Testing**: The 001 stack.
- Vitest, jsdom and RTL for unit and component tests.
- Playwright on 3 engines × desktop and mobile, with axe.
- New uses of the existing Playwright API: `emulateMedia({ colorScheme })` on all projects, and `emulateMedia({ forcedColors: 'active' })` on Chromium only.

**Target Platform**: D4 browsers. Forced-colours acceptance is Chromium emulation only (D-014-2).

**Project Type**: Single client-heavy web application (Next.js App Router) in `src/`.

**Performance Goals**:
- 0 flashes in 10 cold loads per destination × light and dark system preference (SC-001).
- No added client JavaScript. The bootstrap script and the selection script are removed, so the head payload shrinks.

**Constraints**:
- Constitution IX v2.0.0 (one dark identity, forced colours) and WCAG 2.2 AA.
- No backend (XIII), no new dependency, no brand names (XII).
- 001 behaviour outside Story 4 must stay green (FR-021).

**Scale/Scope**:
- About 17 source files deleted or edited and 3 created.
- About 14 test files deleted, rewritten or edited.
- 1 CSS file rewritten.
- 4 docs amended.

No `NEEDS CLARIFICATION` remains: the spec's decisions are D-014-1 and D-014-2, and every design unknown is resolved in [research.md](research.md) R1–R11.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | Pre-research | Post-design | Evidence / how the design complies |
|---|---|---|---|---|
| I | Specification-first | ✅ | ✅ | The spec is approved (G1, 2026-11-07). It lists feature IDs and UX-AC. This plan awaits G3. |
| II | Music-first UX | ✅ | ✅ | No player exists yet. Shell persistence is unchanged. The cleanup runs after mount and cannot throw (R6). |
| III | Four destinations | ✅ | ✅ | Navigation is untouched. Settings stays a destination with content (D-014-1). |
| IV | Persistent global player | ✅ | ✅ | `PlayerDock` is unchanged; only its colours change. |
| V | Single audio engine | N/A | N/A | No audio. |
| VI | Local-first data | ✅ | ✅ | No user data. The only storage operation deletes an obsolete device value. |
| VII | MusicProvider | N/A | N/A | No catalog. |
| VIII | Strict TS, modular | ✅ | ✅ | Deletions only shrink the layers. The new `ObsoleteDataCleaner` port has an infrastructure implementation and a test fake that a component test requires (I-T7). The layer lint fixtures are updated. The domain stays pure (`domain/appearance.ts` is removed). |
| IX | Accessibility and responsive | ✅ | ✅ | One dark identity. `color-scheme: dark` for native surfaces. The system preference is never read. Forced-colours rules cover state and focus (R9). Every pair is ≥ AA (R2). The reduced-motion rule is unchanged. |
| X | Automated tests | ✅ | ✅ | The token contrast test covers every pair, the overlays and the scrim (I-T1, I-T2). E2E covers the first frame, preference independence, cleanup and forced colours. Tests are deterministic: emulation plus held chunks, no wall-clock timing. |
| XI | Privacy | ✅ | ✅ | No new scripts. Nothing leaves the device. |
| XII | Licensing and branding | ✅ | ✅ | No assets are added. `InlineScript`, the only copied Next guide code, is removed with its notice. The branding scan stays in the gates. |
| XIII | No backend | ✅ | ✅ | None. |
| XIV | No silent scope expansion | ✅ | ✅ | Out of scope: `themeColor` and the manifest (012), the sticky section index, section content (009/010/012), luminance-sampled scrim (NP-15), real Windows High Contrast (deferred, D-014-2). Every addition beyond the spec text is listed under **Proposed doc amendments** for G3. |
| XV | Docs and code consistency | ✅ | ✅ | design-system §2, specs/README and THIRD_PARTY_NOTICES are amended in the implementation change, and quality-gates at G13 (below). The 001 artifacts stay untouched as history. |

**Result: PASS.** There are no violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/014-visual-identity/
├── spec.md                  # approved 2026-11-07 (G1)
├── plan.md                  # this file
├── research.md              # R1–R11
├── data-model.md            # identity, obsolete preference, settings rows
├── quickstart.md            # validation V1–V10, gates, G11 review
├── contracts/
│   ├── identity.md          # tokens, document, states, forced colours, cleanup, oracles I-T1–I-T9
│   └── settings-page.md     # Settings structure and oracles S-T1–S-T5
├── checklists/requirements.md
└── tasks.md                 # /speckit-tasks (not created here)
```

### Source code (repository root)

```text
src/
  app/
    globals.css                              REWRITE  one :root token block (contracts/identity.md §1), forced-colours block, no theme or accent CSS
    layout.tsx                               EDIT     remove bootstrap script and <html> attributes; add `viewport = { colorScheme: 'dark' }`
    global-error.tsx                         EDIT     remove script, attributes and the layout effect
    settings/page.tsx                        EDIT     AppearanceSettings → SettingsSectionList
  domain/
    appearance.ts                            DELETE
  application/
    ports.ts                                 EDIT     remove AppearanceRepository, DocumentThemeTarget; add ObsoleteDataCleaner
    container.ts                             EDIT     appearance/themeTarget → obsoleteData
    shell.ts                                 EDIT     remove appearance re-exports
    stores/settings.ts                       DELETE   (010 reintroduces a settings store for playback preferences)
  infrastructure/platform/
    appearance-storage.ts                    DELETE
    document-theme.ts                        DELETE
    obsolete-data.ts                         NEW      LocalStorageObsoleteDataCleaner
  presentation/components/
    InlineScript.tsx                         DELETE
    settings/AppearanceSettings.tsx          DELETE
    settings/SettingsSectionList.tsx         NEW      five "Coming soon" rows
    shell/ThemeSync.tsx                      DELETE
    shell/AppShell.tsx                       EDIT     drop <ThemeSync/>; one mount effect calling container.obsoleteData
    shell/NavItem.tsx, Sidebar.tsx, BottomNav.tsx   EDIT only if needed for the forced-colours marker hook (class names; no behaviour)
    ui/button.tsx                            EDIT     primary hover → bg-accent-hover / active:bg-accent-pressed; secondary hover → bg-overlay-hover (danger variant unchanged: bg on danger 7.88:1)
                                                      (no component uses shadow-1/2 today; removing them from globals.css breaks nothing)
  test/fakes/
    InMemoryAppearanceRepository.ts          DELETE
    RecordingObsoleteDataCleaner.ts          NEW
tests/
  unit/tokens-contrast.test.ts               REWRITE  I-T1, I-T2
  unit/appearance.test.ts, appearance-storage.test.ts, bootstrap-script.test.ts,
       selection-script.test.ts, settings-store.test.ts            DELETE (withdrawn behaviour)
  unit/no-raw-colours.test.ts                KEEP
  component/AppearanceSettings.test.tsx      DELETE
  component/SettingsSectionList.test.tsx     NEW      S-T1–S-T3
  component/AppShell cleanup test            NEW      I-T7 (new file, or added to an existing shell component test)
  lint/layers.test.ts                        EDIT     fixtures use obsolete-data / RecordingObsoleteDataCleaner
  e2e/theme.spec.ts                          DELETE → e2e/identity.spec.ts NEW (I-T3–I-T6, I-T8, S-T3–S-T5)
  e2e/a11y.spec.ts                           EDIT     single axe pass (I-T9); remove theme keyboard test
  e2e/states.spec.ts                         EDIT     recovery screen without a seeded theme
  e2e/fixtures.ts                            EDIT     drop recordThemeAttributes; seedAppearance → seedObsoleteAppearance
THIRD_PARTY_NOTICES.md                       EDIT     remove the InlineScript entry
```

**Structure Decision**: It keeps 001's layered layout (architecture §4). Only `obsolete-data.ts`, `SettingsSectionList.tsx` and one test fake are added, each in its layer's existing folder.

## Implementation phases (for `/speckit-tasks`; not executed here)

1. **Tokens first (Story 3 foundation).**
   - Rewrite `tokens-contrast.test.ts` to the contract, test-first: it fails on the current CSS.
   - Rewrite `globals.css`.
   - Update `button.tsx`.
2. **Remove theming (Stories 1, 2).**
   - Delete the appearance modules and their tests.
   - Edit `layout.tsx`, `global-error.tsx`, `ports.ts`, `container.ts`, `shell.ts` and `AppShell`.
   - Add the `ObsoleteDataCleaner` port, its implementation, the fake and the I-T7 test.
   - Update the layer lint fixtures.
3. **Settings rows (Story 2).** Add `SettingsSectionList` and its test, then update `settings/page.tsx`.
4. **Forced colours (Story 4).** Add the forced-colours block and any marker classes the nav needs.
5. **E2E.**
   - Write `identity.spec.ts`.
   - Edit `a11y.spec.ts`, `states.spec.ts` and `fixtures.ts`.
   - Delete `theme.spec.ts`.
6. **Docs (FR-023).** Apply the amendments below, plus `THIRD_PARTY_NOTICES.md`.
7. **Gates.** G5–G10 with results reported exactly as they ran, then the G11 owner review (quickstart §4), then G12 regression, then G13.

## Proposed doc amendments (for owner approval at G3)

These are applied during implementation (phase 6), not now.

1. **design-system §2.1.** Replace the "to be derived in the 014 plan" paragraph with the R2 token table and its contrast table. The label "approved direction, not yet a validated token system" becomes "validated token system (014)".
2. **design-system §2.3.** Scrim: `--bg` at 85%, with the worst-case ratios from R3. Remove the 70% black values and the note about recalculating them.
3. **design-system §2.4 and Elevation.** The focus treatment is confirmed (R4). Hover and pressed for accent fills use `--accent-hover` and `--accent-pressed`. Elevation uses raised, a divider border and `--shadow-overlay` (R5).
4. **design-system §2.5.** Replace "001 already ships a forced-colours fallback…; 014 verifies it" with the R9 rules.
5. **specs/README.md.** Update the 014 status row as each gate is passed.
6. **quality-gates.md, at G13.**
   - Add the D-014-2 entry to the deferral register: real Windows High Contrast check, the residual risk named in the spec's Assumptions, due by Phase 06 closed-beta preparation.
   - Add the 014 gate-status section.
7. **Not edited:** the 001 artifacts (historical evidence) and the 002 spec (paused; it reconciles itself on resume, FR-023).

**Additions beyond the spec text, for explicit owner approval:**
- **(a) Accent hover and pressed tokens, and new overlay utilities.** design-system §2.1 lists them as roles to derive, so this is in scope. It is listed here for visibility.
- **(b) A forced-colours border on the primary button and on skeleton blocks.** This is needed to meet FR-014. The visible change happens only in forced-colours mode.
- **(c) Removing `stores/settings.ts` rather than keeping it empty for 010.**

## Follow-ups recorded (not in 014 scope)

- **Retiring the `mp.appearance` cleanup** (R6). It is a one-line removal, to be scheduled with 002's settings store or at Phase 06.
- **`themeColor` / manifest `theme_color` = `#101B23`.** Propose it in 012 (PLAT-03).
- **Real Windows High Contrast check.** Deferred to Phase 06 closed-beta preparation (D-014-2).
- **The 002 spec reconciles D-002-2 and D-002-3** when it resumes.

## Complexity Tracking

No constitution violations. Nothing to justify.
