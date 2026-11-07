# Quickstart: Validating 014 (Single Permanent Visual Identity)

**Feature**: [spec.md](spec.md) · **Contracts**: [identity.md](contracts/identity.md), [settings-page.md](contracts/settings-page.md)

## 1. Prerequisites

- Node 24 LTS and pnpm, as in 001's quickstart. Run `pnpm install`.
- Playwright browsers are installed (`pnpm exec playwright install`).
- E2E runs against a production build with test hooks enabled: `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` (001 quickstart §2).

## 2. Automated gates

| Gate | Command | Expected |
|---|---|---|
| G5 Typecheck | `pnpm typecheck` | 0 errors |
| G6 Lint | `pnpm lint` | 0 errors, including the layer rules |
| G7/G8 Unit and integration | `pnpm test` | All pass. `tokens-contrast` covers I-T1 and I-T2. `domain/` coverage is still ≥ 90% |
| G9 E2E | `pnpm test:e2e` | All projects pass. `identity.spec.ts` covers I-T3 to I-T6 and I-T8; forced-colours tests are skipped outside Chromium, with a reason |
| G10 Accessibility | part of `pnpm test:e2e` (`a11y.spec.ts`, `identity.spec.ts`) | 0 serious or critical axe issues (I-T9, I-T8) |
| Branding | `pnpm scan:branding` (after build) | 0 matches |

Report each result exactly as it ran. A run that did not happen is **not run**.

## 3. Validation scenarios

| # | Scenario | How | Expected |
|---|---|---|---|
| V1 | First frame in the identity | `identity.spec.ts`, first-frame test (chunks held) | bg `#101B23`, text `#E8EDF0`, active nav item `#D8AD88` before hydration (Story 1 sc. 1, 4) |
| V2 | The system preference is ignored | `identity.spec.ts`, light vs dark emulation | Identical computed colours (Story 1 sc. 2, 3; SC-001) |
| V3 | Native surfaces are dark | `identity.spec.ts` | `color-scheme` is `dark` and the meta tag is present (Story 1 sc. 5; SC-002) |
| V4 | Leftover 001 value is removed | `identity.spec.ts`, seeded valid, unknown and corrupt values; blocked storage | The key is gone and the identity is shown; with blocked storage, no page error (Story 1 sc. 6; SC-006) |
| V5 | Settings rows | `SettingsSectionList.test.tsx`, `identity.spec.ts` | 5 rows in D-014-1 order, nothing focusable, no appearance wording (Story 2; S-T1 to S-T5) |
| V6 | `/settings/appearance` | `identity.spec.ts` | "Nothing here yet" under Settings (Story 2 sc. 5) |
| V7 | Contrast | `pnpm test` → `tokens-contrast` | Every R2 pair meets its minimum (Story 3; SC-003) |
| V8 | Forced colours | `identity.spec.ts`, Chromium projects | Active marker, focus outline and skeleton borders are visible; axe is clean (Story 4; SC-005) |
| V9 | 001 behaviour unchanged | the full `pnpm test` and `pnpm test:e2e` runs | Every non-theme 001 test still passes (SC-007) |
| V10 | Manual first-load check | `pnpm build && pnpm start`. Set the OS to light, hard-reload each destination, and use DevTools → Rendering → "Emulate CSS media feature forced-colors" in Chrome | Never a light frame; forced colours look as in V8. Screenshots for G11 |

## 4. Owner visual review (G11, SC-008)

Screens: `/`, `/explore`, `/library`, `/settings`, `/library/liked`, `/radio`, and the recovery screen. Widths: 320, 375, 768, 1024 and 1440 px. Also review each screen once with forced colours emulated in Chromium; screenshots are sufficient (D-014-2).

**Recorded as Deferred, not Passed:**
- the real Windows High Contrast check (D-014-2);
- the manual screen-reader pass (001 deferral, unchanged).

Both are due at Phase 06 closed-beta preparation.
