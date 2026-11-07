# Feature Specification: Local Persistence Foundation

**Feature Branch**: `002-local-persistence`

**Created**: 2026-11-06

**Status**: Draft · reconciled 2026-11-07 after 014 (single permanent visual identity); clarification session 2026-11-07 in progress. Not approved (G1)

**Input**: User description: "002-local-persistence — Local persistence foundation (roadmap Phase 02; specs/README.md row 002). Covers PLAT-01 as scoped in the feature index: library and settings storage in the browser, and a private-mode / storage-unavailable fallback. Depends on 001-app-shell (accepted 2026-11-06), which ships the appearance settings store on the device. Do not include UI features of later specs (Library screens, playback, backup export/import SET-04, storage management SET-07, quota handling PLAT-06) beyond what PLAT-01's foundation needs; raise any scope question as [NEEDS CLARIFICATION] rather than inventing a decision."

**Covers**:
- Feature IDs: PLAT-01, library part built here; the settings area is only defined here and built by feature 010 (D-002-5); the player snapshot part is feature 007, per the index split ᵇ
- UX acceptance criteria: UX-AC-12 (persistence of library data, at foundation scope; the backup-comparison method arrives with SET-04 in 010). UX-AC-10 (the no-flash identity) is no longer carried here: theme persistence was withdrawn with SET-01 and SET-02 and UX-AC-10 is owned by 014 (D-002-4)
- Open item O3 (specs/README.md §4): **superseded by O8** (2026-11-07). No appearance setting remains, so there is no pre-paint mirror to make non-authoritative (D-002-4)

**Sources**:
- [product-requirements.md](../../docs/product-requirements.md) §5.5 (SET-01 and SET-02 withdrawn), §5.7 (PLAT-01), §9 (D2)
- [architecture.md](../../docs/architecture.md) §5, §7, §11, §12 (concepts and rules only; this spec does not choose the implementation)
- [ux-specification.md](../../docs/ux-specification.md) §7 ("Storage unavailable"), §9 (UX-AC-12)
- [014 spec](../014-visual-identity/spec.md) (the withdrawal of the appearance settings; its `ObsoleteDataCleaner`)

## Clarifications

### Session 2026-11-06 (owner answers to the draft's questions)

- **Q1 (D-002-1).** Q: Does the store's first version define only the library and settings storage areas, or all areas, including those owned by later features?
  A: **All areas.** The first version defines every storage area in the approved persistence design (settings, library data, snapshots, recent searches, play history, player snapshot, imported audio files and artwork). This feature builds and tests only the library and settings areas; features 007 and 009 fill in theirs without a version upgrade (FR-002).
- **Q2 (D-002-2). Superseded 2026-11-07 (O8, 014): there is no appearance choice or pre-paint copy any more.** Q: When the device store is unavailable, is the appearance choice still written to the pre-paint copy so it survives a reload?
  A: **Yes (answer changed by the owner, 2026-11-06, from "nothing is written").** In that mode the pre-paint copy is still written, so the theme and accent survive a reload when that copy is writable; the device store is not written. The banner wording is adjusted so it stays true (Story 2 scenario 2, FR-017, FR-018).
- **Q3 (D-002-3). Appearance half superseded 2026-11-07 (O8, 014); the library-data half stands (FR-014).** Q: Do appearance changes made in one tab apply to other open tabs?
  A: **Yes, right away**, consistent with library data (FR-014). Other open tabs switch to the new theme and accent without a reload.

### Session 2026-11-07 (reconciliation after 014, and owner answers)

- **D-002-4.** Reconciliation (not a question): 014 was accepted on 2026-11-07, which withdrew SET-01 and SET-02. This spec therefore no longer covers any appearance behaviour. Removed: the appearance user story, FR-005 to FR-009 and FR-018 (IDs kept, not reused), SC-002 and SC-004, the Appearance mirror entity, UX-AC-10 and open item O3 from its coverage, and the appearance parts of FR-014, SC-003, SC-006, SC-008 and the edge cases. Stories were renumbered and re-prioritised: saved library data is now Story 1 (P1), the unavailable-store fallback Story 2 (P1), safe upgrades Story 3 (P2).
- **D-002-5.** Q: Now that theme and accent are gone and no setting exists to store, should this feature still build and test the settings storage area, or only define it in the first storage version?
  A: **Define it only.** The first storage version defines the settings area (D-002-1, so no later upgrade), but this feature builds and tests only the library areas. Feature 010 adds settings read, write and validation together with its first real setting (FR-002).
- **D-002-6.** Q: What should the banner say when the device store is unavailable for a reason other than private browsing (blocked site data, data cleared mid-session, data written by a newer app version)?
  A: **One neutral sentence for every cause: "Storage is unavailable: your changes won't be saved."** (browsers do not reliably reveal private mode). When the cause is stored data from a newer app version (FR-023), the banner adds a second sentence: "Data from a newer version of the app was found and has been left untouched." UX §7 is updated to the neutral wording in the same change (FR-017, FR-023).

## User Scenarios & Testing *(mandatory)*

This feature has almost no screens of its own. It gives the listener one promise: what they save on this device stays saved. The screens that create library data (Explore, Library, Home) come in features 004–006 and build on it. Where no screen exists yet, the scenarios are verified through the app's data layer and test hooks, as the Independent Test lines state.

### User Story 1 - Saved library data survives reloads and restarts (Priority: P1)

Everything the later features will let a listener save on this device — likes, playlists with their order, saved albums, artists and tracks, the track details needed to show them, and recent searches — is kept exactly as saved across reloads, browser restarts and app updates, without any network.

**Why this priority**: It is the core of this feature now that no appearance setting remains (D-002-4). No screen creates this data yet, but features 004–006 depend on it, so it must be correct and tested before they start.

**Independent Test**: Through the data layer (and a test hook in E2E): save one item of each kind, reload and restart, and read everything back; compare it with what was saved. Repeat in Chromium, Firefox and WebKit.

**Acceptance Scenarios**:

1. **Given** a playlist with items in a chosen order, **When** the app is reloaded or the browser restarted, **Then** the playlist, its name, description and exact item order are unchanged.
2. **Given** a liked track and a saved album, artist and track, **When** the app restarts with no network, **Then** each is still there, with the details needed to display it, without asking the catalog.
3. **Given** two writes that belong together (for example, a playlist change and the track details it needs), **When** one of them fails, **Then** neither is kept; nothing is left half-saved.
4. **Given** a stored record that fails validation when read, **When** it is read, **Then** it is skipped (or replaced by defaults, for settings), the rest of the data loads, and the problem is recorded for diagnostics without reaching the listener as an error.

---

### User Story 2 - The app keeps working when the device cannot save (Priority: P1)

In some private-browsing modes, or when the browser blocks site storage, the device store cannot be opened. The listener can still use the whole app for the session. A persistent banner tells them their changes won't be saved.

**Why this priority**: A broken or blank app in private mode would fail every later feature. The fallback has to exist before anything depends on the store.

**Independent Test**: Start the app with the device store made unavailable. The shell and navigation work; the banner "Storage is unavailable: your changes won't be saved." is shown on every page; reloading loses the session's changes; no error reaches the listener.

**Acceptance Scenarios**:

1. **Given** the device store cannot be opened, **When** the app starts, **Then** it starts normally, shows the banner on every page, and every feature keeps its data in memory for the session.
2. **Given** that mode, **When** the listener uses any feature that saves data, **Then** the change applies immediately for the session and is held in memory only.
3. **Given** that mode, **When** the listener reloads, **Then** session-only data is gone and the banner is shown again.
4. **Given** the banner, **When** it is read by a screen reader or reached by keyboard, **Then** it is announced as a status message and never takes focus or blocks content.

---

### User Story 3 - App updates never lose saved data (Priority: P2)

When a new version of the app changes how data is stored, the listener's saved data is carried over automatically. An old version open in another tab never corrupts it.

**Why this priority**: Every later feature that adds stored data relies on safe upgrades. The rules must be fixed now, while the store is new.

**Independent Test**: Load fixture stores from every earlier storage version and open them with the current version: all data is kept and readable. Open the app in two tabs where one runs an older version: the newer one upgrades safely or waits, and neither loses data.

**Acceptance Scenarios**:

1. **Given** data stored by an earlier storage version, **When** the current version opens it, **Then** it is upgraded automatically and every record is kept.
2. **Given** an upgrade that would remove or transform data irreversibly, **When** such a version is prepared, **Then** it MUST NOT ship unless the listener is first offered an export of their data (export arrives with feature 010; until then no destructive upgrade may ship).
3. **Given** the app is open in another tab with an older storage version, **When** a newer version needs to upgrade, **Then** no data is lost; the listener is told to close the other tab or reload, and the older tab stops writing.
4. **Given** data stored by a *newer* version than the running app (for example after a rollback), **When** the app starts, **Then** it does not overwrite or downgrade that data, and it falls back to the storage-unavailable behaviour of Story 2 with an explanation.

---

### Edge Cases

- **Store opens slowly.** The shell appears without waiting for the device store. Screens that need stored data show their loading state until it is ready.
- **Store becomes unavailable mid-session** (for example, the browser clears site data). The app does not crash: it switches to the Story 2 behaviour and shows the banner.
- **Storage full.** A write that fails because storage is full is reported as a storage error to the calling feature, and nothing half-written is kept. Quota checks, warnings and the storage screen are features 009 (PLAT-06, SET-07), not this one.
- **Multiple tabs.** Library data saved in one tab is visible in the other open tabs without a reload (FR-014).
- **Clock changes.** Records keep the times they were saved with; ordering by "recently saved" uses those stored times.
- **Unknown fields in stored records** (written by a newer feature) are kept when the record is rewritten, never silently dropped.

## Requirements *(mandatory)*

### Functional Requirements

**Store and scope**
- **FR-001**: The app MUST keep the listener's settings and library data in one on-device store (decision D2), with no network, account or server involved (constitution VI, XIII).
- **FR-002**: The store's first version MUST define the storage areas for: settings; likes; playlists (with ordered items); saved library items (albums, artists, tracks); track, album and artist details snapshots; and recent searches. It MUST also define the areas owned by later features (play history, player snapshot, imported audio files and artwork), so those features need no version upgrade. This feature builds and tests only the library areas; the settings area is defined but not built, and feature 010 adds its read, write and validation with its first real setting (D-002-1, D-002-5).
- **FR-003**: Each storage area MUST be read and written only through the app's data-access layer, never directly by screens (constitution VIII; architecture §3).
- **FR-004**: Business rules that belong to consuming features (for example the cap of 10 recent searches, EXP-02, or history pruning) are NOT part of this feature; the store MUST allow them to be enforced by those features.

**Settings and appearance (removed)**
- **FR-005 to FR-009**: Removed (O8, D-002-4). They covered the appearance choice (device store as authority, the pre-paint mirror, the one-time copy from 001, validation of settings on read, and the no-flash guarantee). SET-01 and SET-02 are withdrawn, and the no-flash identity is owned by 014. Settings validation (the old FR-008) arrives with feature 010's first setting (D-002-5). The IDs are kept and not reused.

**Library data**
- **FR-010**: Likes, playlists (name, description, ordered items, creation and update times), saved albums, artists and tracks, and recent searches MUST survive a reload, a browser restart and an app update exactly as saved (UX-AC-12).
- **FR-011**: The details needed to display a saved track, album or artist (title, artists, artwork reference, duration and similar, per architecture §5) MUST be stored with it, so saved items display with no network and without the catalog.
- **FR-012**: Writes that belong together MUST be all-or-nothing; a failed write MUST NOT leave partial data.
- **FR-013**: Stored records MUST be validated when read. An invalid record MUST be skipped without blocking the rest, and the failure MUST be recorded for diagnostics (PLAT-05 will export it) without being shown to the listener as an error.
- **FR-014**: Changes saved in one tab MUST become visible in other open tabs of the same browser without a reload, in library views.
- **FR-015**: Fields in a stored record that the running version does not know MUST be preserved when that record is rewritten.

**Unavailable store (private mode)**
- **FR-016**: If the device store cannot be opened, or becomes unavailable during a session, the app MUST keep working with in-memory storage for the session, with the same behaviour for every feature except that nothing survives a reload.
- **FR-017**: In that mode the app MUST show a persistent banner on every page reading "Storage is unavailable: your changes won't be saved.", the same for every cause: private mode, blocked site data, data cleared mid-session, or data from a newer version (D-002-6; UX §7). It MUST be announced as a status message, MUST NOT take focus, MUST NOT cover content or the navigation, and MUST meet the 001 accessibility rules.
- **FR-018**: Removed (O8, D-002-4). It covered the appearance choice in the unavailable-store mode. The ID is kept and not reused.
- **FR-019**: Errors from the store MUST be reported to callers as the storage error kinds in architecture §11 (unavailable, quota exceeded, version conflict), never as unhandled errors.

**Upgrades**
- **FR-020**: Every change to the stored data's structure MUST come with an automatic upgrade from each earlier version, tested against fixture data from each earlier version.
- **FR-021**: No upgrade that removes or irreversibly transforms data may ship unless the listener is first offered an export of their data (architecture §12). Until export exists (feature 010), such upgrades are not allowed.
- **FR-022**: If another tab holds an older version open and blocks an upgrade, no data may be lost; the listener MUST be told to close the other tab or reload, and the older tab MUST stop writing.
- **FR-023**: If the stored data was written by a newer version than the running app, the app MUST NOT modify it and MUST behave as in FR-016. The banner adds the sentence "Data from a newer version of the app was found and has been left untouched." (D-002-6).

**Testability**
- **FR-024**: Test-only hooks MAY be added to make the store unavailable, seed data and read it back in E2E, under the same rules as 001 (excluded from normal production builds; ui-shell.md §7.2 of 001).

### Key Entities *(concepts per architecture §5 and §12; field names are illustrative)*

- **Setting**: a named value validated on read, with a default. The area is defined in the first storage version, but no setting exists and nothing reads or writes it until feature 010 (D-002-5).
- **Like**: a liked track and when it was liked.
- **Playlist**: a user-owned, ordered list of items, with name, optional description, kind (user or the system "Liked" list), creation and update times.
- **Playlist item**: one entry in a playlist: its own identity, the track it points to, when it was added. The same track may appear more than once.
- **Library item**: a saved album, artist or track, and when it was saved.
- **Track / album / artist snapshot**: the details needed to display an entity without the catalog, keyed by its provider-namespaced identity.
- **Recent search**: a search query and when it was last used.
- **Storage version**: the version of the stored structure, used for upgrades and conflict detection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** (UX-AC-12, foundation scope): For a seeded set containing at least one record of every kind in FR-010, 100% of records read back after a hard reload and after a browser restart are identical to what was saved (excluding nothing), in Chromium, Firefox and WebKit.
- **SC-002**: Removed (O8, D-002-4); it covered the no-flash theme guarantee, now owned by 014 (UX-AC-10). The ID is kept and not reused.
- **SC-003**: With the device store unavailable, the app starts, every destination opens, the banner is visible on every page within 1 second of start-up, and no uncaught error occurs, in all three engines.
- **SC-004**: Removed (O8, D-002-4); it covered preserving a 001 appearance choice, which no longer exists. The ID is kept and not reused.
- **SC-005**: Opening the store from every earlier-version fixture keeps 100% of records; a forced write failure in an all-or-nothing group leaves 0 partial records.
- **SC-006**: A library change saved in one tab is visible in another open tab within 1 second, without a reload.
- **SC-007**: Start-up is not slowed visibly: the shell appears no later than in 001 on the same test (the store is not awaited before first paint).
- **SC-008**: Automated accessibility checks of 001 still pass on every page, including with the banner shown, on the single visual identity (0 serious or critical issues).

## Assumptions

- Only one device and browser profile matter; there is no sync between devices (ADR-001).
- The store's implementation, the exact layout of each storage area and the test tooling are planning decisions (architecture §2, §12 describe the approved direction).
- 014's removal of the obsolete 001 appearance value (`ObsoleteDataCleaner`) stays as it is. Since 002 builds no settings store (D-002-5), it is not retired here; the owner can retire it at Phase 06 (014 follow-up).
- The banner copy is fixed by D-002-6 (UX §7 is amended to match); its exact placement within the shell is a design detail for the plan, within the constraints of FR-017.
- Storage-full handling beyond reporting the error (checks, warnings, the storage screen, the persistence request) is features 009 (PLAT-06, SET-07).
- Backup export and import, and "reset all data", are feature 010 (SET-04). Until then UX-AC-12 is verified by reading the store directly in tests.
- The player snapshot (queue, position, volume) is persisted by feature 007; play history by 007 and 011.
- The diagnostics record of skipped records (FR-013) is a local log; exporting it is feature 013 (PLAT-05).
- The browsers are those of D4; all of them support the on-device store in normal browsing mode.
