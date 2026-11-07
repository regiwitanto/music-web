# Product Requirements

> **Internal working title:** *Metrolist Web Reimagined*. It may be used only in internal planning docs and the repository. It must **never** appear in the public-facing UI (see D5).
> **Status:** Phase 00 final · **Decisions approved:** 2026-11-05 · **Amended:** 2026-11-07 (O8: one permanent dark visual identity; SET-01 and SET-02 withdrawn)
> **Owns:** vision, users, scope, information architecture, feature IDs and priorities, the music-source policy, assumptions.
> **Related:** [ux-specification.md](ux-specification.md) · [architecture.md](architecture.md) · [provider-contract.md](provider-contract.md) · [roadmap.md](roadmap.md) · [testing/test-plan.md](testing/test-plan.md) · [metrolist-audit.md](metrolist-audit.md)

## 1. Vision

A personal, web-based music player that feels fast, polished, minimal, predictable, accessible and enjoyable. It combines:

| Inspiration | What we take (the idea, not the look) |
|---|---|
| Spotify | Personal quick access, low-effort discovery, obvious navigation |
| YouTube Music | Strong search with typed filters, genre and mood browsing, artist and album depth |
| Apple Music | A restrained premium visual language, an immersive Now Playing view, a tidy library |
| Metrolist | User control: themes, playback preferences, a persistent queue, on-device "smart" sections, data ownership |

We do not make pixel-perfect copies of any product.

## 2. Users

| Persona | Description | Needs |
|---|---|---|
| **Owner** (primary) | A backend developer who uses the app daily on desktop and phone | Fast access to their music, reliable playback, their data under their control |
| **Beta friend** (secondary, Phase 06) | 3–10 invited people on mixed devices and browsers, including iOS Safari | Zero-setup start (sample music), clear empty states, easy bug reporting |

There are no accounts in MVP. Each browser profile is an independent library.

## 3. Goals and non-goals

**Goals**
- G1 — Playback that never breaks when you navigate between screens.
- G2 — A complete library-management loop: import local files, like, playlists, reorder, back up and restore.
- G3 — Discovery surfaces that work offline from local data and mock metadata.
- G4 — WCAG 2.2 AA accessibility, and full use by keyboard and touch.
- G5 — A codebase that can grow later: a provider abstraction and clean layers.

**Non-goals (Phase 00–06)**
- Streaming from YouTube or YouTube Music, or any unofficial API. No stream extraction, no ad removal, no download or bypass mechanisms. See §6.
- User accounts, cloud sync, a backend, social features, listen-together.
- A native Android app. The architecture keeps this possible, but it is not built.
- Podcasts, videos, or audio DSP (EQ, crossfade, normalization) before P2.

## 4. Information architecture

There are **exactly four primary destinations**. This is fixed and must not change without an explicit product decision.

| # | Destination | Route | Purpose |
|---|---|---|---|
| 1 | **Home** | `/` | Personalized discovery and quick access |
| 2 | **Explore** | `/explore` | Search and browse the catalog |
| 3 | **Library** | `/library` | Manage personal collections |
| 4 | **Settings** | `/settings` | Personalize the experience |

**Now Playing is global, not a destination.** It is a persistent mini player plus an expanded overlay, available on every route, and its state survives navigation.

Secondary routes nest under their destination. The navigation item for that destination stays highlighted:
- `/explore/search?q=&type=`
- `/explore/genre/[id]`, `/explore/mood/[id]`
- `/explore/artist/[id]`, `/explore/album/[id]`
- `/library/liked`, `/library/playlists`, `/library/playlist/[id]`, `/library/albums`, `/library/artists`, `/library/recent`
- `/settings/[section]` (optional deep links)

Route details are in [architecture.md §8](architecture.md#8-routing-and-rendering).

## 5. Features and priorities

Priorities:
- **P0** = MVP. Required before closed beta.
- **P1** = Beta improvements, delivered during or just before Phase 06.
- **P2** = Future enhancements, not scheduled.

IDs are stable: other documents and future Spec Kit specs reference them.

### 5.1 App shell (SHELL)
| ID | Feature | P |
|---|---|---|
| SHELL-01 | Four-destination navigation: desktop sidebar, mobile bottom bar | P0 |
| SHELL-02 | Responsive layout: sidebar plus content plus bottom player on desktop; content plus mini player plus bottom navigation on mobile | P0 |
| SHELL-03 | Per-destination scroll position restored when you return to a destination | P1 |
| SHELL-04 | Global keyboard shortcuts (play/pause, next/previous, seek, focus search) and a shortcuts help dialog | P0 (shortcuts), P1 (help dialog) |
| SHELL-05 | App-level error boundary with recovery that does not stop audio | P0 |

### 5.2 Home (HOME)
| ID | Feature | P | MVP data rule |
|---|---|---|---|
| HOME-01 | Greeting that changes by time of day | P0 | Local clock |
| HOME-02 | Quick Access: 6–8 tiles | P0 | Liked Songs plus the most recently played playlists and albums |
| HOME-03 | Continue Listening | P0 | The last unfinished queue context, from the player snapshot |
| HOME-04 | Recently Played | P0 | Distinct items from `playEvents`, newest first |
| HOME-05 | Personalized Picks | P0 | Simple rules: tracks by the most-played artists and genres that you have not played in the last 7 days. Falls back to mock picks |
| HOME-06 | Recommended Playlists | P0 | Mock curated playlists, ranked by overlap with your top genres |
| HOME-07 | New Discoveries | P0 | Catalog tracks you have never played, from your top genres. Falls back to a random set with a fixed seed per day |
| HOME-08 | Rediscover (old favourites you haven't played recently) | P1 | Play time in the last 30 days is under 20% of play time in the previous 90 days |
| HOME-09 | Show/hide individual Home sections (order stays fixed) | P1 | — |

Home section order is **fixed**, not randomized; see [metrolist-audit.md §3](metrolist-audit.md#3-home-and-recommendations). The ranking rules are in [architecture.md §6](architecture.md#6-recommendation-rules).

### 5.3 Explore (EXP)
| ID | Feature | P |
|---|---|---|
| EXP-01 | Search across the catalog (debounced) with an "All" results view | P0 |
| EXP-02 | Recent searches: the last 10, removable one by one, clear all | P0 |
| EXP-03 | Filters: Songs / Albums / Artists / Playlists | P0 |
| EXP-04 | Browse by Genre | P0 |
| EXP-05 | Browse by Mood | P0 |
| EXP-06 | Artist detail page (header, top tracks, albums, play and shuffle) | P0 |
| EXP-07 | Album detail page (header, tracklist, play, shuffle, add to library) | P0 |
| EXP-08 | Explicit loading, empty, no-results and error states with retry | P0 |
| EXP-09 | Search suggestions while typing | P1 |
| EXP-10 | Alternate versions of a track (live, remix …), shown only when a provider reports the `versions` capability | P2 |

### 5.4 Library (LIB)
| ID | Feature | P |
|---|---|---|
| LIB-01 | Liked Songs (a system playlist that cannot be deleted) | P0 |
| LIB-02 | Playlists list | P0 |
| LIB-03 | Albums in the library | P0 |
| LIB-04 | Artists in the library | P0 |
| LIB-05 | Recently Added | P0 |
| LIB-06 | Library search (on device, across all library entities) | P0 |
| LIB-07 | Sorting (per type) and filtering (by type and source) | P0 |
| LIB-08 | Create, rename and delete playlists (delete asks for confirmation, then offers undo) | P0 |
| LIB-09 | Reorder playlist tracks (drag handle plus keyboard move) | P0 |
| LIB-10 | Import local audio files (file picker, plus drag-and-drop on desktop) | P0 |
| LIB-11 | List/grid view toggle | P1 |
| LIB-12 | Multi-select with bulk actions (add to playlist, remove, like) | P1 |
| LIB-13 | Import/export playlists as M3U | P2 |

### 5.5 Settings (SET)
| ID | Feature | P |
|---|---|---|
| SET-01 | ~~Theme: Light / Dark / OLED Black / System~~ **Withdrawn (O8, 2026-11-06).** Replaced by one permanent dark visual identity ([design-system.md §2](design-system.md#2-color)). Shipped in 001, removed by 014. The ID is kept and not reused | Withdrawn |
| SET-02 | ~~Accent color (8 presets)~~ **Withdrawn (O8, 2026-11-06).** One fixed accent, Muted Copper; there is no user-selectable accent. Shipped in 001, removed by 014. The ID is kept and not reused | Withdrawn |
| SET-03 | Playback preferences: remember shuffle and repeat, restore the queue on launch, default volume, "auto-play similar" off by default (P2) | P0 |
| SET-04 | Data export and import as versioned JSON, plus reset all data | P0 |
| SET-05 | About: version, build, licenses, privacy statement | P0 |
| SET-06 | Reduced-motion override (system / on / off), in the Settings **Accessibility** section (O8) | P1 |
| SET-07 | Storage management: usage vs quota (StorageManager estimate), a breakdown (local audio / artwork / library data), the list of imported files sorted by size with per-file delete, "Remove all local audio", and persistent-storage status | P0 |

Budget: no more than about 20 user-facing settings in MVP. Alternative designs are never offered as settings.

### 5.6 Now Playing and playback (NP)
| ID | Feature | P |
|---|---|---|
| NP-01 | Persistent mini player | P0 |
| NP-02 | Expanded Now Playing (full-screen on mobile, overlay or panel on desktop) | P0 |
| NP-03 | Large album artwork | P0 |
| NP-04 | Artwork-based background (blurred artwork backdrop) | P0 |
| NP-05 | Play/pause, next, previous (restarts the track when more than 3 s has played) | P0 |
| NP-06 | Seek bar with buffered range, elapsed and remaining time | P0 |
| NP-07 | Shuffle and repeat (off / all / one) | P0 |
| NP-08 | Like button, kept in sync everywhere | P0 |
| NP-09 | Queue management: view, play next, add to queue, reorder, remove with undo, clear | P0 |
| NP-10 | Volume and mute (hidden on iOS, where the browser does not allow setting volume) | P0 |
| NP-11 | Lyrics panel, shown only when licensed or user-owned data exists (e.g. a sidecar `.lrc`) | P1 |
| NP-12 | Media Session integration (metadata, artwork, actions), when the browser supports it | P0 |
| NP-13 | Desktop queue side panel | P0 |
| NP-14 | Sleep timer (minutes or end of track) | P1 |
| NP-15 | Accent tint derived from the artwork, applied to the expanded player | P1 |
| NP-16 | Playback speed | P2 |
| NP-17 | Gapless, crossfade, loudness normalization, EQ | P2 |

### 5.7 Platform (PLAT)
| ID | Feature | P |
|---|---|---|
| PLAT-01 | Local persistence of the library, settings, history and player snapshot (IndexedDB) | P0 |
| PLAT-02 | Accessibility baseline (WCAG 2.2 AA) on the single dark visual identity, including forced-colours (high-contrast) support; the system light/dark preference is not followed (constitution IX, v2.0.0) | P0 |
| PLAT-03 | Installable PWA (manifest, icons) | P1 |
| PLAT-04 | Offline app shell (service worker) | P1 |
| PLAT-05 | Local diagnostics log, exportable for bug reports | P1 |
| PLAT-06 | Storage quota handling: pre-import space check, per-file `QuotaExceededError` handling, and a `navigator.storage.persist()` request on the first local import ([architecture.md §12.1](architecture.md#121-storage-quota-handling)) | P0 |

### 5.8 Music sources (SRC)
| ID | Feature | P |
|---|---|---|
| SRC-01 | Mock provider: deterministic catalog metadata for the UI (no audio, or the sample audio below) | P0 |
| SRC-02 | Local file provider: files the user owns, chosen through the file picker | P0 |
| SRC-03 | Sample provider: a small bundled set of **CC0 or CC BY** tracks with recorded attribution ([provider-contract.md §9.3](provider-contract.md#93-sampleprovider-sample--src-03)). No audio is downloaded or bundled before Phase 03 | P0 |
| SRC-04 | A compliant remote provider (an officially documented API whose terms allow third-party playback) | P2 |

## 6. Music-source policy

1. Early UI work uses **mock metadata**.
2. Working audio comes only from:
   - user-owned local files;
   - bundled sample audio licensed **CC0 or CC BY only**. NC, ND and SA variants are excluded, as are "royalty-free" terms without a CC license. CC BY attribution is shown in the app ([provider-contract.md §9.3](provider-contract.md#93-sampleprovider-sample--src-03));
   - sources whose terms explicitly permit third-party playback.
3. An unofficial YouTube or YouTube Music integration is **never** treated as equivalent to an officially supported public API. Why: [metrolist-audit.md §12](metrolist-audit.md#12-risks-of-unofficial-music-apis).
4. These are **prohibited**: stream extraction, signature deciphering, token minting, ad removal, unauthorized downloading, DRM or region bypass, client impersonation.
5. Every new provider must pass the compliance checklist in [provider-contract.md §8](provider-contract.md#8-compliance-checklist-for-new-providers).

## 7. Constraints

- Browser-only and client-side; no backend at the application level (no API routes, Server Actions, database server or auth). Deployed with a standard `next build` (D1, ADR-002).
- Strict TypeScript, few dependencies (each one justified in [architecture.md §2](architecture.md#2-technology-stack-evaluation)).
- Supported browsers (D4): the **latest two stable versions** of Chrome, Firefox, Safari and Edge, with **iOS Safari 17+** as the compatibility baseline. Audio capabilities are validated on real browsers during implementation ([testing/test-plan.md §6](testing/test-plan.md#6-browser-audio-limitations-matrix)). Capabilities are never assumed from version numbers.
- Branding (D5): no Metrolist, YouTube, Spotify, Apple or other third-party names, logos or trade dress in any public-facing surface. That includes UI text, `<title>`, metadata, the PWA manifest, icons and the About screen.

## 8. Assumptions

| # | Assumption | If wrong |
|---|---|---|
| A1 | The beta group is small (≤ 10 people) and accepts per-device data (no sync) | Sync would need a backend (P2) |
| A2 | Local file libraries fit in the browser's IndexedDB quota (typically a few GB per device; varies by browser and free disk) | Quota handling blocks the import with a clear message, and storage management lets users free space (SET-07, PLAT-06) |
| A3 | Mock metadata is enough to judge Home and Explore UX before a real catalog exists | Use richer fixtures |
| A4 | Enough CC0 / CC BY sample tracks (≥ 10) can be found and verified by Phase 03 | Ship fewer samples; the first-run "Play sample tracks" action is hidden when none are bundled |
| A5 | iOS Safari background audio works for a single HTMLAudioElement while the page is in the background | Document the limitation for beta testers |

## 9. Decisions (approved by the owner, 2026-11-05)

| ID | Decision | Approved outcome |
|---|---|---|
| D1 | Deployment | **Standard Next.js build** (`next build`, run on Vercel or `next start` on a Node host). **Static export is not configured.** The application stays backend-free: no API routes, Server Actions, database or auth. Dynamic `[id]` routes resolve on the client. See [architecture.md ADR-002](architecture.md#13-decision-log-adrs). |
| D2 | Local audio storage | **IndexedDB via Dexie.** Imported files are copied in as Blobs. File System Access handles are **not** used. This requires quota handling and user-visible storage management (PLAT-06, SET-07, both P0). See [architecture.md §12.1](architecture.md#121-storage-quota-handling) and ADR-006. |
| D3 | Sample audio | **Properly licensed CC0 or CC BY audio only.** **No audio files are downloaded or bundled yet.** The first ones arrive in Phase 03, after per-track vetting. Attribution requirements: [provider-contract.md §9.3](provider-contract.md#93-sampleprovider-sample--src-03). |
| D4 | Browser support | The **latest two stable versions of Chrome, Firefox, Safari and Edge**, plus **iOS Safari 17+** as the compatibility baseline. Actual audio capabilities are validated during implementation ([testing/test-plan.md §6](testing/test-plan.md#6-browser-audio-limitations-matrix)). |
| D5 | Product name | "**Metrolist Web Reimagined**" is an **internal working title only**, used in docs, the repository and planning. The public-facing UI must not use Metrolist or any other third-party branding. Until a public name is chosen, the UI shows a neutral placeholder from a single constant (`APP_DISPLAY_NAME`, default "Music Player"). Choosing a public name is not blocking. |
| D6 | Long-term product direction (recorded 2026-11-05) | **Goal:** in the long term, the product becomes a hybrid offline music player and YouTube Music client with a scope comparable to Metrolist. **Not now:** the current local-first MVP (Phases 01–06, [specs/README.md](../specs/README.md)) is preserved unchanged, and **no YouTube Music integration is implemented**. **Before any implementation**, an early feasibility study covering technical and platform-policy risks is required ([roadmap.md, Long-term direction](roadmap.md#long-term-direction-d6)). **Policy status:** the music-source policy (§6), constitution principle XII, ADR-007, [metrolist-audit.md §12](metrolist-audit.md#12-risks-of-unofficial-music-apis) and the `AGENTS.md` prohibitions **stay fully in force**. D6 records a goal; it does not authorize any integration. |

## 10. Success measures (observable, not satisfaction claims)

- Every P0 feature meets its acceptance criteria in [ux-specification.md §9](ux-specification.md#9-measurable-ux-acceptance-criteria) and [testing/test-plan.md](testing/test-plan.md).
- Zero known P0 bugs at the beta gate (Phase 06 entry).
- The owner uses the app for 14 consecutive days during Phase 06 without data loss (verified by an export diff).
- Every beta report can be reproduced from its attached diagnostics export (PLAT-05).
