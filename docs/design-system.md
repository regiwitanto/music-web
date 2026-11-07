# Design System

> **Status:** Phase 00 draft · **Last reviewed:** 2026-11-05 · **Amended:** 2026-11-07 (O8: one permanent dark visual identity; SET-01 and SET-02 withdrawn)
> **Owns:** visual principles, tokens (colour, type, spacing, shape, elevation, motion), iconography, artwork rules, the component inventory, and how tokens are implemented in Tailwind v4.
> **Related:** layouts and behaviour in [ux-specification.md](ux-specification.md) · the visual identity is fixed; the theme and accent settings SET-01 and SET-02 are withdrawn (O8, [product-requirements.md](product-requirements.md#55-settings-set))

## 1. Principles

- **Calm chrome, colourful content.** The interface uses the deep blue-slate neutrals of the Abyss Copper identity (§2). Colour comes from artwork and from the single copper accent.
- **Calm density.** Generous spacing on discovery surfaces (Home, Explore), compact rows on management surfaces (Library, Queue).
- **One accent, used sparingly.** Use it for the active navigation item, the primary action, slider fill, focus ring, selection and the "now playing" indicator. Never use it for body text blocks or large surfaces. Artwork stays the visual focus: no glow, no neon.
- **Original look.** Draw no product's iconography, layout signatures or brand colours directly from Spotify, YouTube Music, Apple Music or Metrolist.

## 2. Color

**Visual direction: Abyss Copper** (owner decisions O8 K1 and K2, 2026-11-07). The app has one permanent dark identity: deep blue-slate neutrals and a single muted copper accent. There is no theme or accent choice, and the system light/dark preference is not followed ([constitution](../.specify/memory/constitution.md) IX, v2.0.0).

Direction rules:
- Album artwork is the visual focus. Copper is an accent, applied sparingly (§1).
- No pure black (`#000000`) backgrounds, no neon or highly saturated accents, no glow effects, and no large copper-coloured surfaces. Copper fills are limited to small controls (the primary play button, slider fill, selection marks).
- WCAG 2.2 AA contrast, visible keyboard focus and forced-colours support are required (§2.4, §2.5).

### 2.1 Approved palette

This is the **approved design direction, not yet a validated token system**. The remaining semantic tokens are derived during feature 014 planning.

| Role | Token | Value |
|---|---|---|
| Page background | `--bg` | `#101B23` |
| Surface (sidebar, player bar, cards) | `--surface` | `#182731` |
| Primary accent, **Muted Copper** | `--accent` | `#D8AD88` |
| Primary text, icons | `--text` | `#E8EDF0` |
| Secondary text, metadata | `--text-muted` | `#A9B9C1` |

**To be derived in the 014 plan** (not decided here): `--raised`; `--border-strong` (≥ 3:1 against `--bg` and every surface); `--divider`; `--danger` (clearly distinguishable from copper, and never shown by colour alone); `--on-accent`; accent hover and pressed shades; the hover, pressed and selected overlays; the focus-ring colour and offset; the Now Playing scrim colour (§2.3). The plan records each value with its computed contrast, and this section is then updated.

**Computed contrast of the approved values**

Calculated with the WCAG 2.x relative-luminance formula on 2026-11-07. They must be recalculated whenever a value changes.

| Pair | Ratio | Requirement |
|---|---|---|
| text / bg | 14.80 | ≥ 4.5 |
| text / surface | 12.96 | ≥ 4.5 |
| text-muted / bg | 8.64 | ≥ 4.5 |
| text-muted / surface | 7.57 | ≥ 4.5 |
| accent / bg | 8.52 | ≥ 4.5 as text; ≥ 3.0 as a UI component or focus indicator |
| accent / surface | 7.47 | same |
| bg on accent (candidate `--on-accent`) | 8.52 | ≥ 4.5 |
| surface / bg | 1.14 | none: a layer step only. A boundary that carries meaning also needs `--border-strong` |

The 001 Light, Dark and OLED Black tables and the 8 accent presets are withdrawn with SET-01 and SET-02. Their values remain in git history and in the 001 artifacts.

### 2.2 Accent

One fixed accent: **Muted Copper `#D8AD88`**. There is no user-selectable accent (SET-02 withdrawn). Use it, as in §1, for the active navigation item, the primary action, slider fill, the focus ring, selection and the "now playing" indicator. Never use it for body text blocks, backgrounds or other large fills.

### 2.3 Now Playing scrim

The artwork background (NP-04) is the artwork blurred at 64 px, saturated ×1.2, with a **70% black scrim** on top.

On the worst case (pure white artwork) this gives:
- primary text `#F2F2F5`: **7.57:1**
- secondary text, `#F2F2F5` at 80% opacity: **5.54:1**

The ratios above were computed for the 001 text value `#F2F2F5`. The 014 plan recalculates them with `--text` `#E8EDF0` and decides whether the scrim stays black or is tinted toward `--bg` (it is an overlay on artwork, not a page background). The expanded player uses the identity's text tokens. Making the scrim strength depend on sampled luminance is P1, together with NP-15.

### 2.4 State colours

| State | Treatment |
|---|---|
| Hover | Hover overlay: `--text` at 6% |
| Pressed | Pressed overlay: `--text` at 10% |
| Selected row | Accent at 12% background, plus accent text for the title |
| Disabled | 40% opacity, and `aria-disabled` |
| Focus ring | 2 px solid accent with a 2 px offset in `--bg` (accent / bg 8.52, accent / surface 7.47, §2.1). The final treatment is confirmed in the 014 plan |

### 2.5 Forced colours

In forced-colours mode (for example Windows High Contrast), the browser's system colours replace the identity. Content, state (active navigation item, selection, pressed toggles, disabled controls) and focus indicators MUST stay visible: state is never shown by colour or background alone, and focus uses an outline that the forced palette keeps. 001 already ships a forced-colours fallback in `globals.css`; 014 verifies it against the new identity.

## 3. Typography

The font is **Geist Sans**, already loaded via `next/font` in `src/app/layout.tsx`. Use **Geist Mono** for durations and timecodes, with tabular figures (`font-variant-numeric: tabular-nums`).

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 40/44 (mobile 32/36) | 700 | Album and artist hero titles |
| `title-1` | 28/34 (mobile 24/30) | 700 | Page `h1`, greeting |
| `title-2` | 20/26 | 650 | Section headings |
| `title-3` | 16/22 | 600 | Card titles, Now Playing title (mobile 20/26) |
| `body` | 15/22 | 400 | Default text |
| `body-strong` | 15/22 | 550 | Track titles in rows |
| `caption` | 13/18 | 400 | Metadata, artist names in rows |
| `micro` | 11/14 | 500, +2% tracking | Badges and labels (e.g. "Preview only") |

- Text truncates with an ellipsis on a single line in rows and cards. The full text appears in a tooltip and stays in the accessible name.
- Base size is 15 px. Sizes are in `rem`, so the browser's zoom and font-size settings are respected. Layouts must work at 200% zoom.

## 4. Spacing and layout

- A **4 px base** scale: `1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48, 16=64`.
- **Page gutters:** 16 px on mobile, 24 px on tablet, 32 px on desktop. The content max-width is 1600 px.
- **Card grids** auto-fill at a 160 px minimum (140 px on mobile) with a 16–24 px gap. Carousel cards are 160 px wide on mobile and 184 px on desktop.
- **Row heights:** track row 56 px (compact 48 px in the queue); nav item 40 px on desktop; bottom nav 56 px plus `env(safe-area-inset-bottom)`.
- **Shell dimensions:** sidebar 240 / 72 px, player bar 80 px, mini player 64 px, queue panel 320 px. The full list is in [ux-specification.md §2](ux-specification.md#2-layout-and-breakpoints).

## 5. Shape and elevation

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 6 px | Inputs, chips, small buttons |
| `radius-md` | 10 px | Cards, menus, toasts |
| `radius-lg` | 16 px | Dialogs, the mobile sheet's top corners |
| `radius-art` | 8 px (2 px for 40 px thumbnails) | Album artwork |
| `radius-full` | 9999 px | Artist images (circles), play button, avatar tiles |

**Elevation** uses colour steps (`bg` → `surface` → `raised`). Because surface / bg is only 1.14:1, an element that must read as a separate layer (menus, dialogs) also gets a `--divider` border or a soft dark shadow. The exact treatment is derived in the 014 plan. No glow. (The 001 light-theme shadow tokens are withdrawn.)

## 6. Motion

| Token | Duration | Easing | Use |
|---|---|---|---|
| `motion-fast` | 120 ms | `ease-out` | Hover, press, toggles |
| `motion-base` | 200 ms | `cubic-bezier(.2,0,0,1)` | Menus, toasts, tabs |
| `motion-sheet` | 280 ms | `cubic-bezier(.32,.72,0,1)` | Expanded player open and close, side panels |
| `motion-art` | 400 ms | `ease-in-out` | Artwork crossfade on track change |

- Animate only `transform` and `opacity`. Never animate layout properties during playback.
- With **reduced motion** (system setting, or SET-06), sheets fade at 120 ms, artwork changes without a crossfade, and auto-scrolling carousels and parallax are disabled.
- Use Motion (the library) only for the sheet drag, the shared artwork transition from mini player to expanded player, and the reorder animation. Use CSS transitions everywhere else.

## 7. Iconography

- Use **Lucide** at a 1.75 px stroke. Sizes are 16, 20 and 24 px, and 28 px for the main transport controls on mobile.
- Filled variants are used for the active state (navigation, Like) via `fill="currentColor"`.
- Icon-only buttons always have an `aria-label` and a tooltip on pointer devices.
- Proposed icons:

| Purpose | Icon |
|---|---|
| Home | `House` |
| Explore | `Compass` |
| Library | `Library` |
| Settings | `Settings` |
| Like | `Heart` |
| Queue | `ListMusic` |
| Shuffle | `Shuffle` |
| Repeat | `Repeat` / `Repeat1` |
| Lyrics | `MicVocal` |

## 8. Artwork rules

- Aspect ratio is always 1:1, with `object-fit: cover` and a `radius-art` corner.
- **Placeholder** (artwork missing or failed to load): a gradient made from a hash of the entity ID, plus a centred `Music` or `Disc` icon. It never leaves an empty box, and the layout does not shift.
- **Sizes requested:** 64 px for rows, 300 px for cards, 640 px for Now Playing. Local artwork is downscaled once at import, to 512 px JPEG/WebP.
- **Colour sampling** (NP-15, P1): run once per artwork on a 32×32 canvas and cache the result in `Artwork.dominantColor`. Only the Now Playing accent tint uses it, and only after checking it reaches ≥ 3:1 against the scrim. Otherwise it falls back to the identity accent (Muted Copper).
- Artwork is treated as decorative: `alt=""` when the title is adjacent, otherwise `alt="{album} cover"`.

## 9. Component inventory

| Component | Base | Notes |
|---|---|---|
| Button (primary, secondary, ghost, icon, danger) | shadcn Button | Primary is the accent fill. Minimum 44 px on touch layouts. |
| PlayButton | custom on Button | Round, accent fill, shows play, pause or loading |
| IconToggle (Like, Shuffle) | Radix Toggle | `aria-pressed` |
| Slider (Seek, Volume) | Radix Slider | Buffered track layer; custom `aria-valuetext` |
| Tabs / FilterChips | Radix Tabs / ToggleGroup | Explore filters, Library type chips |
| DropdownMenu / ContextMenu | Radix | Track menu ([ux-specification.md §5.4](ux-specification.md#54-track-context-menu-consistent-everywhere)) |
| Dialog / AlertDialog | Radix | Create/rename playlist, confirm delete or reset |
| Sheet | Radix Dialog + Motion | Mobile expanded player |
| Tooltip | Radix Tooltip | Icon buttons; hidden on touch |
| Toast | Sonner (shadcn) | Undo support |
| ScrollArea | Radix ScrollArea | Queue panel, sidebar playlists |
| Skeleton | shadcn | Shape-matched placeholders |
| TrackRow | custom | Index or equalizer indicator, artwork, title, artists, album (desktop), duration, Like, ⋯, optional drag handle |
| MediaCard | custom | Artwork plus title plus subtitle; play button on hover or focus |
| QuickAccessTile | custom | Compact horizontal tile |
| SectionHeader | custom | Title plus "See all" |
| EmptyState / ErrorState | custom | Icon, message, action ([ux-specification.md §7](ux-specification.md#7-loading-empty-and-error-states)) |
| Sidebar, BottomNav, PlayerBar, MiniPlayer, NowPlaying, QueuePanel | custom | Shell components ([architecture.md §4](architecture.md#4-folder-layout)) |

Each component must have:
- documented states: default, hover, focus, pressed, disabled, loading, selected
- an RTL test of its accessible name and role ([testing/test-plan.md](testing/test-plan.md))

## 10. Implementation notes (Tailwind v4)

- Tokens are defined as CSS custom properties in `src/app/globals.css`, using the existing `@import "tailwindcss"` and `@theme inline` pattern.
- **All colour tokens** are defined once, on `:root`. There is no `data-theme` or `data-accent` attribute and no `prefers-color-scheme` switch. The root declares `color-scheme: dark`, so native controls and scrollbars match the identity.
- **Forced colours:** `@media (forced-colors: active)` rules implement §2.5.
- Tailwind utilities map to the semantic tokens, for example `bg-surface`, `text-muted`, `border-strong`, `ring-accent`. Components use **only semantic tokens**, never raw hex values or Tailwind palette colours. This is enforced in review, with an optional lint later.
- shadcn's generated CSS variables (`--background`, `--primary`, …) are aliased to these tokens, so generated components inherit the identity.
- No theme bootstrap is needed: the identity is static CSS, correct from the first paint (ADR-011, which supersedes ADR-009, in [architecture.md](architecture.md#13-decision-log-adrs)).
