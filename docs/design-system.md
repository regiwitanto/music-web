# Design System

> **Status:** Phase 00 draft · **Last reviewed:** 2026-11-05
> **Owns:** visual principles, tokens (colour, type, spacing, shape, elevation, motion), iconography, artwork rules, the component inventory, and how tokens are implemented in Tailwind v4.
> **Related:** layouts and behaviour in [ux-specification.md](ux-specification.md) · themes and accents are user settings SET-01 and SET-02 ([product-requirements.md](product-requirements.md#55-settings-set))

## 1. Principles

- **Neutral chrome, colourful content.** The interface is greyscale; colour comes from the single accent colour and from artwork.
- **Calm density.** Generous spacing on discovery surfaces (Home, Explore), compact rows on management surfaces (Library, Queue).
- **One accent, used sparingly.** Use it for the active navigation item, the primary action, slider fill, focus ring, selection and the "now playing" indicator. Never use it for body text blocks.
- **Original look.** Draw no product's iconography, layout signatures or brand colours directly from Spotify, YouTube Music, Apple Music or Metrolist.

## 2. Color

### 2.1 Neutral tokens per theme

Applied via `data-theme` on `<html>`. **System** resolves to Light or Dark through `prefers-color-scheme`.

| Token | Use | Light | Dark | OLED Black |
|---|---|---|---|---|
| `--bg` | Page background | `#FFFFFF` | `#121214` | `#000000` |
| `--surface` | Sidebar, player bar, cards | `#F4F4F6` | `#1B1B1F` | `#0E0E10` |
| `--raised` | Menus, dialogs, hovered rows | `#FFFFFF` (+ shadow) | `#25252A` | `#1A1A1D` |
| `--text` | Primary text, icons | `#111114` | `#F2F2F5` | `#F2F2F5` |
| `--text-muted` | Secondary text, metadata | `#5B5B66` | `#A3A3AD` | `#A3A3AD` |
| `--border-strong` | Input and control borders (must be ≥ 3:1) | `#8A8A96` | `#6E6E78` | `#6A6A73` |
| `--divider` | Decorative separators (no contrast requirement) | `#E4E4E8` | `#2A2A2F` | `#1C1C1F` |
| `--danger` | Destructive actions and errors | `#C42B2B` | `#F87171` | `#F87171` |

**Computed contrast**

These ratios were calculated with the WCAG 2.x relative-luminance formula on 2026-11-05. They must be recalculated whenever a value changes.

| Pair | Light | Dark | OLED | Requirement |
|---|---|---|---|---|
| text / bg | 18.85 | 16.75 | 18.79 | ≥ 4.5 |
| text / raised | 18.85 | 13.65 | 15.54 | ≥ 4.5 |
| text-muted / bg | 6.70 | 7.48 | 8.40 | ≥ 4.5 |
| text-muted / raised (worst surface) | 6.10 (surface) | 6.10 | 6.95 | ≥ 4.5 |
| border-strong / bg | 3.41 | 3.71 | 3.92 | ≥ 3.0 (non-text UI) |
| border-strong / raised | 3.11 (surface) | 3.02 | 3.24 | ≥ 3.0 |

OLED rule: `--bg` is pure `#000000`. Surfaces stay near-black, so pixels can switch off and the layers are still distinguishable.

### 2.2 Accent colours (SET-02)

Each accent has one value for Light and another shared by Dark and OLED. `--on-accent` is the text or icon colour used on an accent fill.

| Accent | Light | on-accent | Dark / OLED | on-accent |
|---|---|---|---|---|
| **Violet** (default) | `#6D3FE0` | `#FFFFFF` | `#A78BFA` | `#111114` |
| Blue | `#1F5FD6` | `#FFFFFF` | `#7AA7FF` | `#111114` |
| Teal | `#0B7C78` | `#FFFFFF` | `#2DD4BF` | `#111114` |
| Green | `#1F7A35` | `#FFFFFF` | `#4ADE80` | `#111114` |
| Amber | `#A15C00` | `#FFFFFF` | `#FBBF24` | `#111114` |
| Orange | `#C2410C` | `#FFFFFF` | `#FB923C` | `#111114` |
| Rose | `#C0265B` | `#FFFFFF` | `#FB7199` | `#111114` |
| Red | `#C42B2B` | `#FFFFFF` | `#F87171` | `#111114` |

**Computed (worst case across themes)**
- accent on `--surface`: ≥ 4.59 (Light Teal is the lowest)
- accent on `--bg`: ≥ 5.04
- `--on-accent` on accent: ≥ 5.04

So every accent can also be used as text for active navigation labels and links.

Red duplicates `--danger`. When Red is the accent, destructive buttons keep the same colour but **must** also show an icon and a label, never colour alone.

### 2.3 Now Playing scrim

The artwork background (NP-04) is the artwork blurred at 64 px, saturated ×1.2, with a **70% black scrim** on top.

On the worst case (pure white artwork) this gives:
- primary text `#F2F2F5`: **7.57:1**
- secondary text, `#F2F2F5` at 80% opacity: **5.54:1**

Because of the scrim, the expanded player always uses dark-mode text tokens, whatever the theme. Making the scrim strength depend on sampled luminance is P1, together with NP-15.

### 2.4 State colours

| State | Treatment |
|---|---|
| Hover | Hover overlay: `--text` at 6% |
| Pressed | Pressed overlay: `--text` at 10% |
| Selected row | Accent at 12% background, plus accent text for the title |
| Disabled | 40% opacity, and `aria-disabled` |
| Focus ring | 2 px solid accent with a 2 px offset in `--bg` (≥ 3:1 against adjacent colours by §2.2) |

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

**Elevation** uses colour steps in Dark and OLED (`surface` → `raised`). In Light it uses shadows:
- `shadow-1`: `0 1px 2px rgb(0 0 0 / .06), 0 1px 3px rgb(0 0 0 / .08)`, for cards on hover
- `shadow-2`: `0 8px 24px rgb(0 0 0 / .12)`, for menus and dialogs

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
- **Colour sampling** (NP-15, P1): run once per artwork on a 32×32 canvas and cache the result in `Artwork.dominantColor`. Only the Now Playing accent tint uses it, and only after checking it reaches ≥ 3:1 against the scrim. Otherwise it falls back to the user's accent.
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
- **Neutral tokens** are scoped by `[data-theme="light"|"dark"|"oled"]` on `<html>`.
- **Accent tokens** are scoped by `[data-accent="violet"|…]` and come in two values: one for `data-theme=light` and one for the dark themes.
- Tailwind utilities map to the semantic tokens, for example `bg-surface`, `text-muted`, `border-strong`, `ring-accent`. Components use **only semantic tokens**, never raw hex values or Tailwind palette colours. This is enforced in review, with an optional lint later.
- shadcn's generated CSS variables (`--background`, `--primary`, …) are aliased to these tokens, so generated components inherit the themes.
- Theme bootstrap: see ADR-009 in [architecture.md](architecture.md#13-decision-log-adrs).
