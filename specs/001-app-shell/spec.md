# Feature Specification: App Shell & Navigation

**Feature Branch**: `001-app-shell`

**Created**: 2026-11-05

**Status**: Approved (owner, 2026-11-05)

**Input**: User description: "App shell with desktop sidebar navigation, mobile bottom navigation, exactly four navigation destinations (Home, Explore, Library, Settings), responsive layout, theme foundations, a global mini-player dock placeholder, loading and empty states, accessibility requirements, keyboard navigation, route preservation, and testable acceptance criteria."

**Covers**:
- Feature IDs: SHELL-01, SHELL-02, SHELL-05, SET-01, SET-02 (switching and persistence only), PLAT-02 (baseline), decision D5 (public display name)
- UX acceptance criteria, shell scope: UX-AC-05, UX-AC-07, UX-AC-09, UX-AC-10, UX-AC-11, UX-AC-25

**Sources**:
- [product-requirements.md](../../docs/product-requirements.md) §4, §5.1, §5.5, §9
- [ux-specification.md](../../docs/ux-specification.md) §2, §3, §7, §8, §9
- [design-system.md](../../docs/design-system.md) §2, §6, §7

## Clarifications

### Session 2026-11-05 (owner decisions at approval)

- **D-001-1.** Q: When an unknown address shows Not Found, should any navigation destination be marked as current?
  A: **No.** Not Found is shown inside the shell with no destination marked as current (FR-012; Story 2, scenario 8).
- **D-001-2.** Q: Which segments does `/settings/<section>` accept?
  A: **During MVP, any single segment** is reserved and shows the placeholder. **In future, the pattern MUST be restricted to Settings sections that have actually been implemented**, and every other segment shows Not Found. The restriction is owned by the Settings features: `010-settings-data`, plus `009-local-files-storage` for the Storage section (see `specs/README.md`, open item O7).

### Session 2026-11-05 (owner decision during planning)

- **D-001-3.** Q: The framework already announces each new page title through its own built-in live region (assertive), and that region cannot be turned off. Adding a second, polite region would announce every title twice. How should page changes be announced?
  A: **Use the framework's built-in announcement, and require that the page title is announced exactly once per page change.** FR-028, Story 3 scenario 3 and SC-009 were amended from "a polite announcement" to "announced once". Focus still moves to the page's main heading.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reach any destination from anywhere (Priority: P1)

On any device, the listener sees the same four destinations (Home, Explore, Library, Settings) and can reach each one with a single tap or click.
- **Desktop (≥ 1024 px):** a sidebar that can be expanded or collapsed.
- **Tablet (768–1023 px):** a collapsed icon sidebar.
- **Mobile (< 768 px):** a bottom navigation bar whose labels are always visible.

**Why this priority**: Navigation is the frame for every later feature. Without it nothing else can be reached or tested.

**Independent Test**: At 320, 375, 768, 1024 and 1440 px widths, open the app and activate each destination in turn. Each destination's page appears, and the matching navigation item is marked as the current page.

**Acceptance Scenarios**:

1. **Given** a desktop-width window, **When** the app opens, **Then** a sidebar shows exactly four items in the order Home, Explore, Library, Settings, with the app's public name at the top, and no bottom navigation bar.
2. **Given** a mobile-width window, **When** the app opens, **Then** a bottom bar shows exactly the same four items, in the same order, each with an icon and a visible text label, and there is no sidebar.
3. **Given** a tablet-width window, **When** the app opens, **Then** a collapsed sidebar shows the four items as icons, each with an accessible name and a tooltip on pointer devices.
4. **Given** any destination is open, **When** the user looks at the navigation, **Then** exactly one item is marked as the current page. It is shown with a filled icon and the accent colour, and is announced to assistive technology as the current page.
5. **Given** a desktop-width window, **When** the user collapses the sidebar, **Then** it shrinks to icons only, and all four destinations stay reachable with one click.
6. **Given** any supported width, **When** the user looks for a fifth navigation item (for example "Now Playing"), **Then** none exists.

---

### User Story 2 - Navigation preserves place and never resets the shell (Priority: P1)

The listener moves between destinations, uses the browser's Back and Forward buttons, refreshes, and opens shared or bookmarked links. They always land where they expect. The shell, including the player dock, stays in place and is never rebuilt.

**Why this priority**: Playback continuity (constitution II and IV) depends on a shell that survives navigation. That has to be proven before any player exists.

**Independent Test**: Navigate through all four destinations and at least two reserved nested addresses (FR-012), then use Back, Forward and Refresh. Then open one unknown address. The shell and player dock are never torn down, which is observable through a test marker that must persist. The address, the visible page and the active navigation item always agree.

**Acceptance Scenarios**:

1. **Given** the user is on any page, **When** they move to another destination, **Then** the navigation and the player dock stay mounted and are not re-created. Only the content area changes.
2. **Given** the user opens a reserved nested address under a destination (for example `/explore/genre/<id>` or `/library/playlists`), **When** the page renders, **Then** that destination stays marked as the current page.
3. **Given** the user has visited several destinations, **When** they press browser Back or Forward, **Then** the previous or next page appears and the active item updates to match.
4. **Given** the user is on any destination or reserved nested address, **When** they refresh or open the same address in a new tab, **Then** the same page appears, with the same active destination.
5. **Given** the user is on a destination's root page and has scrolled down, **When** they select that destination again, **Then** the content scrolls to the top.
6. **Given** the user is on a nested page under a destination, **When** they select that destination's navigation item, **Then** they return to the destination's root page.
7. **Given** a reserved nested address (FR-012), for example `/library/liked` or `/explore/artist/<id>`, **When** it is opened, **Then**:
   - the shell renders with that address's parent destination marked as current;
   - the content area shows a "Nothing here yet" state with a link back to the destination root;
   - it never shows a blank screen or the Not Found page.
8. **Given** an unknown address, **When** it is opened, **Then** the in-shell Not Found page appears, with no navigation item marked as current and a link to Home. Examples of unknown addresses:
   - `/radio`, which is under no destination;
   - `/library/podcasts`, an unreserved segment under a destination;
   - `/explore/genre`, a reserved pattern with its required segment missing;
   - `/explore/album/<id>/extra`, a reserved pattern with extra segments.
9. **Given** the Not Found page is shown, **When** the user selects any navigation item, **Then** that destination opens normally.

---

### User Story 3 - Keyboard and screen-reader users can do everything (Priority: P1)

A listener using only a keyboard, or a screen reader, can skip repeated content, understand where they are, move through the navigation, and know when the page has changed.

**Why this priority**: Accessibility is a P0 goal (G4). Patterns set in the shell are inherited by every later screen.

**Independent Test**: Complete the Story 1 and Story 2 flows using only the keyboard, and again with a screen reader. Run an automated accessibility scan on every destination in every theme.

**Acceptance Scenarios**:

1. **Given** a freshly loaded page, **When** the user presses Tab, **Then** the first focusable element is "Skip to content". Activating it moves focus to the main content. No "Skip to player" link exists in this feature, because the player dock has no interactive controls (it is deferred to feature 008).
2. **Given** the user tabs through the page, **When** focus moves, **Then**:
   - the order is logical: skip link, navigation, content;
   - every interactive element is reachable;
   - the idle player dock receives no focus;
   - a visible focus indicator with at least 3:1 contrast is always shown.
3. **Given** the user activates a navigation item, **When** the new page renders, **Then** focus moves to that page's main heading and the page title is announced to assistive technology exactly once (D-001-3).
4. **Given** a screen reader, **When** the user lists the page's landmarks, **Then** they find:
   - one navigation landmark (the sidebar or the bottom bar, whichever is shown);
   - one main content landmark;
   - a region labelled "Player" for the player dock, when it is shown.
5. **Given** any interactive control in the shell, **When** it is inspected, **Then** it has an accessible name, and icon-only controls also show a tooltip on pointer devices.
6. **Given** a touch layout, **When** the user taps navigation items, **Then** each target is at least 44×44 px. On pointer layouts, every target is at least 24×24 px.

---

### User Story 4 - Choose a theme and accent that stick (Priority: P2)

From Settings, the listener picks a theme (System, Light, Dark or OLED Black) and one of 8 accent colours. The change applies immediately, without a reload. It is still in effect after a reload or browser restart, and a cold load never briefly shows the wrong theme.

**Why this priority**: The theme foundation (tokens, contrast, persistence) must exist before screens are built on it. It is less critical than reaching and using the destinations.

**Independent Test**: In Settings, select each theme and accent combination, then reload. Record the page throughout loading to check that no content is ever visible in a different theme or accent. Run contrast and accessibility checks in each theme.

**Acceptance Scenarios**:

1. **Given** the Settings page, **When** the user opens the Appearance section, **Then** theme is presented as a single-choice group of System, Light, Dark and OLED Black, each with a preview. Accent is presented as a single-choice group of 8 named swatches, with Violet as the default.
2. **Given** a theme or accent is selected, **When** the selection changes, **Then** the change takes effect immediately. By the time the control shows the new choice, the whole visible interface (navigation, content and player dock) shows the new theme or accent, with no reload, no navigation and no Save button.
3. **Given** the user selected Dark and Teal, **When** they reload or restart the browser, **Then** the app opens in Dark with Teal. The persisted theme and accent are applied before any application content becomes visible, so there is no visible flash of Light, of the default accent, or of unstyled content.
4. **Given** the theme is System, **When** the operating system switches between light and dark, **Then** the app follows the change without a reload.
5. **Given** OLED Black is selected, **When** any page is shown, **Then** the page background is pure black (#000000).
6. **Given** any theme and accent, **When** the text and control colours are measured, **Then** every text/background pair meets WCAG AA (≥ 4.5:1 for text, ≥ 3:1 for control borders and the focus indicator), per [design-system.md §2](../../docs/design-system.md#2-color).
7. **Given** a first-time visitor who has made no choice, **When** the app opens, **Then** the theme is System and the accent is Violet.

---

### User Story 5 - A player dock is reserved without pretending to play (Priority: P2)

The shell reserves the space where the global player will live. With nothing playing, desktop and tablet show an idle bar reading "Nothing playing". On mobile the dock stays hidden. Page content is never hidden behind the dock or the navigation.

**Why this priority**: It fixes the layout contract the Global Player UI (feature 008) will fill, so later screens don't have to be re-laid out.

**Independent Test**: At every supported width, scroll each destination to the bottom. The last content element is fully visible above the dock and navigation. The idle dock is shown or hidden according to the width.

**Acceptance Scenarios**:

1. **Given** a desktop or tablet width and nothing playing, **When** any page is shown, **Then** a bar along the bottom reads "Nothing playing" and has no active playback controls.
2. **Given** a mobile width and nothing playing, **When** any page is shown, **Then** no mini player is shown, and only the bottom navigation sits at the bottom edge.
3. **Given** any width, **When** the user scrolls to the end of a page, **Then** no content is covered by the dock or the navigation, including on devices with a home-indicator safe area.
4. **Given** the idle dock, **When** the user moves between destinations, **Then** the dock stays mounted (see Story 2, scenario 1).

---

### User Story 6 - Honest placeholder, loading and error states (Priority: P3)

Before their features are built, each destination shows a clear placeholder: a heading and a short "coming soon"-style empty state. Slow loads show a shape-matched skeleton only after a short delay. If a page fails, the shell, the navigation and the player dock keep working, and the user can recover.

**Why this priority**: It establishes the state patterns (UX-AC-22) later features reuse. Destinations have no real data yet, so the user-facing impact is smaller.

**Independent Test**: Visit each destination and check its empty state. Simulate a slow page and a failing page through a test-only hook, then check the delayed skeleton and the in-shell error with Retry.

**Acceptance Scenarios**:

1. **Given** any destination, **When** it renders, **Then** it shows its name as the main heading and an empty state with a one-line explanation of what will appear there.
2. **Given** a page whose content takes less than 150 ms, **When** it loads, **Then** no skeleton is shown.
3. **Given** a page whose content takes longer than 150 ms, **When** it loads, **Then** a skeleton in the shape of the content is shown until it is ready. Exactly one of loading, empty, error or ready is visible at a time.
4. **Given** a page fails while rendering, **When** the error occurs, **Then** an error state appears inside the content area with a plain-language message and a working **Retry**. The navigation and player dock stay usable.
5. **Given** the whole app fails outside any page, **When** the error occurs, **Then** a full-screen recovery screen offers **Reload**. No raw error details are shown to the user.
6. **Given** the user prefers reduced motion at system level, **When** transitions would run, **Then** they are replaced with simple fades or removed.

---

### Edge Cases

- **Very narrow screens (320 px) and 200% zoom.** No horizontal page scroll. The navigation labels still fit or truncate with full accessible names. Every destination stays reachable.
- **Crossing a breakpoint.** When the window is resized (or a device rotated) from mobile to desktop width and back, the active destination and the current page are preserved and the navigation form switches. Focus is not lost to the document start if the focused element still exists.
- **Theme storage unavailable** (private mode, blocked storage). Theme and accent still switch for the session. After a reload the app falls back to System and Violet without errors.
- **A stored theme or accent value that is unknown or corrupt.** The app ignores it and uses the defaults.
- **Slow start-up** (slow device or network). Whatever content becomes visible first is already in the persisted theme and accent, and the navigation is visible.
- **Long public name.** The name truncates in the sidebar, and the full name stays available to assistive technology.
- **Red accent.** Destructive actions are never shown through colour alone. They always carry an icon and a label, so they stay distinguishable from accent-coloured elements.
- **Re-selecting the active destination while already at the top of its root page.** Nothing happens. There is no reload and no focus jump.

## Requirements *(mandatory)*

### Functional Requirements

**Navigation and information architecture**
- **FR-001**: The app MUST provide exactly four primary destinations, Home (`/`), Explore (`/explore`), Library (`/library`) and Settings (`/settings`), always in that order and with those names.
- **FR-002**: The app MUST NOT present Now Playing, or anything else, as an additional primary destination.
- **FR-003**: Below 768 px the app MUST show a bottom navigation bar with icon and label for each destination.
- **FR-004**: From 768 to 1023 px the app MUST show a collapsed icon sidebar.
- **FR-005**: At 1024 px and above the app MUST show a sidebar that the user can expand (240 px) or collapse (72 px).
- **FR-006**: Exactly one navigation form (sidebar or bottom bar) MUST be present at any width.
- **FR-007**: The sidebar MUST contain only the public app name and the four destinations. Its playlist shortcuts area is out of scope until the Library feature (005) and MUST NOT appear as an empty box.
- **FR-008**: The active destination MUST be indicated visually by a filled icon and the accent colour, and programmatically as the current page. Nested addresses MUST keep their parent destination active.

**Route behaviour**
- **FR-009**: Every destination and every reserved nested address (FR-012) MUST be directly loadable by URL, survive a refresh, and work with browser Back and Forward, keeping the parent destination marked as current. Unknown addresses MUST also be directly loadable and show Not Found.
- **FR-010**: Selecting the already-active destination MUST scroll its root page to the top. From a nested page, it MUST return to the destination root.
- **FR-011**: Moving between pages MUST NOT unmount or re-create the navigation or the player dock.
- **FR-012**: Addresses MUST be classified as a destination root, a reserved nested address, or unknown.
  - **Reserved nested addresses** are exactly the secondary routes approved in [product-requirements.md §4](../../docs/product-requirements.md#4-information-architecture). Here `<id>` and `<section>` each stand for exactly one non-empty path segment:
    - **Explore:**
      - `/explore/search` (with or without `q` and `type` parameters)
      - `/explore/genre/<id>`
      - `/explore/mood/<id>`
      - `/explore/artist/<id>`
      - `/explore/album/<id>`
    - **Library:**
      - `/library/liked`
      - `/library/playlists`
      - `/library/playlist/<id>`
      - `/library/albums`
      - `/library/artists`
      - `/library/recent`
    - **Settings:**
      - `/settings/<section>`
  - In this feature, a reserved nested address MUST show the in-shell "Nothing here yet" state, with its parent destination marked as current and a link to that destination's root. Content for these addresses arrives with features 004, 005 and 010.
  - **Every other address is unknown.** That includes extra or missing segments on a reserved pattern and unreserved segments under a destination. An unknown address MUST show the in-shell Not Found page, with no destination marked as current and a link to Home. The navigation stays usable.
- **FR-013**: Remembering per-destination scroll position or the last nested route (SHELL-03) is out of scope.

**Layout and player dock**
- **FR-014**: Layouts MUST work at every width from 320 px to at least 1600 px, with no horizontal page scroll. Content MUST be limited to a 1600 px maximum width.
- **FR-015**: Page content MUST be padded so that the player dock, the navigation and the device safe-area inset never cover it.
- **FR-016**: On desktop and tablet with nothing playing, the shell MUST show an idle player dock labelled "Nothing playing". On mobile with nothing playing, it MUST hide the dock.
- **FR-017**: The player dock MUST have no functional playback controls in this feature.

**Theme foundations**
- **FR-018**: Users MUST be able to choose a theme (System, Light, Dark, OLED Black) and an accent (Violet, Blue, Teal, Green, Amber, Orange, Rose, Red) in Settings → Appearance. The defaults are System and Violet.
- **FR-019**: Theme and accent changes MUST take effect immediately on selection. By the time the control shows the new choice, the whole visible interface MUST show it, with no reload, navigation or Save action, and no part of the interface left in the previous theme or accent.
- **FR-020**: Theme and accent MUST persist across reloads and browser restarts on the same device.
- **FR-021**: On initial load, the persisted theme and accent (or the defaults, if none are stored) MUST be applied before any application content becomes visible. At no point during loading may the interface be visible in a different theme or accent.
- **FR-022**: The System theme MUST follow the operating system's light/dark preference live.
- **FR-023**: Every colour in the interface MUST come from the named design tokens in [design-system.md](../../docs/design-system.md). The token values MUST meet the contrast ratios listed there in every theme.
- **FR-024**: The Settings page MUST show only the Appearance section in this feature. Other Settings sections are out of scope.

**Accessibility and input**
- **FR-025**: The shell MUST meet WCAG 2.2 AA.
- **FR-026**: "Skip to content" MUST be the first focusable element on every page and MUST move focus to the main content. The player dock in this feature is non-interactive, so it MUST NOT receive focus, and no "Skip to player" link is provided. "Skip to player" is deferred to the Global Player UI (feature 008), which introduces interactive player controls.
- **FR-027**: The shell MUST expose landmarks for navigation, main content and the player region labelled "Player".
- **FR-028**: On every page change, focus MUST move to the page's main heading, and the new page title MUST be announced to assistive technology exactly once (D-001-3).
- **FR-029**: A visible focus indicator (≥ 3:1 contrast) MUST be shown on every focusable element when it receives keyboard focus.
- **FR-030**: Touch-primary navigation targets MUST be at least 44×44 px. All other pointer targets MUST be at least 24×24 px.
- **FR-031**: Icon-only controls MUST have an accessible name and, on pointer devices, a tooltip.
- **FR-032**: The system reduced-motion preference MUST be honoured. An in-app override is out of scope (SET-06, feature 012).
- **FR-033**: Global playback keyboard shortcuts (SHELL-04) are out of scope. They arrive with the Global Player UI (008).

**States and recovery**
- **FR-034**: Every destination MUST render a main heading and an empty state explaining what will appear there.
- **FR-035**: Asynchronous content areas MUST show exactly one of loading, empty, error or ready. Skeletons MUST NOT appear for loads under 150 ms.
- **FR-036**: A failure inside a page MUST be contained to the content area and offer Retry, with the navigation and player dock still usable (SHELL-05).
- **FR-037**: A failure of the whole app MUST show a recovery screen with Reload.
- **FR-038**: User-facing error messages MUST be plain and blame-free, and MUST offer a next step.

**Branding (D5)**
- **FR-039**: The public app name MUST come from a single configurable display name. Its default is "Music Player".
- **FR-040**: The display name MUST be used in the window/tab title and page metadata. Each page's title MUST include that page's name.
- **FR-041**: No public-facing surface may contain "Metrolist", "YouTube", "Spotify" or "Apple Music". That covers rendered text, titles, metadata and any built output.
- **FR-042**: Scaffold placeholder titles and descriptions MUST be removed.

### Key Entities

- **Destination**: one of the four fixed top-level areas. It has a name, an address, an icon and a display order. The set is fixed by the constitution (Principle III).
- **Appearance preference**: the user's chosen theme (System, Light, Dark or OLED Black) and accent (one of 8 presets). It is stored on the device and has defaults.
- **Display name**: the single public name of the app, used across every public surface.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** (UX-AC-05): At 320, 375, 768, 1024 and 1440 px widths, 100% of the four destinations are reachable with one tap or click. There is no horizontal page scroll, and no content is hidden behind the navigation or the player dock.
- **SC-002** (UX-AC-07): A keyboard-only user can reach every interactive element in the shell and complete the Story 1, 2 and 4 flows with no pointer. A visible focus indicator of at least 3:1 contrast is present at every step.
- **SC-003** (UX-AC-09): An automated accessibility scan reports 0 serious or critical issues on every destination, the not-found page and the "Nothing here yet" page, in Light, Dark and OLED themes.
- **SC-004** (UX-AC-10): Across every theme and accent combination:
  - selecting a theme or accent changes the whole visible interface immediately, with no reload or Save, and no element is left in the old theme;
  - after a reload or restart, the choice persists in 100% of trials;
  - in recordings of 10 cold loads per theme, application content is never visible in a theme or accent other than the persisted one (0 flashes).
- **SC-005** (UX-AC-11): 100% of the text/background and control/background token pairs meet AA in Light, Dark and OLED. OLED page background is #000000.
- **SC-006** (UX-AC-25): A scan of the rendered pages, titles, metadata and built output finds 0 occurrences of "Metrolist", "YouTube", "Spotify" or "Apple Music".
- **SC-007**: Across 10 consecutive navigations covering all four destinations and two reserved nested addresses, the navigation and the player dock are created exactly once. They are never re-created.
- **SC-008**: Browser Back, Forward and Refresh on any destination or reserved nested address always show the matching page and active item (100% of tested addresses). Every reserved pattern in FR-012 shows "Nothing here yet" under the correct destination. Each unknown-address example in Story 2, scenario 8 shows Not Found (100% of cases).
- **SC-009**: After every navigation, focus is on the new page's main heading, and its title is announced exactly once to screen-reader users (verified in a manual pass with at least one desktop and one mobile screen reader).
- **SC-010**: A simulated page failure leaves navigation usable, and Retry recovers the page without a full reload.

## Assumptions

- **Placeholder copy.** Destination empty-state text is placeholder copy, for example "Your personal mixes and recent music will appear here." for Home. It can be revised without a spec change.
- **Reserved nested addresses.**
  - These are exactly the PRD §4 secondary routes (FR-012). Only their placeholder behaviour is in scope here. Item lookup, and "this item isn't available" states for an unknown `<id>`, arrive with the features that own each route.
  - `/settings/<section>` reserves any single segment during MVP only (decision D-001-2). Once Settings sections are implemented, it MUST be restricted to them, and any other segment becomes Not Found.
- **Skip to player.** Deferring "Skip to player" to feature 008 is an owner decision (2026-11-05). It keeps the skip links honest while the dock has nothing to operate.
- **Persistence location.** Theme and accent are stored on the device only. How they are stored, and how that store later aligns with the local-persistence feature (002), is a planning decision (see open item O3 in [specs/README.md](../README.md)).
- **Sidebar collapse state.** Remembering whether the sidebar is expanded or collapsed is not required in this feature.
- **Browsers.** Supported browsers are those in decision D4: the latest two stable versions of Chrome, Firefox, Safari and Edge, plus iOS Safari 17+.
- **No public name yet.** No public name has been chosen. "Music Player" is used until the owner decides.
- **No real playback.** No real audio, catalog data or library data is involved in this feature.
