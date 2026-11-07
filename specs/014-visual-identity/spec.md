# Feature Specification: Single Permanent Visual Identity

**Feature Branch**: `014-visual-identity` (no git branch; Spec Kit branch hook not installed, open item O5)

**Created**: 2026-11-07

**Status**: Approved (owner, 2026-11-07, G1), after clarifications D-014-1 and D-014-2 · **Accepted (G13, owner, 2026-11-07)** with the exceptions and the deferral in [docs/quality-gates.md](../../docs/quality-gates.md#014-g13-acceptance-record)

**Input**: User description: none typed. Derived from the 014 row and open item O8 in [specs/README.md](../README.md): "Single permanent visual identity (replaces the theme system). Removes SET-01 and SET-02; amends PLAT-02 colour-scheme handling, UX-AC-10, UX-AC-11; supersedes ADR-009 and open item O3."

**Covers**:
- Feature IDs: SET-01 and SET-02 (**removal**: both Withdrawn by O8, IDs kept and not reused), PLAT-02 (amended: single dark identity and forced-colours support)
- UX acceptance criteria: UX-AC-09, UX-AC-10 and UX-AC-11 (as amended 2026-11-07), plus re-verification of UX-AC-05, UX-AC-07 and UX-AC-25 for the screens this feature touches
- Decisions: O8 (owner, 2026-11-06), K1–K4 (owner, 2026-11-07), ADR-011 (supersedes ADR-009), constitution IX v2.0.0

**Sources**:
- [constitution](../../.specify/memory/constitution.md) IX and X (v2.0.0)
- [product-requirements.md](../../docs/product-requirements.md) §5.5 (SET-01, SET-02, SET-06), §5.9 (PLAT-02)
- [ux-specification.md](../../docs/ux-specification.md) §1 principle 5, §4.4, §9 (UX-AC-09, -10, -11)
- [design-system.md](../../docs/design-system.md) §1, §2 (2.1–2.5), elevation
- [architecture.md](../../docs/architecture.md) §7, §8, ADR-009, ADR-011
- [testing/test-plan.md](../../docs/testing/test-plan.md) E2E-09, §7, beta step 8

**Relationship to 001.** Feature 001 (accepted 2026-11-06) shipped theme and accent switching (its Story 4, FR-018 to FR-024 and SC-004/SC-005). This feature replaces that behaviour. 001's artifacts stay unchanged as historical evidence; this spec records what changes.

## Clarifications

### Session 2026-11-07

- **D-014-1.** Q: Now that the Appearance section is gone, what should the Settings page show until real settings arrive? → A: **A basic, conventional Settings layout listing the sections Playback, Storage, Library & Data, Accessibility and About, in that order, each as a simple non-interactive "Coming soon" row.** No section's functionality is built in 014; each arrives with its own feature spec. The layout stays minimal, clean and familiar. No Appearance, theme or accent entry (FR-017, Story 2).
- **D-014-2.** Q: Which browsers must prove that high-contrast (forced-colours) mode works before 014 can be accepted? → A: **Automated testing in Chromium with forced colours emulated is sufficient for 014 acceptance (G13).** The manual check on a real Windows High Contrast system is **Deferred** (owner, in writing, 2026-11-07) to Phase 06 closed-beta preparation, with the limitation documented. It MUST be recorded as Deferred, never as Passed (FR-014, SC-005, SC-008, Assumptions).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The app always opens in its one dark identity (Priority: P1)

Whenever the listener opens or reloads the app, on any device and whatever their system appearance setting, they see the same calm dark identity, "Abyss Copper": deep blue-slate backgrounds, light text and a single muted copper accent. It is there from the very first frame. Nothing flickers, nothing is briefly light, and native browser parts (scrollbars, form controls) are dark too.

**Why this priority**: It is the visible point of the feature and the base every later screen is designed on. Without it, nothing else in 014 has any effect.

**Independent Test**: Cold-load every destination, the Not Found page and a "Nothing here yet" page, with the system appearance set to light and then to dark. Record each load from the first frame. The identity's background, text and accent are present in every frame, the browser reports a dark colour scheme, and the two system settings produce identical pages.

**Acceptance Scenarios**:

1. **Given** a first-time visitor, **When** the app opens, **Then** the page background is `#101B23`, primary text is `#E8EDF0`, secondary text is `#A9B9C1`, surfaces (sidebar, player dock, cards) are `#182731`, and the active navigation item uses the Muted Copper accent `#D8AD88`.
2. **Given** a device set to a light system appearance, **When** the app opens or reloads, **Then** it shows exactly the same dark identity as on a device set to dark.
3. **Given** the app is open, **When** the operating system switches between light and dark, **Then** nothing in the app changes.
4. **Given** any cold load or reload, including on a slow device or network, **When** content first becomes visible, **Then** it is already in the identity. No frame shows a light background, a different accent or unstyled content.
5. **Given** any page, **When** native browser surfaces are shown (scrollbars, text inputs, checkboxes, select menus), **Then** they use the browser's dark rendering and match the identity.
6. **Given** a device that still holds a theme or accent choice saved by an earlier version of the app, **When** the app opens, **Then** the stored choice has no effect: the identity is shown, and the obsolete stored value is removed from the device.

---

### User Story 2 - Settings no longer offers appearance choices (Priority: P1)

The listener opens Settings and finds no theme or accent controls, because there is nothing to choose. Settings still works as a destination: it shows a plain, familiar list of the sections that are coming (Playback, Storage, Library & Data, Accessibility, About), each honestly marked "Coming soon" (D-014-1). No link, deep link or keyboard path leads to an Appearance section.

**Why this priority**: Leaving the 001 controls in place would offer choices that no longer do anything, or keep the withdrawn behaviour alive. It ships together with Story 1.

**Independent Test**: Open Settings at mobile and desktop widths and with a screen reader. There is no Appearance section, theme group or accent group. The page shows its heading and the five "Coming soon" rows in order, none of which can be focused or activated. Open `/settings/appearance` directly: it behaves like any other reserved Settings address.

**Acceptance Scenarios**:

1. **Given** the Settings page, **When** it renders, **Then** it shows the "Settings" main heading followed by exactly five rows, in this order: Playback, Storage, Library & Data, Accessibility, About. Each row shows the section name and a "Coming soon" label, and there is no theme, accent or other appearance control.
2. **Given** the five "Coming soon" rows, **When** the user tabs through the page or clicks or taps a row, **Then** no row receives focus, opens anything or navigates anywhere; rows have no chevrons, toggles or other affordances that suggest they can be activated.
3. **Given** a screen reader, **When** the user reads the Settings page, **Then** the rows are exposed as a list of section names, each announced together with "Coming soon", and none is announced as a button or link.
4. **Given** the Settings page, **When** a screen-reader user lists its headings, groups and form controls, **Then** none refers to theme, accent or appearance.
5. **Given** the address `/settings/appearance`, **When** it is opened, **Then** it shows the same "Nothing here yet" state as any other reserved Settings address (001 decision D-001-2), with Settings marked as current. It does not show theme or accent controls.
6. **Given** any public-facing text in the app, **When** it is scanned, **Then** no text offers or mentions choosing a theme, light mode or an accent colour.

---

### User Story 3 - Everything stays readable and focus is always visible (Priority: P1)

A listener with low vision or who navigates by keyboard can read every piece of text, tell controls and their boundaries apart, and always see where focus is, on every surface of the identity: the page background, the sidebar, the player dock, cards, menus and dialogs.

**Why this priority**: Accessibility is a P0 goal (G4) and the identity is only acceptable if it meets WCAG 2.2 AA. The approved palette fixes five colours; the remaining roles (borders, dividers, danger, raised surfaces, state overlays, focus ring) must be completed and proven, not assumed.

**Independent Test**: Compute the contrast of every text/background, boundary/background and focus/background pair of the complete identity. Run the automated accessibility scan on every destination, the Not Found page and a "Nothing here yet" page. Tab through every page and check the focus indicator on every surface it can appear on.

**Acceptance Scenarios**:

1. **Given** the complete set of identity colour roles, **When** every text role is measured against every background it is used on, **Then** each pair is at least 4.5:1.
2. **Given** any boundary that carries meaning (an input outline, a control edge, a separated layer such as a menu or dialog), **When** it is measured against its adjacent colours, **Then** it is at least 3:1. The surface step alone (`#182731` on `#101B23`, 1.14:1) is never the only thing that separates meaningful elements.
3. **Given** keyboard focus on any focusable element, on any surface, **When** the indicator is measured, **Then** it is at least 3:1 against the colours next to it, and it is visible on the page background, on surfaces and on accent-filled controls.
4. **Given** a filled accent control (for example a primary button), **When** its label or icon is measured, **Then** it is at least 4.5:1 against the copper fill.
5. **Given** a destructive or error state, **When** it is shown, **Then** it is clearly distinguishable from the copper accent and is never conveyed by colour alone; it always carries an icon or text.
6. **Given** every page in this feature's scope, **When** the automated accessibility scan runs, **Then** it reports 0 serious or critical violations.
7. **Given** any page, **When** the page background is inspected, **Then** it is never pure black (`#000000`).

---

### User Story 4 - High-contrast (forced-colours) mode still works (Priority: P2)

A listener who uses the operating system's high-contrast mode (for example Windows High Contrast) sees the app in their chosen system colours instead of the identity. They can still read everything, see which destination is active, see selected and disabled states, and see keyboard focus.

**Why this priority**: Constitution IX v2.0.0 makes forced colours a MUST, and the forced-colours mode is the high-contrast path now that no light theme exists (ADR-011). Fewer listeners rely on it than on Stories 1–3, so it is P2, but it is required for acceptance.

**Independent Test**: With forced colours emulated in Chromium (the automated acceptance check, D-014-2), visit every page in scope and tab through it. The active navigation item, any selected or disabled state and the focus indicator are all visible, and no text disappears.

**Acceptance Scenarios**:

1. **Given** forced-colours mode is on, **When** any page in scope is shown, **Then** all text and icons are visible in the system colours.
2. **Given** forced-colours mode is on, **When** the user looks at the navigation, **Then** the active destination is distinguishable from the others by something other than colour or background alone (for example the filled icon, an outline or a marker).
3. **Given** forced-colours mode is on, **When** keyboard focus moves, **Then** a visible focus outline is shown on every focusable element.
4. **Given** forced-colours mode is on, **When** a disabled or selected state is shown, **Then** it remains distinguishable.

---

### Edge Cases

- **Light system appearance at the moment of first load.** The first painted frame is already dark; there is no brief light frame before the identity applies.
- **Leftover appearance data from 001.** A stored theme or accent value (valid, unknown or corrupt) is ignored, removed, and causes no error or console warning visible to the user.
- **Device storage unavailable** (private mode, blocked storage). The identity does not depend on storage, so it appears unchanged; the removal of leftover data is skipped without error.
- **Script disabled or still loading.** The identity is fully present before and without any script running.
- **Forced colours combined with a narrow (320 px) screen or 200% zoom.** Navigation, state and focus stay visible and nothing overflows horizontally.
- **Reduced motion.** The identity introduces no new animation; the system reduced-motion preference keeps being honoured as in 001.
- **Old links or bookmarks to `/settings/appearance`.** They show the reserved "Nothing here yet" state, never an error.
- **Print.** Not a supported use; no print styling is required (assumption).

## Requirements *(mandatory)*

### Functional Requirements

**The identity**
- **FR-001**: The app MUST present one permanent dark visual identity, Abyss Copper, on every page, using the approved values: page background `#101B23`, surface `#182731`, accent Muted Copper `#D8AD88`, primary text `#E8EDF0`, secondary text `#A9B9C1` ([design-system.md §2.1](../../docs/design-system.md#21-approved-palette)).
- **FR-002**: The identity MUST be complete before acceptance: every colour role listed as "to be derived in the 014 plan" in [design-system.md §2.1](../../docs/design-system.md#21-approved-palette) (raised surface, strong border, divider, danger, on-accent, accent hover and pressed, hover/pressed/selected overlays, focus ring colour and offset, Now Playing scrim) MUST have a recorded value and computed contrast, and design-system §2 MUST be updated with them in the same change (constitution XV).
- **FR-003**: Every colour in the interface MUST come from the identity's named roles. No surface may keep a colour from the withdrawn 001 Light, Dark or OLED Black themes or from the 8 accent presets.
- **FR-004**: The identity MUST be visible from the first painted frame of every load, with no script, stored value or user choice involved, so that no frame shows another colour scheme, another accent or unstyled content.
- **FR-005**: The app MUST declare a dark colour scheme so that native browser surfaces (scrollbars, form controls) render dark.
- **FR-006**: The system light/dark preference MUST NOT change anything in the app, at load or while it is open.
- **FR-007**: The page background MUST never be pure black (`#000000`). Large copper-filled surfaces, neon or highly saturated accents and glow effects MUST NOT be used; copper fills are limited to small controls ([design-system.md §2](../../docs/design-system.md#2-color)).
- **FR-008**: The accent MUST be used only for the roles in [design-system.md §1 and §2.2](../../docs/design-system.md#22-accent) (active navigation item, primary action, slider fill, focus ring, selection, "now playing" indicator), never for body text blocks or large surfaces.

**Contrast and accessibility**
- **FR-009**: Every text role MUST meet at least 4.5:1 against every background role it is used on, including text on accent-filled controls.
- **FR-010**: Every meaningful boundary (control outlines, input edges, separated layers such as menus and dialogs) MUST meet at least 3:1 against its adjacent colours. The surface/background step alone MUST NOT be the only separation of meaningful elements.
- **FR-011**: The keyboard focus indicator MUST meet at least 3:1 against adjacent colours on every surface it can appear on, including the page background, surfaces and accent-filled controls.
- **FR-012**: Danger and error states MUST be clearly distinguishable from the accent and MUST NOT rely on colour alone.
- **FR-013**: Contrast of the complete identity MUST be verified automatically from the identity's own values, so that any later change to a value that breaks a ratio fails the checks (constitution X).
- **FR-014**: In forced-colours mode, all content, the active navigation item, selected, pressed and disabled states, and the focus indicator MUST stay visible and usable. State MUST NOT be shown by colour or background alone ([design-system.md §2.5](../../docs/design-system.md#25-forced-colours)). Acceptance evidence is an automated check in Chromium with forced colours emulated; the manual check on real Windows High Contrast is Deferred to Phase 06 closed-beta preparation (D-014-2).
- **FR-015**: Every page in scope MUST meet WCAG 2.2 AA with the identity: 0 serious or critical issues in the automated accessibility scan.

**Removal of the theme and accent system**
- **FR-016**: The Settings page MUST NOT offer theme, accent or any other appearance choice. The Appearance section and its controls MUST be removed.
- **FR-017**: The Settings page MUST show its main heading followed by a minimal, conventional list of exactly five sections, in this order: **Playback, Storage, Library & Data, Accessibility, About** (D-014-1). Each row MUST show the section name and a "Coming soon" label, and MUST be non-interactive: not focusable, not a link or button, with no affordance suggesting it can be opened. No section's controls or behaviour are built in this feature; each is delivered by its own feature (Playback, Library & Data and About: 010; Storage: 009; Accessibility: 012). The sticky in-page section index ([ux-specification.md §4.4](../../docs/ux-specification.md#44-settings-settings)) is out of scope until sections have content.
- **FR-018**: `/settings/appearance` MUST receive no special treatment: it behaves like any other reserved `/settings/<section>` address (001 D-001-2, open item O7).
- **FR-019**: The app MUST NOT store, read or apply a theme or accent preference. Any such value left on the device by an earlier version MUST be removed on load, without errors, and MUST have no visible effect.
- **FR-020**: Removal MUST be complete: no behaviour of 001 Story 4 (switching, persistence, following the system preference, OLED black) may remain reachable.

**Unchanged behaviour**
- **FR-021**: All other accepted 001 behaviour (four destinations, navigation, routes, player dock placeholder, keyboard and focus, states, display name and branding) MUST continue to pass its acceptance criteria. Only the colours change.
- **FR-022**: No public-facing surface may contain "Metrolist", "YouTube", "Spotify" or "Apple Music" (UX-AC-25).

**Documentation (constitution XV)**
- **FR-023**: When this feature is accepted, the documents that still describe theme or accent behaviour for current use MUST be reconciled in the same change: design-system §2 (derived roles, scrim ratios, focus treatment, elevation), ux-specification §4.4 (section order, D-014-1), and the [specs/README.md](../README.md) rows for 014 and 002 (002's superseded clarifications D-002-2 and the appearance half of D-002-3 are flagged for 002 to reconcile when it resumes; this feature does not edit 002's spec content).

### Key Entities

- **Visual identity**: the single fixed set of named colour roles (backgrounds, surfaces, text, accent, borders, states, focus, scrim) with their values and computed contrast. It is not a user setting and has no variants.
- **Obsolete appearance preference**: a theme or accent value saved on the device by the 001 version of the app. It is only ever removed, never read for display.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** (UX-AC-10): In recordings of 10 cold loads per destination, each with the system appearance set to light and to dark, 100% of frames with visible content show the identity (0 flashes of another colour scheme, accent or unstyled content), and the pages under light and dark system settings are identical.
- **SC-002** (UX-AC-10): On every page in scope, the browser reports a dark colour scheme, and native scrollbars and form controls render dark in all D4 browsers.
- **SC-003** (UX-AC-11): 100% of the identity's text/background pairs are at least 4.5:1, and 100% of its boundary and focus-indicator pairs are at least 3:1, computed from the identity's values and recorded in design-system §2.
- **SC-004** (UX-AC-09): The automated accessibility scan reports 0 serious or critical issues on all four destinations, the Not Found page and a "Nothing here yet" page.
- **SC-005** (UX-AC-11): With forced colours emulated in Chromium, on every page in scope the active destination and the focus indicator are visible at every Tab stop (100% of stops), and no text becomes invisible.
- **SC-006**: Settings shows exactly the five "Coming soon" rows in the D-014-1 order, with 0 focusable or activatable rows. A scan of Settings and of all public-facing text finds 0 theme, accent or appearance controls or wording, and a device holding a 001 appearance value shows the identity and no longer holds that value after one load (100% of trials, including valid, unknown and corrupt values).
- **SC-007** (UX-AC-05, -07, -25): Every 001 acceptance check outside its Story 4 still passes unchanged after this feature.
- **SC-008** (G11): The owner signs off on every touched screen at 320, 375, 768, 1024 and 1440 px, and in forced-colours mode (Chromium emulation; screenshots are sufficient, D-014-2), with no token or brand-rule violation.

## Assumptions

- **Settings rows.** The section names are fixed by D-014-1; the "Coming soon" wording can be revised without a spec change. Section order follows D-014-1, and [ux-specification.md §4.4](../../docs/ux-specification.md#44-settings-settings) is updated to the same order in the same change (constitution XV). The Accessibility section (SET-06, reduced-motion override) arrives with feature 012, not here.
- **Derived values are a plan decision.** The values of the derived roles (FR-002) are chosen in the 014 plan, within the direction rules of design-system §2. The five approved values are fixed by owner decision K1/K2 and are not revisited.
- **Now Playing scrim.** There is no expanded player yet (feature 008). This feature only records the scrim's value and recalculated ratios against the new text colour; showing it is 008's work.
- **Removal of leftover data.** Removing the obsolete 001 value is required by ADR-011. Only the device-local appearance value is affected; there is no library data yet.
- **No migration notice.** The listener is not told that the theme options were removed. The app is pre-beta, with no users besides the owner.
- **002 is out of scope.** 002 (local persistence) stays paused; it reconciles its own superseded clarifications when it resumes.
- **Browsers.** Decision D4: the latest two stable versions of Chrome, Firefox, Safari and Edge, plus iOS Safari 17+. Forced-colours acceptance uses Chromium emulation only (D-014-2). Firefox, Safari and iOS Safari are not tested in forced-colours mode.
- **Real high-contrast check deferred (D-014-2).** Not verified at 014 acceptance: rendering on a real Windows High Contrast system (Edge or Chrome), which can differ from emulation in system-colour mapping, focus outline and icon rendering. The owner's deferral is entered in the deferral register in [docs/quality-gates.md](../../docs/quality-gates.md#deferral-of-manual-verifications) when 014 is accepted, naming this residual risk and Phase 06 closed-beta preparation as the stage by which it MUST be done. G10/G11 for 014 report it as Deferred, never Passed. The automated Chromium check cannot be deferred.
- **Manual screen-reader pass.** The 001 deferral (to Phase 06 closed-beta preparation) is not changed by this feature; automated accessibility, keyboard and focus checks are not deferrable.
