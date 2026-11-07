# Research: Single Permanent Visual Identity (014)

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-11-07

Each item records the decision, why it was chosen, and the alternatives considered. Contrast values come from the WCAG 2.x relative-luminance formula, computed on 2026-11-07 with the same algorithm as `tests/unit/tokens-contrast.test.ts`. Overlay and scrim values are composited in sRGB and rounded to 8-bit values.

---

## R1. How the identity is applied from the first frame (FR-004, FR-005, FR-006; UX-AC-10)

**Decision**: Define every identity token once, as static custom properties on `:root` in `src/app/globals.css`, together with `color-scheme: dark`. Also export `viewport = { colorScheme: 'dark' }` from `src/app/layout.tsx`, which emits `<meta name="color-scheme" content="dark">` (bundled doc `01-app/03-api-reference/04-functions/generate-viewport.md`, "colorScheme"). Remove the `data-theme` and `data-accent` attributes, the pre-paint bootstrap script and `suppressHydrationWarning` from `<html>`, in both `layout.tsx` and `global-error.tsx`. Ship no `prefers-color-scheme` rule anywhere.

**Rationale**:
- The stylesheet is render-blocking in `<head>`, so the first frame with content already has the tokens. No script, storage or hydration is involved (ADR-011).
- The `color-scheme` meta tag makes the browser use its dark canvas and dark native controls even before the stylesheet arrives. The CSS property keeps scrollbars and form controls dark after it loads, including in `global-error.tsx`, which renders its own `<html>` and cannot export `viewport`.
- With no `prefers-color-scheme` query, the system light/dark setting cannot affect anything (FR-006).

**Alternatives considered**:
- *Keep `data-theme="dark"` as a fixed attribute.* Rejected: it keeps a theming hook that no longer has a purpose, and it invites a theme system to come back.
- *CSS only, with no meta tag.* Rejected: the meta tag is free, and it covers the moment before the stylesheet is parsed.
- *`themeColor` (mobile browser toolbar colour).* Not included. It belongs with the PWA manifest work in 012 (PLAT-03) and is not required by the spec. It can be proposed there.

## R2. Derived token values (FR-002, FR-009 to FR-012; design-system §2.1 "to be derived")

**Decision**: These values sit beside the five approved ones, which are fixed by K1/K2:

| Role | Token | Value | Notes |
|---|---|---|---|
| Raised surface (menus, dialogs, tooltips, skip link) | `--raised` | `#213441` | The same blue-slate hue (204°) one step lighter than `--surface` |
| Strong border (inputs, control outlines, separated layers) | `--border-strong` | `#7F98A7` | ≥ 3:1 on bg, surface, raised **and** on the pressed overlay over raised |
| Divider (decorative separation) | `--divider` | `#2A3D49` | Decorative only; never the only boundary of a meaningful element |
| Danger | `--danger` | `#F2949A` | Hue 356° (rose-red) against copper's 28°. Always paired with an icon or text |
| On accent | `--on-accent` | `#101B23` | The `--bg` value |
| Accent hover | `--accent-hover` | `#E2BD9C` | Lighter copper, same hue |
| Accent pressed | `--accent-pressed` | `#C99B73` | Darker copper, same hue |
| Hover overlay | `--overlay-hover` | `--text` at 6% | Unchanged from design-system §2.4 |
| Pressed overlay | `--overlay-pressed` | `--text` at 10% | Unchanged |
| Selected background | `--overlay-selected` | `--accent` at 12% | Unchanged. Plus accent text for the title |
| Focus ring | (rule in `:focus-visible`) | 2 px solid `--accent`, 2 px offset | Confirmed (R4) |
| Now Playing scrim | `--scrim` | `--bg` (`#101B23`) at **85%** | Tinted toward bg, not black (R3) |
| Elevation shadow | `--shadow-overlay` | `0 8px 24px rgb(0 0 0 / 0.45)` | Used with a `--divider` border on menus and dialogs; no glow |

**Computed contrast (every pair the UI uses)**

| Pair | Ratio | Minimum |
|---|---|---|
| text / bg · surface · raised | 14.80 · 12.96 · 10.91 | 4.5 |
| text-muted / bg · surface · raised | 8.64 · 7.57 · 6.37 | 4.5 |
| accent (as text, icon or ring) / bg · surface · raised | 8.52 · 7.47 · 6.28 | 4.5 as text; 3.0 as UI component |
| danger / bg · surface · raised | 7.88 · 6.90 · 5.81 | 4.5 |
| border-strong / bg · surface · raised | 5.78 · 5.06 · 4.26 | 3.0 |
| border-strong / pressed overlay over raised (`#354753`, browser rounding) | 3.19 | 3.0 |
| on-accent / accent · accent-hover · accent-pressed | 8.52 · 9.97 · 7.00 | 4.5 |
| text / hover overlay over bg · surface · raised | 12.75 · 11.03 · 9.24 | 4.5 |
| text / pressed overlay over bg · surface · raised | 11.40 · 9.78 · 8.18 | 4.5 |
| text-muted / pressed overlay over raised (worst overlay case) | 4.77 | 4.5 |
| accent / selected overlay over bg · surface · raised | 6.81 · 5.92 · 4.97 | 4.5 |
| surface / bg | 1.14 | none (a layer step only) |
| raised / bg · surface | 1.36 · 1.19 | none (needs a divider border and shadow, R5) |
| divider / surface · bg | 1.36 · 1.55 | none (decorative) |

**Rationale**:
- Every value stays in the identity's hue family (bg, surface and raised are 204–205°; copper is 28°). The direction rules in design-system §2 hold: no pure black, no neon, no glow.
- `--border-strong` went through two corrections. The first candidate, `#6A8494`, fell to about 2.5 on the pressed overlay. The second, `#7A93A2`, was computed at 3.03 with banker's rounding, but with the half-up rounding browsers use (pressed overlay over raised = `(53, 71, 83)`) it measures 2.995, so it failed FR-010 by a hair. Changed during T003/T005 (2026-11-07) to `#7F98A7`, which keeps ≥ 3:1 in every state. Overlay composites in tests round half up.
- **Danger vs copper.** Their luminance is close (1.08:1), so they differ by hue only. That is acceptable because FR-012 forbids conveying danger by colour alone: every destructive or error element carries an icon or text label.

**Alternatives considered**:
- *A saturated red danger (`#FF5A5A`).* Rejected: it is close to "highly saturated", and it clashes with the calm direction.
- *A darker on-accent (`#0B1218`).* Rejected: `--bg` already gives 8.52:1, and reusing it keeps the palette small.
- *Opaque hover and pressed colours instead of overlays.* Rejected: overlays work on every surface without multiplying tokens, and design-system §2.4 already specifies them.

## R3. Now Playing scrim (design-system §2.3)

**Decision**: The scrim is `--bg` at 85% over the blurred artwork, not 70% black. Worst case (pure white artwork, composite `#343D44`):

| Text over the scrim | Ratio | Minimum |
|---|---|---|
| `--text` | 9.38 | 4.5 |
| `--text` at 80% opacity | 6.69 | 4.5 |
| `--text-muted` | 5.48 | 4.5 |
| `--accent` | 5.40 | 4.5 |

The record for comparison, all on pure white artwork:
- **70% black** (the 001 value), with the new text colour: `--text` 7.17, `--text-muted` **4.18 (fails)**, accent **4.13 (fails)**.
- **70% bg tint**: `--text-muted` **3.21 (fails)**.
- **80% bg tint**: accent **4.49 (fails)**.

**Rationale**: 85% is the lowest bg-tinted strength at which every identity text role passes on white artwork. A bg tint keeps the expanded player inside the identity instead of introducing a black layer. There is no expanded player yet (008), so 014 only defines the token and its test. 008 applies it.

**Alternatives considered**:
- *75% black* (all roles pass, `--text-muted` 5.13). Rejected: it adds a neutral black layer that is foreign to the blue-slate identity.
- *Sampling the artwork's luminance.* That is P1 with NP-15, not 014.

## R4. Focus indicator (FR-011)

**Decision**: Keep the 001 rule: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`. The offset gap shows whatever lies behind the element: bg, surface or raised.
- The ring measures 8.52, 7.47 and 6.28:1 against those backgrounds, all at least 3:1.
- On an accent-filled control (the primary button), the ring sits 2 px outside the fill, separated by the parent background. So the ring is always next to a non-accent colour, never directly on copper.

**Rationale**: Contrast is met everywhere without a second ring colour. A two-colour ring (accent plus an inner bg ring) would add complexity for no measurable gain.

**Alternatives considered**: a `--text`-coloured ring (it is less distinctive and loses the accent's "you are here" role); a double ring (unnecessary, see above).

## R5. Elevation and separated layers (FR-010; design-system "Elevation")

**Decision**: Elements that must read as a separate layer (tooltips, the skip link, and later menus and dialogs) use `bg-raised`, plus a 1 px `--divider` border and `--shadow-overlay`. The light-theme `--shadow-1` and `--shadow-2` are removed. Controls whose edge carries meaning (inputs, the secondary button) use `--border-strong`, as 001 already does.

**Rationale**: raised/bg is only 1.36:1. The border-strong outline on controls satisfies the 3:1 boundary rule. For overlays, the meaningful boundary is the content inside them (text at ≥ 10.91:1), and the divider plus shadow provides the layer cue. No glow.

## R6. Removing the obsolete 001 preference (FR-019, SC-006)

**Decision**: Add one application port, `ObsoleteDataCleaner { removeObsoleteAppearance(): void }`. The infrastructure implementation, `LocalStorageObsoleteDataCleaner`, calls `localStorage.removeItem('mp.appearance')` inside `try/catch`. It is called once from a client `useEffect` in `AppShell`, after mount, through the container. A fake in `src/test/fakes/` lets a component test prove the call. The key lives in the infrastructure file only. The domain no longer knows about appearance.

**Rationale**:
- Removing the key runs after paint and never reads the value, so it cannot affect what is shown (FR-019 "no visible effect").
- Blocked storage throws, and the error is swallowed (spec edge case "Device storage unavailable").
- The port keeps the layer rules: presentation never touches browser storage directly (constitution VIII; architecture §3). The fake is the test that requires the abstraction (constitution VIII, "a test that requires them").
- **Lifetime.** The cleanup stays until the owner retires it. A natural point is when 002's settings store lands, or at Phase 06. Retiring it is a one-line removal and is recorded as a follow-up.

**Alternatives considered**:
- *Ignore the stale key.* Rejected: ADR-011 says 014 removes the stored values, and SC-006 requires it.
- *Remove it in an inline `<head>` script.* Rejected: it reintroduces a pre-paint script, which ADR-011 removed.
- *Call `localStorage` directly from `AppShell`.* Rejected: it breaks the presentation → infrastructure ban, which is lint-enforced.

## R7. What is deleted from 001 (FR-016, FR-020)

**Decision**: Remove the whole appearance system, not just hide it:

| Layer | Removed |
|---|---|
| domain | `src/domain/appearance.ts` (themes, accents, parser, both inline-script builders) |
| application | `AppearanceRepository` and `DocumentThemeTarget` from `ports.ts`; `stores/settings.ts` (it holds only appearance); appearance exports from `shell.ts`; the appearance and themeTarget entries in `container.ts` |
| infrastructure | `platform/appearance-storage.ts`, `platform/document-theme.ts` |
| presentation | `settings/AppearanceSettings.tsx`, `shell/ThemeSync.tsx`, `InlineScript.tsx` (its only user is AppearanceSettings), plus the notice for InlineScript in `THIRD_PARTY_NOTICES.md` |
| routes | the bootstrap script and theme attributes in `layout.tsx` and `global-error.tsx`; the AppearanceSettings import in `settings/page.tsx` |
| CSS | every `[data-theme]` and `[data-accent]` block, the `prefers-color-scheme` block, the `.appearance-*` component styles and their forced-colours rules, the light shadows |
| test fakes | `src/test/fakes/InMemoryAppearanceRepository.ts` |

**Rationale**: FR-020 requires that no Story 4 behaviour stays reachable. Dead code would also keep the deleted tests' assumptions alive. `useSettingsStore` comes back in 010 with playback preferences, as architecture §7 already describes. It is not kept empty, because the constitution forbids abstractions that nothing needs.

**Alternatives considered**: *keep `useSettingsStore` as an empty shell for 010.* Rejected: speculative, see above.

## R8. Settings page rows (FR-017, D-014-1)

**Decision**: `src/presentation/components/settings/SettingsSectionList.tsx` renders a server component with a `<ul aria-label="Settings sections">` of five `<li>` rows, in this order: Playback, Storage, Library & Data, Accessibility, About.
- Each row is `bg-surface`, `rounded-md`, with a 1 px `--divider` border. It shows the name (`text-body-strong`, `--text`) and a "Coming soon" label (`text-caption`, `--text-muted`).
- A row has no link, button, `tabindex`, hover or cursor style, and no chevron.
- The labels live in a module constant in that component. 010 may move them to the domain when the O7 route restriction needs them.

**Rationale**: A native list gives the screen-reader reading "list, 5 items; Playback, Coming soon…" (Story 2, scenario 3). Rows are plain text, so they cannot be focused or activated (scenario 2). Static markup needs no client JavaScript.

**Alternatives considered**:
- *`<h2>` per section.* Rejected: headings imply content below them, and there is none.
- *`aria-disabled` buttons.* Rejected: they are still focusable, and they suggest that the rows can be activated.

## R9. Forced colours (FR-014, D-014-2)

**Decision**: Audit the shell under `forced-colors: active` and add the minimum rules in a single `@media (forced-colors: active)` block:
1. **Active navigation item.** Today it is marked by a filled icon (shape, which survives) and the accent colour (lost). Add a visible marker: `[aria-current="page"]` gets a `2px solid Highlight` left border in the sidebar and a top border in the bottom bar, so the item is marked by something other than colour alone.
2. **Focus ring.** `outline` survives forced colours, and the browser maps its colour to a system colour. No rule is needed; the E2E test asserts it.
3. **Delayed skeleton.** Backgrounds are removed in forced colours, so skeleton blocks would vanish. They get `border: 1px solid CanvasText`. The `role="status"` and `aria-busy` remain the accessible signal.
4. **Primary button.** Its accent fill is removed, so it gets `border: 1px solid ButtonText`. The secondary button already has a border.
5. **Settings rows, sidebar, dock and bottom bar.** Their borders map to `CanvasText` automatically. No rule is needed.

**Test approach**: Playwright `page.emulateMedia({ forcedColors: 'active' })` in the Chromium projects only (D-014-2). Firefox and WebKit skip with a reason. The test asserts:
- the active nav item's computed border is not `none`;
- the focus outline style at every Tab stop is not `none`;
- skeleton blocks have a visible border;
- axe on every in-scope page reports 0 serious or critical issues.

**Rationale**: The rules only add borders, so nothing changes outside forced-colours mode.

## R10. Contrast and identity tests (FR-013, constitution X)

**Decision**: Rewrite `tests/unit/tokens-contrast.test.ts` around a single `:root` block. It parses `src/app/globals.css` (kept as the single source of truth) and checks:
- every token in the contract ([contracts/identity.md §1](contracts/identity.md#1-tokens)) is present, with the exact approved value for the five K1/K2 tokens;
- every pair in R2 meets its minimum, including overlays composited over each base and the scrim composited over white;
- `:root` declares `color-scheme: dark`;
- there are no `data-theme` or `data-accent` selectors and no `prefers-color-scheme` query;
- `--bg` is not `#000000`.

`no-raw-colours.test.ts` is unchanged and still bans raw colours outside `globals.css`.

**Rationale**: Any later value change that breaks a ratio fails the unit gate (G7), with no browser needed.

## R11. E2E coverage (SC-001 to SC-006; test-plan E2E-09)

**Decision**:
- Replace `tests/e2e/theme.spec.ts` with `tests/e2e/identity.spec.ts`, covering:
  - **First frame.** Reuse 001's held-chunks technique (R14 in 001), so the identity colours are checked on a page that has not yet hydrated.
  - **Light vs dark system preference.** `colorScheme: 'light'` and then `'dark'` emulation give identical computed colours on every in-scope page.
  - **Dark colour scheme.** `getComputedStyle(documentElement).colorScheme === 'dark'` and the meta tag is present.
  - **Leftover removal.** Seed `mp.appearance` with a valid, an unknown and a corrupt value: after load the key is gone and the colours are the identity's. With `breakStorage`, the page loads without error.
  - **Settings.** The five rows, in order, have no focusable descendants. `/settings/appearance` shows "Nothing here yet".
  - **Forced colours** (R9).
- Update `a11y.spec.ts`: the axe scan runs once on the identity instead of × 3 themes. The "Dark and Teal by keyboard" test is removed.
- Update `states.spec.ts`: the recovery screen is checked in the identity, and the seeded theme is dropped.
- `fixtures.ts`: remove `recordThemeAttributes`. Keep `seedAppearance`, renamed `seedObsoleteAppearance` and used by the leftover test, and keep `breakStorage`.
- Update `tests/lint/layers.test.ts` so it uses the new modules as its examples, for example `LocalStorageObsoleteDataCleaner`.
- **"10 cold loads" in SC-001.** Run as a 10× loop over the destinations in the first-frame test, on the Chromium desktop and mobile projects. The other projects run it once. This keeps the suite's runtime close to 001's.

**Rationale**: It follows E2E-09 as amended in the test plan. It keeps the 001 test patterns. Deleted tests are only those whose behaviour is withdrawn.
