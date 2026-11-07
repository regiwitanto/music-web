# Design System

> **Status:** Phase 00 draft · **Last reviewed:** 2026-11-05 · **Amended:** 2026-11-07 (O8: one permanent dark visual identity; SET-01 and SET-02 withdrawn; 014: derived tokens validated)
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

### 2.1 Palette and derived tokens

**Validated token system** (feature 014, 2026-11-07). The five approved values were fixed by owner decisions K1 and K2. The other values were derived in the 014 plan ([research R2](../specs/014-visual-identity/research.md)). All are declared once in the `:root` block of `src/app/globals.css`, and `tests/unit/tokens-contrast.test.ts` checks every ratio below from that file.

| Role | Token | Value | Source |
|---|---|---|---|
| Page background | `--bg` | `#101B23` | Approved (K1/K2) |
| Surface (sidebar, player bar, cards) | `--surface` | `#182731` | Approved |
| Primary accent, **Muted Copper** | `--accent` | `#D8AD88` | Approved |
| Primary text, icons | `--text` | `#E8EDF0` | Approved |
| Secondary text, metadata | `--text-muted` | `#A9B9C1` | Approved |
| Raised surface (menus, dialogs, tooltips, skip link) | `--raised` | `#213441` | Derived |
| Strong border (inputs, control outlines) | `--border-strong` | `#7F98A7` | Derived |
| Divider (decorative) | `--divider` | `#2A3D49` | Derived |
| Danger | `--danger` | `#F2949A` | Derived |
| Text and icons on an accent fill | `--on-accent` | `#101B23` | Derived |
| Accent hover / pressed | `--accent-hover` / `--accent-pressed` | `#E2BD9C` / `#C99B73` | Derived |
| Hover overlay | `--overlay-hover` | `--text` at 6% | Derived |
| Pressed overlay | `--overlay-pressed` | `--text` at 10% | Derived |
| Selected background | `--overlay-selected` | `--accent` at 12% | Derived |
| Now Playing scrim | `--scrim` | `--bg` at 85% | Derived (§2.3) |
| Overlay shadow | `--shadow-overlay` | `0 8px 24px rgb(0 0 0 / 0.45)` | Derived (§5) |

Translucent tokens are written `color-mix(in srgb, var(<base>) <N>%, transparent)`.

Direction rules still apply: no pure black (`#000000`) backgrounds, no neon or highly saturated accents, no glow, and no large copper surfaces.

**Computed contrast** (WCAG 2.x relative luminance, 2026-11-07; overlays composited with half-up rounding as browsers do)

| Pair | Ratio | Requirement |
|---|---|---|
| text / bg · surface · raised | 14.80 · 12.96 · 10.91 | ≥ 4.5 |
| text-muted / bg · surface · raised | 8.64 · 7.57 · 6.37 | ≥ 4.5 |
| accent / bg · surface · raised | 8.52 · 7.47 · 6.28 | ≥ 4.5 as text; ≥ 3.0 as a UI component or focus indicator |
| danger / bg · surface · raised | 7.88 · 6.90 · 5.81 | ≥ 4.5 |
| border-strong / bg · surface · raised | 5.78 · 5.06 · 4.26 | ≥ 3.0 |
| border-strong / pressed overlay over raised (`#354753`) | 3.19 | ≥ 3.0 |
| on-accent / accent · accent-hover · accent-pressed | 8.52 · 9.97 · 7.00 | ≥ 4.5 |
| text / pressed overlay over bg · surface · raised | 11.40 · 9.78 · 8.18 | ≥ 4.5 |
| text-muted / pressed overlay over raised | 4.77 | ≥ 4.5 |
| accent / selected overlay over bg · surface · raised | 6.81 · 5.92 · 4.97 | ≥ 4.5 |
| surface / bg | 1.14 | none: a layer step only. A boundary that carries meaning also needs `--border-strong` |
| raised / bg · surface | 1.36 · 1.19 | none: a layer cue only (§5) |
| divider / surface · bg | 1.36 · 1.55 | none: decorative only |

`--danger` is close to copper in luminance (1.08:1) and differs by hue only, so danger is always shown with an icon or text, never by colour alone.

The 001 Light, Dark and OLED Black tables and the 8 accent presets are withdrawn with SET-01 and SET-02. Their values remain in git history and in the 001 artifacts.

### 2.2 Accent

One fixed accent: **Muted Copper `#D8AD88`**. There is no user-selectable accent (SET-02 withdrawn). Use it, as in §1, for the active navigation item, the primary action, slider fill, the focus ring, selection and the "now playing" indicator. Never use it for body text blocks, backgrounds or other large fills.

### 2.3 Now Playing scrim

The artwork background (NP-04) is the artwork blurred at 64 px, saturated ×1.2, with the **`--scrim`** on top: `--bg` at 85%. The scrim is tinted toward the page background, not black, so the expanded player stays inside the identity.

On the worst case (pure white artwork, composite `#343D44`):
- primary text `--text`: **9.38:1**
- secondary text, `--text` at 80% opacity: **6.69:1**
- `--text-muted`: **5.48:1**
- `--accent`: **5.40:1**

85% is the lowest bg-tinted strength at which every identity text role passes on white artwork (70% black fails `--text-muted` at 4.18 and `--accent` at 4.13; 80% bg fails `--accent` at 4.49). The expanded player (feature 008) uses the identity's text tokens. Making the scrim strength depend on sampled luminance is P1, together with NP-15.

### 2.4 State colours

| State | Treatment |
|---|---|
| Hover | `--overlay-hover` (`--text` at 6%). On an accent fill: `--accent-hover` |
| Pressed | `--overlay-pressed` (`--text` at 10%). On an accent fill: `--accent-pressed` |
| Selected row | `--overlay-selected` (accent at 12%) background, plus accent text for the title |
| Disabled | 40% opacity, and `aria-disabled` |
| Focus ring | 2 px solid accent with a 2 px offset in `--bg` (accent / bg 8.52, accent / surface 7.47, accent / raised 6.28; §2.1). Confirmed by 014. On a copper-filled control the ring sits 2 px outside the fill, so it is never directly on copper |

### 2.5 Forced colours

In forced-colours mode (for example Windows High Contrast), the browser's system colours replace the identity. Content, state (active navigation item, selection, pressed toggles, disabled controls) and focus indicators MUST stay visible: state is never shown by colour or background alone, and focus uses an outline that the forced palette keeps.

All rules are in one `@media (forced-colors: active)` block in `globals.css` (014 research R9). They only add borders, so nothing changes outside the mode:
- the current navigation item gets a `2px solid Highlight` marker (a left border in the sidebar, a top border in the bottom bar), besides its filled icon;
- skeleton blocks get a `1px solid CanvasText` border;
- the primary (accent-filled) button gets a `1px solid ButtonText` border;
- focus needs no rule, because the outline survives.

Verified by automated Chromium emulation (014 D-014-2). Real Windows High Contrast is Deferred to Phase 06 closed-beta preparation.

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

**Elevation** uses colour steps (`bg` → `surface` → `raised`). Because surface / bg is only 1.14:1, an element that must read as a separate layer (tooltips, the skip link, menus, dialogs) uses `bg-raised`, a 1 px `--divider` border and `--shadow-overlay`. A control whose edge carries meaning (an input, the secondary button) uses `--border-strong`. No glow. (The 001 light-theme shadow tokens `shadow-1` and `shadow-2` are withdrawn.)

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
