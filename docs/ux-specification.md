# UX Specification

> **Status:** Phase 00 draft · **Last reviewed:** 2026-11-05 · **Amended:** 2026-11-07 (O8: one permanent dark visual identity; SET-01 and SET-02 withdrawn)
> **Owns:** layouts, navigation behaviour, screen-by-screen content, Now Playing and queue interactions, states, keyboard and focus behaviour, measurable UX acceptance criteria (UX-AC).
> **Related:** feature IDs in [product-requirements.md §5](product-requirements.md#5-features-and-priorities) · visual tokens in [design-system.md](design-system.md) · state model in [architecture.md](architecture.md) · how each criterion is tested in [testing/test-plan.md](testing/test-plan.md)

## 1. UX principles

1. **Music never stops by accident.** Navigation, errors in a page and opening or closing panels never interrupt playback.
2. **Predictable over novel.** Fixed navigation, a fixed Home order, consistent placement of actions.
3. **One obvious primary action per surface.** For example, the Play button on album and playlist headers.
4. **Show state honestly.** Loading, buffering, empty, error and preview-only states are always explicit.
5. **Calm visuals; artwork is the colour.** One permanent dark identity with calm blue-slate chrome. Colour comes from album art and from a single fixed accent (Muted Copper), used sparingly so the artwork stays the visual focus ([design-system.md §1–2](design-system.md#1-principles)).
6. **Everything works by keyboard, touch and screen reader.**

## 2. Layout and breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| `sm` (mobile) | < 768 px | Content plus **mini player** (64 px) above the **bottom nav** (56 px plus safe-area inset) |
| `md` (tablet) | 768–1023 px | Collapsed **icon sidebar** (72 px), content, **bottom player bar** (80 px) |
| `lg` (desktop) | ≥ 1024 px | Expanded **sidebar** (240 px, collapsible to 72 px), content, optional **queue panel** (320 px, right), bottom player bar (80 px) |

### Desktop wireframe (`lg`)
```
┌──────────────┬───────────────────────────────────────┬────────────┐
│  ◉ App name  │  [page header / search field]          │  Queue     │
│              │                                        │  (toggle)  │
│  ⌂ Home      │   page content (scrolls)               │  Now:      │
│  ⌕ Explore   │                                        │  Next up…  │
│  ▤ Library   │                                        │            │
│  ⚙ Settings  │                                        │            │
│  ─────────   │                                        │            │
│  Playlists…  │                                        │            │
├──────────────┴───────────────────────────────────────┴────────────┤
│ [art] Title · Artist  ♡ │  ⤨  ⏮  ⏯  ⏭  ⟳   0:42 ━━━●──── 3:15 │ ≡ 🔊━━ ⤢ │
└───────────────────────────────────────────────────────────────────┘
```
The sidebar contains only the 4 destinations plus a short scrollable list of the user's playlists, as shortcuts into Library. It contains nothing else.

### Mobile wireframe (`sm`)
```
┌───────────────────────────┐
│  page header              │
│  content (scrolls)        │
│                           │
├───────────────────────────┤
│[art] Title · Artist  ♡ ⏯ │  ← mini player; tap opens Now Playing; thin progress line on top edge
├───────────────────────────┤
│  ⌂     ⌕     ▤     ⚙     │  ← bottom nav, labels always visible
└───────────────────────────┘
```

**Rules**
- Content gets bottom padding equal to the height of the player plus nav, so nothing is ever hidden behind them.
- The player bar and mini player appear once there is a current track. With an empty queue they are hidden on mobile and show an idle placeholder on desktop.
- There is no horizontal page scroll at 320 px width. Card carousels scroll horizontally inside their own row, using scroll-snap.

## 3. Navigation behaviour

- The active destination is shown by a filled icon, the accent colour and `aria-current="page"`.
- Detail routes keep their parent destination active. For example, `/explore/artist/…` keeps Explore active.
- **Re-selecting the active destination** scrolls to the top. If the user is in a nested route, it pops back to the destination root instead.
- Each destination remembers its last nested route and scroll position for the session (SHELL-03, P1). In MVP, re-selecting goes to the root.
- Browser Back and Forward behave normally. On mobile, Back closes the expanded Now Playing view first ([architecture.md §8](architecture.md#8-routing-and-rendering)).

## 4. Screens

### 4.1 Home (`/`)
The order is fixed, top to bottom. A section with no data is **hidden**, except Quick Access, which always shows Liked Songs.

| # | Section | Layout | Item action | ID |
|---|---|---|---|---|
| 1 | Greeting: "Good morning / afternoon / evening" (05–12 / 12–18 / 18–05) | Heading | — | HOME-01 |
| 2 | Quick Access | Grid of compact tiles: 2 columns on mobile, 4 on desktop, up to 8 tiles | Tap opens the item; the hover play button plays it | HOME-02 |
| 3 | Continue Listening | One wide card: the context name, the current track and a progress bar | Resume: restores the queue and position, then plays | HOME-03 |
| 4 | Recently Played | Carousel of cards | Open | HOME-04 |
| 5 | Personalized Picks | Track list (up to 12, 2 columns on desktop) | Play the track; it queues the rest of the list | HOME-05 |
| 6 | Recommended Playlists | Carousel | Open | HOME-06 |
| 7 | New Discoveries | Carousel | Play or open | HOME-07 |
| 8 | Rediscover (P1) | Carousel | Play | HOME-08 |

**First run** (no history and an empty library): the greeting, plus a welcome card with two actions — "Import your music" (LIB-10) and "Play sample tracks" (SRC-03). "Play sample tracks" is shown **only when vetted sample audio is bundled** (D3). Below the card come the mock-driven sections (Recommended Playlists, New Discoveries), so the screen is never empty.

### 4.2 Explore (`/explore`)
- **Idle state:** a search field (autofocused on desktop only), Recent Searches (up to 10 chips, each with ×, plus "Clear all"), a Browse by Genre grid of coloured tiles, and a Browse by Mood grid.
- **Typing:**
  - Debounce 250 ms, with a minimum of 1 character.
  - Results replace the browse content. Filter tabs: **All / Songs / Albums / Artists / Playlists** (EXP-03).
  - The query and type are reflected in the URL (`/explore/search?q=…&type=…`) so Back and Refresh restore them.
- **"All" view:** a Top Result card, Songs (top 4), then Artists, Albums and Playlists carousels. Each section header has a "See all" link that switches the filter.
- **When a query becomes "recent":** on submit (Enter) or when a result is opened. Plain typing is not recorded.
- **No results:** "No results for *'{q}'*", with suggestions: check spelling, try fewer words, browse genres.
- **Genre and mood pages:** a header in the genre colour, Popular tracks, Albums and Playlists.
- **Artist page** (EXP-06): a hero with artwork and name, **Play** (top tracks) and **Shuffle**, Top tracks (5, expandable to 10), Albums grid, and "Appears on" (P1).
- **Album page** (EXP-07):
  - Header: artwork, title, artist link, year, track count and total length.
  - Actions: Play, Shuffle, Save to Library (toggle), ⋯.
  - Track list with numbers and durations. The current track is highlighted with an equalizer icon.

### 4.3 Library (`/library`)
- **Header:** a library search field (LIB-06, searches only within the library), type chips **Playlists / Albums / Artists / Songs**, sort control and a "+ New playlist" button.
- **Pinned rows at the top:** Liked Songs (LIB-01) and Recently Added (LIB-05).
- **Sort options (LIB-07):**

| Type | Options (default first) |
|---|---|
| Playlists | Recently updated, Name, Date created, Track count |
| Albums | Recently added, Name, Artist, Year |
| Artists | Recently added, Name |
| Songs | Recently added, Title, Artist, Album, Duration |
| Inside a playlist | Custom order (default), Title, Artist, Date added |

- **Filtering (LIB-07):** source filter All / Local files / Catalog. The selected sort and filter are remembered per type.
- **Playlist page:**
  - Header: name, a 2×2 cover mosaic, count and duration.
  - Actions: Play, Shuffle, ⋯ (Rename, Delete, Export – P2).
  - Rows have drag handles **only in Custom order**. In other sort orders the handles are hidden and a hint reads "Switch to Custom order to rearrange" (LIB-09).
- **Create** (LIB-08): a dialog with a name field, prefilled "My Playlist #n", plus Create and Cancel. The new playlist opens after creation.
- **Rename:** the same dialog. **Delete:** a confirmation dialog, then a toast with **Undo** for 8 s. Liked Songs cannot be renamed or deleted.
- **Import local files** (LIB-10): available from the Library header ⋯ and from the first-run card. It shows a progress sheet and a summary.

### 4.4 Settings (`/settings`)
A single scrollable page with grouped sections and a sticky in-page section index on desktop. Every change takes effect immediately; there is no Save button.

There is **no Appearance section**: the app has one permanent dark visual identity and no theme or accent choice (O8; SET-01 and SET-02 withdrawn). The reduced-motion override lives in **Accessibility** and appears when SET-06 ships. The sections appear in the order of the table below (owner decision D-014-1, 2026-11-07); until a section ships, Settings lists it as a non-interactive "Coming soon" row (014 FR-017).

| Section | Controls | ID |
|---|---|---|
| Playback | Remember shuffle & repeat; Restore queue on launch; Default volume (hidden on iOS) | SET-03 |
| Storage | See §4.5 | SET-07, PLAT-06 |
| Library & Data | Export backup; Import backup (confirm replace); Reset all data (type "RESET" to confirm) | SET-04 |
| Accessibility | Reduced motion override: System / On / Off (P1) | SET-06 |
| About | Public display name (`APP_DISPLAY_NAME`; never "Metrolist" or any third-party brand, per D5), version and build hash; **Sample music credits** (the full attribution line for each track, [provider-contract.md §9.3](provider-contract.md#93-sampleprovider-sample--src-03)); provider attributions; open-source licenses; privacy statement ("All data stays in this browser") | SET-05 |

### 4.5 Storage management (SET-07, PLAT-06)
The rules behind this screen are in [architecture.md §12.1](architecture.md#121-storage-quota-handling).

- **Usage meter:** "1.2 GB of ~6 GB used". It is a labelled `meter` element, with the breakdown underneath: Local audio, Artwork, Library data (approx.). If the browser gives no estimate, show "Storage usage isn't available in this browser."
- **Status line:**
  - "Protected from automatic cleanup", or
  - "Your browser may clear this data when disk space is low" with a **Request protection** button.
- **Warnings:**
  - At **80%** or more: "Storage is almost full", with a link to the file list. This also appears in the Library import menu.
  - At **95%** or more: "Storage full — remove files to import more". Import actions are disabled, with this reason.
- **Imported files list:**
  - sorted by size (largest first), with a toggle for date imported;
  - each row shows the title, artist, size and a **Remove** button;
  - removing asks for confirmation ("Frees 8.4 MB. The song stays in your playlists as *File missing* until you import it again.") and then shows an undo toast for 8 s. The Blob is deleted only once the toast closes.
- **Remove all local audio:** a destructive button. The confirmation states the total space it frees.
- **Missing files notice:** shown when files have been evicted or removed: "n songs are missing their audio file", with a link to Library → Songs filtered to *Missing*.
- **Import-time dialog:** shown when the selected files exceed the available space. It reads "These files need 2.1 GB but about 1.4 GB is free", with the actions **Import what fits** / **Manage storage** / **Cancel**.

## 5. Now Playing

### 5.1 Mini player / player bar (NP-01)
- **Contents:** artwork (40–48 px), title and artist (one line each, truncated), Like, Play/Pause. On desktop it also has previous, next, shuffle, repeat, the seek bar, queue toggle, volume and expand.
- **Mobile:**
  - Tapping anywhere except a control opens the expanded player.
  - A thin progress line runs along the top edge.
  - Horizontal swipe for next/previous is P1, with a button alternative always available.
- **Buffering:** a spinner replaces the play icon. Its label "Loading" is announced politely.

### 5.2 Expanded Now Playing (NP-02 … NP-10)
- **Mobile:**
  - A full-screen sheet that slides up (280 ms). Close it with the chevron, swipe down, Back or Esc.
  - Layout: artwork (square, about 85% of the width), title and artist with a Like button, seek bar with elapsed and remaining time, the main controls, then a row with Queue, Lyrics (when available) and ⋯.
- **Desktop:**
  - An overlay over the content area. The sidebar and player bar stay visible, and the bar's controls remain the single control surface.
  - Shows large artwork, metadata and a lyrics or queue tab panel on the right.
- **Background** (NP-04): the artwork scaled up, blurred (≥ 60 px) and dimmed with a scrim ([design-system.md §2.3](design-system.md#23-now-playing-scrim)) so contrast requirements still hold. Accent tinting from the artwork is P1 (NP-15).
- **Previous:** restarts the track if more than 3 s has played.
- **Seek:**
  - Dragging previews the time without seeking.
  - Releasing seeks.
  - Arrow keys move 5 s; Shift+Arrow moves 15 s.
- **Like:** toggles optimistically and syncs to every visible instance.
- **Preview-only track** (a mock track without audio): play controls are disabled, with the label "Preview only — no audio source".

### 5.3 Queue (NP-09, NP-13)
- **Sections:** **Now Playing** (1 row), **Next in queue** (items the user added, origin `user`) and **Next from {context}**.
- **Row actions:**
  - Drag to reorder (handle). Keyboard: focus the handle, press Space to pick up, arrows to move, Space to drop, Esc to cancel.
  - Remove (×), with an Undo toast.
  - Play now (click or Enter).
- **Header actions:** Clear queue, which keeps the current track; it asks for confirmation if there are more than 10 items.
- **Where it appears:**
  - Desktop: the right side panel, toggled from the player bar. Its open state is remembered.
  - Mobile: a tab inside the expanded player.
- **Adding from anywhere:** the ⋯ menu on tracks, albums and playlists offers **Play next** and **Add to queue**. A confirmation toast follows ("Added to queue").

### 5.4 Track context menu (consistent everywhere)
The order is fixed. Items that do not apply are hidden, never shown disabled.

1. Play next
2. Add to queue
3. Add to playlist ›
4. Like / Unlike
5. Go to album
6. Go to artist
7. Remove from this playlist (only inside a playlist)
8. Credits (only for tracks that carry a `credit`, e.g. CC BY sample tracks)
9. Remove file from device (only for local tracks; same confirmation as §4.5)

The menu opens from ⋯, right-click on desktop, a long-press on touch (500 ms), or the Shift+F10 / ContextMenu key.

## 6. Feedback patterns

- **Toasts:** bottom-centre on mobile (above the mini player), bottom-right on desktop (above the bar). Undo toasts last 8 s; others last 4 s. Announced with `role="status"`.
- **Optimistic updates** for like, add-to-playlist and reorder. If persistence fails, revert and show an error toast.
- **Destructive actions** (delete playlist, reset data, replace on import) always ask for confirmation, and offer undo where it is technically possible.

## 7. Loading, empty and error states

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Home sections | Skeleton cards in the section shape (after a 150 ms delay) | The section is hidden (see the first-run rules) | The section is hidden plus a single page-level "Some recommendations couldn't load · Retry" |
| Explore results | Skeleton rows under the tabs; previous results stay dimmed while the next query loads | "No results for '{q}'" plus tips | "Search isn't working right now. · Retry" (input keeps its text) |
| Genre / artist / album pages | Header plus row skeletons | "Nothing here yet." | Full-page error with Retry and Back |
| Library type tab | Row skeletons | Per type, e.g. "Playlists you create will appear here." plus a CTA | "Your library couldn't be loaded." + Retry + "Export diagnostics" |
| Playlist page | Skeleton | "This playlist is empty. Find songs in Explore." plus a CTA | — |
| Player | Spinner in the play button while loading or buffering | Idle bar: "Nothing playing" (desktop) | Inline text in the bar: "Couldn't play this track" plus a skip toast ([architecture.md §11](architecture.md#11-error-and-loading-handling)) |
| Storage unavailable | — | — | Persistent banner: "Private mode: your changes won't be saved." Imports are disabled. |
| Storage full during import | — | — | Import summary: "n not imported — storage full · Manage storage" |
| Local file missing | — | — | The row is dimmed with the label "File missing — re-import". Play is disabled. |
| Autoplay blocked | — | — | The play button pulses once and announces "Press play to start" |

Copy tone: plain, short, no blame, and always offers a next step.

## 8. Accessibility and keyboard

**Baseline: WCAG 2.2 AA (PLAT-02)**
- Contrast targets are in [design-system.md §2](design-system.md#2-color).
- The minimum pointer target is 24×24 px. Touch-primary controls (mobile player, nav) are **44×44 px**.
- Use landmarks: `nav` for the sidebar and bottom nav, `main` for content, `region` with the label "Player" for the player bar, `complementary` for the queue.
- "Skip to content" is the first focusable element. "Skip to player" follows it once the player has interactive controls (feature 008). While the dock is an idle, non-interactive placeholder, there is no "Skip to player" link.
- On route change, focus moves to the page `h1` (`tabIndex=-1`), and the page title is announced exactly once. The framework's built-in route announcer does this, so no second live region is added (decision D-001-3, 2026-11-05).
- **Dialogs and the sheet** use Radix Dialog: focus is trapped, Esc closes, focus returns to the trigger, and the background is inert.
- **Sliders** (seek, volume) use Radix Slider:
  - `aria-valuetext` reads "1 minute 12 seconds of 3 minutes 15 seconds" and "Volume 60%".
  - Seek is announced only on release, not continuously during playback.
- **Play/Pause** is a single button whose accessible name switches between "Play" and "Pause"; it does not use `aria-pressed`. **Shuffle** is a toggle with `aria-pressed`. **Repeat** has the label "Repeat: off / all / one".
- **Reduced motion:** opening the sheet becomes a fade, and parallax and artwork scaling are disabled.

**Global shortcuts (SHELL-04).** These are not active while focus is in a text input, except Esc.

| Key | Action |
|---|---|
| Space / K | Play/pause (when focus is not on a button or input) |
| Shift + → / Shift + ← | Next / previous track |
| → / ← (when the seek bar is focused) | Seek ±5 s |
| ↑ / ↓ (when the volume slider is focused) | Volume ±5% |
| M | Mute toggle |
| L | Like the current track |
| S / R | Toggle shuffle / cycle repeat |
| / or Ctrl/⌘ + K | Go to Explore and focus search |
| Q | Toggle the queue panel (desktop) |
| F or Ctrl/⌘ + Shift + F | Open or close the expanded player |
| Esc | Close the top-most overlay |
| ? | Shortcut help dialog (P1) |

## 9. Measurable UX acceptance criteria

Each criterion is verifiable by an automated or scripted manual test (see [testing/test-plan.md §5](testing/test-plan.md#5-traceability-matrix)).

| ID | Area | Criterion |
|---|---|---|
| UX-AC-01 | Playback continuity | While a track is playing, visiting all 4 destinations plus 2 detail pages in 10 navigations causes **no pause, no restart and no gap**. `audio.currentTime` increases monotonically, and the `audio` element instance is identical before and after. |
| UX-AC-02 | Playback continuity | Opening or closing the expanded player, the queue panel, dialogs or menus never changes the playback status. |
| UX-AC-03 | Player sync | After any command (play, pause, next, like, shuffle, repeat, seek) issued from the mini player, expanded player, queue, keyboard or Media Session, **every** visible player surface shows the new state in the next rendered frame. No surface shows conflicting state at any time. |
| UX-AC-04 | Player sync | The position shown in the mini player and the expanded player never differs by more than 250 ms. |
| UX-AC-05 | Responsive | At 320, 375, 768, 1024 and 1440 px widths: no horizontal page scroll, no content hidden behind the player or nav, and the 4 destinations are reachable with one tap or click. |
| UX-AC-06 | Responsive | Resizing across breakpoints while playing preserves playback, queue and open-panel state (the queue panel turns into the mobile tab). |
| UX-AC-07 | Keyboard | Every interactive element is reachable with Tab or Shift+Tab, in a logical order, with a visible focus ring of ≥ 3:1 contrast. Every P0 user flow in the test plan can be completed **keyboard-only**. |
| UX-AC-08 | Keyboard | Every shortcut in §8 works and does not fire while typing in an input. |
| UX-AC-09 | Accessibility | axe-core reports **0 serious or critical violations** on every destination and detail page, on the visual identity. |
| UX-AC-10 | Visual identity | On every load the visual identity is applied from the first paint, with no script, stored preference or user choice involved, so there is **no visible flash** of another colour scheme. The page declares a dark colour scheme, so native browser surfaces (form controls, scrollbars) match it. The system light/dark preference does not change the UI. *(Amended 2026-11-07, O8: replaces theme and accent switching and persistence.)* |
| UX-AC-11 | Visual identity | Every token pair of the identity meets WCAG 2.2 AA ([design-system.md §2](design-system.md#2-color)): text ≥ 4.5:1; UI component boundaries and focus indicators ≥ 3:1. The page background is never pure `#000000`. In forced-colours (high-contrast) mode, content, state and focus indicators stay visible and usable ([design-system.md §2.5](design-system.md#25-forced-colours)). *(Amended 2026-11-07, O8.)* |
| UX-AC-12 | Library persistence | Likes, playlists (name, order, items), saved albums and artists, settings, recent searches and the player snapshot all survive a hard reload and a browser restart. Verified by comparing a backup export before and after (equal except for timestamps). |
| UX-AC-13 | Library persistence | Export, then reset, then import restores an identical library (verified the same way). |
| UX-AC-14 | Search | With the mock provider, results render within 300 ms of the 250 ms debounce ending (p95 across 20 queries in E2E). The input never loses typed characters, and stale responses never overwrite newer ones. |
| UX-AC-15 | Search | Recent searches record only submitted or opened queries, hold at most 10 with newest first, deduplicate case-insensitively, and can be removed one by one. |
| UX-AC-16 | Queue correctness | All the queue rules and invariants in [architecture.md §5.1](architecture.md#51-queue-rules) pass the unit tests, including property-based tests (1,000 random operation sequences). |
| UX-AC-17 | Queue correctness | In E2E, Play next / Add to queue / reorder / remove / undo produce the expected upcoming order, which is visible in the queue UI and followed by actual playback. |
| UX-AC-18 | Browser audio | On first load, no audio plays until a user gesture. A restored session shows the paused state with the correct track and position. When `play()` is rejected, the UI shows the "Press play" affordance instead of an error. |
| UX-AC-19 | Browser audio | On iOS Safari the volume slider is hidden. Media Session lock-screen controls (play, pause, next, previous) work where the browser supports them; the support matrix is in the test plan. |
| UX-AC-20 | Browser audio | Unsupported or corrupt files are rejected at import with a reason. A failure during playback skips with a toast, and stops after 3 consecutive failures. |
| UX-AC-21 | Performance | Lab budgets on a mid-tier mobile profile: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, initial JS ≤ 200 KB gzipped (excluding lazy chunks). Exact method in the test plan. |
| UX-AC-22 | Loading states | Every async surface shows exactly one of loading, empty, error or ready. Skeletons do not appear for loads under 150 ms. Every error state has a working Retry or a next step. |
| UX-AC-23 | Playlists | Create, rename, delete with undo, and reorder (pointer **and** keyboard) work, persist, and are reflected immediately in the sidebar list, the Library and Quick Access. |
| UX-AC-24 | Storage | With a simulated quota:<br>(a) an import that exceeds free space shows the pre-import dialog;<br>(b) a `QuotaExceededError` part-way through keeps the earlier files and reports the rest as "storage full", with no half-written records;<br>(c) the 80% and 95% thresholds show the specified warning and block;<br>(d) removing a file frees its space (the usage figure decreases) and leaves the track marked "File missing";<br>(e) re-importing the same file relinks it with no duplicate. |
| UX-AC-25 | Branding | No public-facing surface contains "Metrolist", "YouTube", "Spotify" or "Apple Music". That covers rendered UI text, `<title>`, metadata, the manifest and export file names. Verified by an automated text scan of the built output and an E2E DOM scan. |
