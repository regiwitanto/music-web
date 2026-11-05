# Metrolist Reference Audit

> **Status:** Phase 00 research · **Last reviewed:** 2026-11-05
> **Reference:** `../metrolist-reference` (relative to the repo root `music-web/`). Read-only, never modified.
> **Scope:** Inspiration only. No Kotlin code, schema, assets or strings are copied into this project (see §11).

## Evidence convention

- **[C]** — *Confirmed*: observed in the repository. A path is given relative to `metrolist-reference/`.
- **[I]** — *Inferred*: a reasonable conclusion from the code, not directly verified (for example, runtime behaviour).
- **[R]** — *Recommendation* for this web project.

Path shorthand: `M/` = `app/src/main/kotlin/com/metrolist/music/`.

---

## 1. Overall project architecture

- **[C]** The app is a Kotlin + Jetpack Compose Android app using Material 3. Its own `AGENTS.md` says it "follows material 3 design guidelines closely".
- **[C]** It has two Gradle modules, `:app` and `:innertube` (`settings.gradle.kts`). `:innertube` is a thin wrapper around the external library `com.github.MetrolistGroup.innertubex`, which is pulled from JitPack (`gradle/libs.versions.toml`, `innertube/build.gradle.kts`).
- **[C]** Packages are organised as follows:
  - `M/ui/{screens,component,player,menu,theme}` — UI
  - `M/viewmodels` — ViewModels
  - `M/db` — Room
  - `M/playback` — Media3 service
  - `M/eq` — parametric equalizer
  - Feature packages: `lyrics`, `discord`, `listentogether`, `recognition`, `widget`, `quicksettings`
  - Sibling API clients: `com/metrolist/{lastfm,lrclib,kugou,paxsenix,shazamkit}`
- **[C]** Dependency injection uses Hilt (`M/di/AppModule.kt`, `NetworkModule.kt`). It provides the database plus two caches: a player cache (LRU) and a download cache.
- **[C]** Other libraries: DataStore for preferences, Ktor/OkHttp for networking, Coil for images, protobuf-lite.
- **[C]** There are three build flavors (`app/build.gradle.kts`):
  - `foss` (the default): no Google Cast
  - `gms`: includes Cast
  - `izzy`: no updater, F-Droid compliant
- **[C]** The project has 529 `.kt` files. Several are very large:
  - `M/playback/MusicService.kt`: 5,080 lines
  - `M/ui/screens/HomeScreen.kt`: 2,613
  - `M/ui/player/Player.kt`: 2,247
  - `M/ui/screens/settings/AppearanceSettings.kt`: 1,892
- **[C]** The README declares the project is in **maintenance mode**: bug fixes only, no new features.
- **[I]** The layering is pragmatic MVVM. The service and the main screens hold a lot of logic, which hurts testability.
- **[R]** Keep the separation idea (UI / state / persistence / playback service / source client). Enforce it with small modules and dependency rules instead (see [architecture.md](architecture.md)).

## 2. Navigation structure

- **[C]** There are four top-level routes: `home`, `search_input`, `listen_together`, `library` (`M/ui/screens/Screens.kt`).
- **[C]** The Together tab is dropped from the bar when "Listen Together in top bar" is enabled, which is the default (`M/MainActivity.kt` ~L741-747). In practice users see **Home / Search / Library**.
- **[C]** Settings is **not** a tab. It is reached from the top bar, together with History, Stats and Together (`MainActivity.kt` ~L1071-1085).
- **[C]** The bottom bar switches to a navigation rail in landscape or on tablets, unless the "force bottom nav" setting is on (`MainActivity.kt` ~L831, `M/ui/component/AppNavigation.kt`). A "slim nav bar" option and a configurable default tab also exist (`constants/PreferenceKeys.kt`).
- **[C]** One NavHost holds about 50 routes (`M/ui/screens/NavigationBuilder.kt`): album, artist (plus see-all sub-routes), several playlist kinds, browse, mood & genres, charts, new releases, history, stats, wrapped, equalizer, recognition, and about 17 settings routes.
- **[R]** Adopt a small, fixed top level. Our product promotes **Settings to a primary destination** and replaces Search with **Explore**, which is search plus browse ([product-requirements.md §4](product-requirements.md#4-information-architecture)). Use the rail-vs-bar idea as sidebar-vs-bottom-bar by breakpoint.

## 3. Home and recommendations

Code: `M/ui/screens/HomeScreen.kt`, `M/viewmodels/HomeViewModel.kt`.

| Section | Source | Evidence |
|---|---|---|
| Speed Dial (user-pinned items) | Local DB | **[C]** `speedDialDao` |
| Quick Picks | Local SQL (`quickPicks()`), mixed with YouTube "related" for the last-played song | **[C]** `M/db/DatabaseDao.kt` ~L400 |
| Keep Listening | Local most-played songs, albums, artists | **[C]** |
| Forgotten Favorites | Local SQL: songs whose play time in the last 30 days is under ~20% of their earlier play time | **[C]** `DatabaseDao.kt` ~L660 |
| Similar to *X* | YouTube artist, album and related data, seeded by local most-played | **[C]** |
| Daily Discover / From the Community | YouTube `next`/`related` and playlists, seeded by liked songs and top artists | **[C]** |
| Home feed, Mood & Genres chips | YouTube `home()` / `explore()` | **[C]** |

- **[C]** "Randomize home order" is on by default and shuffles the sections each session (`HomeScreen.kt` ~L1044-1130).
- **[C]** Selecting a mood chip reloads the feed and hides the personal sections.
- **[C]** The screen has pull-to-refresh and shimmer placeholders.
- **[R]** Adopt **on-device, history-based heuristics** (Keep Listening, Forgotten-Favorites-style rediscovery, Recently Played). They work without any external API.
- **[R]** Reject randomized section order. It hurts muscle memory and predictability, and predictability is a product goal.

## 4. Search and exploration

- **[C]** `M/ui/screens/search/SearchScreen.kt` has a remembered LOCAL/ONLINE toggle and a shortcut to music recognition.
- **[C]** Online filters (`OnlineSearchResult.kt` ~L458-473): All, Songs, Videos, Albums, Artists, Community playlists, Featured playlists, Podcasts, Episodes. Local filters (`LocalSearchScreen.kt` ~L127): All, Songs, Albums, Artists, Playlists.
- **[C]** Suggestions merge local search history with remote suggestions and remove duplicates (`M/viewmodels/OnlineSearchSuggestionViewModel.kt`). History can be paused or cleared in Privacy settings.
- **[C]** Mood & Genres, Charts and New Releases screens exist.
- **[I]** There is no `navigate("charts_screen")` or `navigate("new_release")` call in the Kotlin sources, so these screens may be unreachable. This is a discoverability gap.
- **[C]** Artist page (`M/ui/screens/artist/ArtistScreen.kt`): header image, shuffle and radio actions, an "about" block, songs and albums sections with see-all routes, and a fallback to library data for local artists.
- **[C]** Album page (`AlbumScreen.kt`): header, play, tracklist and an "Other versions" carousel.
- **[R]** Adopt an "All" result view whose section headers jump to a filter, plus recent searches you can individually remove.
- **[R]** Make every browse surface reachable from Explore. Do not add separate local/online modes in MVP: library search lives inside Library.

## 5. Library and playlist management

- **[C]** The Library screen (`M/ui/screens/library/LibraryScreen.kt`) has chips for Playlists, Songs, Albums, Artists and Podcasts. Sub-filters include Liked, Downloaded and Uploaded (`constants/PreferenceKeys.kt` ~L281-303).
- **[C]** Each entity type has its own sort enum (`PreferenceKeys.kt` ~L305-361). For example, `SongSortType` is CREATE_DATE / NAME / ARTIST / PLAY_TIME, and `PlaylistSongSortType` adds CUSTOM.
- **[C]** The list/grid view type is remembered per view, with two grid sizes. Auto playlists include Liked, Downloaded, Top, Cached and Uploaded.
- **[C]** Playlists can be created, edited, deleted (with confirmation) and given a custom cover (`M/ui/component/CreatePlaylistDialog.kt`, `M/ui/menu/PlaylistMenu.kt`, `LocalPlaylistScreen.kt`).
- **[C]** Drag reorder only works with CUSTOM sort **and** after unlocking a lock toggle that is locked by default (`LocalPlaylistScreen.kt` ~L190, ~L642).
- **[C]** Playlists can be imported from CSV (with column mapping) and M3U. Multi-select provides bulk actions (`M/ui/menu/SelectionSongsMenu.kt`).
- **[R]** Adopt per-type sort, list/grid, Liked as a system playlist, and bulk select (P1).
- **[R]** Make reorder discoverable: an always-visible drag handle in a playlist's custom order, plus keyboard move up/down.

## 6. Now Playing and playback behaviour

- **[C]** Playback runs in a Media3 `MediaLibraryService` (`M/playback/MusicService.kt`). The UI binds to it through `PlayerConnection.kt`.
- **[C]** The queue abstraction (`M/playback/queues/Queue.kt`) supports paging: `getInitialStatus`, `hasNextPage`, `nextPage`. It has YouTube, album-radio, list and empty implementations.
- **[C]** When 5 or fewer items remain, the queue auto-loads more ("automix" through related content).
- **[C]** Shuffle and repeat use ExoPlayer's own modes and are persisted. A custom shuffle order offers a "shuffle playlist first" option.
- **[C]** A persistent queue is serialized to disk and restored on startup.
- **[C]** Audio extras:
  - loudness normalization from stored loudness values (`M/playback/audio/`)
  - skip silence
  - parametric EQ with AutoEQ profiles (`M/eq/`)
  - crossfade implemented with a second ExoPlayer instance
  - sleep timer by minutes or end-of-song, with fade-out (`M/playback/SleepTimer.kt`)
- **[C]** Mini player (`M/ui/player/MiniPlayer.kt`): swipe to skip, several background styles.
- **[C]** Full player (`M/ui/player/Player.kt`, `Thumbnail.kt`):
  - gradient background from the artwork palette (`M/ui/theme/PlayerColorExtractor.kt`) or blur
  - several slider and button styles
  - like and share
  - inline lyrics that replace the artwork
- **[C]** Queue sheet (`M/ui/player/Queue.kt`): drag reorder, swipe to remove with undo.
- **[C]** Lyrics come from 6+ providers ordered by a user priority list. They support synced lines and word timing, and fake word timing (~0.18 s per word) when a provider does not supply it (`M/ui/component/LyricsLine.kt` ~L241-250).
- **[R]** Adopt:
  - an artwork-tinted expanded player
  - a single player service as the source of truth, with the UI only observing
  - queue reorder and remove with undo
  - a persisted queue
- **[R]** Defer crossfade, EQ and normalization to P2. On the web they need the Web Audio API and a second audio graph.

## 7. Settings and customization

- **[C]** There are about 159 preference bindings across the settings screens. Appearance alone has about 43 (`M/ui/screens/settings/AppearanceSettings.kt`).
- **[C]** Theme options (`ThemeScreen.kt`, `M/ui/theme/Theme.kt`):
  - Light / Dark / System
  - a separate pure-black toggle
  - dynamic color from the current artwork
  - 19 preset accent colors
- **[C]** Settings are grouped into UI, Player & content, Privacy, Storage and System. Backup & Restore produces a zip of the database plus preferences (`M/viewmodels/BackupRestoreViewModel.kt`).
- **[I]** Many toggles exist only to choose between old and new designs (player, mini player, sliders). This suggests the settings carry design debt.
- **[R]** Adopt Light / Dark / OLED Black plus accents, and an export/import backup.
- **[R]** Cap MVP settings at about 20, and do not ship alternative designs as settings.

## 8. UX strengths and weaknesses

**Strengths** — all [I], grounded in [C] code above:
- Personal discovery works on-device.
- Library power tools are strong.
- The player has a polished, artwork-driven look.
- Queue gestures feel good.
- Rich customization for power users.

**Weaknesses:**
- **[C]** Settings sprawl (about 159 preferences).
- **[C]** Overlapping menus: the song and player menus each have about 15 actions, and Speed and Tempo/Pitch are separate dialogs.
- **[C]** Home order is randomized by default.
- **[C]** Playlist reorder is hidden behind a lock.
- **[I]** Charts and New Releases may be unreachable.
- **[C]** Very large UI files.

## 9. Features suitable for web adaptation

| Feature | Web approach | Priority |
|---|---|---|
| History-based Home sections | Local `playEvents` table plus pure-function rules | P1 (rules), P0 (Recently Played) |
| Search with typed filters and recent searches | Provider search plus Dexie `recentSearches` | P0 |
| Library sort, filter, list/grid | Client-side over Dexie | P0 (sort/filter), P1 (grid toggle) |
| Playlist CRUD and reorder | Dexie plus `@dnd-kit` | P0 |
| Persistent queue | Dexie `playerSnapshot` | P0 |
| Artwork-tinted player | Canvas color sampling | P1 |
| Light / Dark / OLED plus accents | CSS custom properties | P0 |
| Backup export/import | Versioned JSON file | P0 |
| Synced lyrics (user-owned `.lrc`) | LRC parser | P1 |
| Sleep timer | Timer in the application layer | P1 |
| Crossfade, EQ, normalization | Web Audio API | P2 |
| Last.fm scrobbling | Official Last.fm API (needs secret handling, so likely a small backend) | P2 |

## 10. Features requiring native Android capabilities

All [C], present in the repository:
- home-screen widgets (`M/widget/`)
- the Quick Settings tile (`M/quicksettings/`)
- Android Auto (`res/xml/automotive_app_desc.xml`)
- a foreground media service with notification controls
- Google Cast (gms flavor)
- exact alarms and a boot receiver (`M/playback/alarm/`)
- Discord gateway presence
- microphone music recognition with a foreground service (`M/recognition/`)
- a hidden WebView for token generation

**Web equivalents [R]:**
- The Media Session API covers lock-screen and notification controls, as far as each browser supports it.
- PWA install covers home-screen presence.
- Everything else is out of scope for the web, or is a candidate for the future Android app.

## 11. Licensing considerations

- **[C]** `LICENSE` is GPL-3.0, and source headers say "Licensed under GPL-3.0".
- **[C]** The README disclaims affiliation with YouTube, Google and "Metrolist Group LLC", and says trademarks belong to their owners.
- **[I]** *(This is not legal advice.)* Copyright, and therefore the GPL, protects code and its expression, not ideas, features or general architecture. An independently written web app that only takes *inspiration* takes on no GPL obligations.
- **Rules for this project [R]:**
  1. Do not copy or translate Kotlin source, the SQL or Room schema, regexes, parsers or `assets/po_token.html` into this repository.
  2. Do not reuse Metrolist icons, screenshots, strings or translations.
  3. Do not use the "Metrolist", YouTube or YouTube Music names or branding in any public-facing surface: UI, `<title>`, metadata, manifest, icons, About. The working title "Metrolist Web Reimagined" is **internal only** (docs, repository, planning; D5 in [product-requirements.md §9](product-requirements.md#9-decisions-approved-by-the-owner-2026-11-05)). An "inspired by" note is acceptable in repository docs such as the README, but not in the app UI.
  4. Do not depend on `innertubex` or any GPL music-source library.
  5. When citing the reference in docs, cite paths and describe behaviour. Do not paste code.

## 12. Risks of unofficial music APIs

What Metrolist does (all **[C]**, described only, not reproduced):
- It calls the private InnerTube endpoints at `music.youtube.com/youtubei/v1/`.
- It cycles through spoofed client identities (`M/utils/InnerTubeXPlayer.kt`).
- It generates "proof of origin" tokens by running BotGuard JavaScript in a hidden WebView (`M/utils/potoken/`).
- It logs in by reading Google session cookies captured in a WebView (`M/ui/screens/LoginScreen.kt`).
- Stream URLs are cached with a TTL.

Risks **[I]**:

| Risk | Impact on a web product |
|---|---|
| Terms of Service: automated access, client impersonation and anti-abuse circumvention are very likely prohibited | Legal and account exposure, and it cannot be shared with beta users in good faith |
| Breakage: undocumented API, frequent changes to tokens and ciphers | Ongoing maintenance load; Metrolist itself depends on frequent library updates |
| Browser CORS and no BotGuard sandbox | Would need a server-side proxy, which adds backend infrastructure and puts that server in the request path (more legal exposure) |
| Region, age and IP-bound stream URLs | Unreliable playback for friends in other regions |
| Cookie-based login | Credential handling risk; accounts may be flagged |

**Decision [R]:** This project does **not** integrate any unofficial YouTube or YouTube Music access, stream extraction, ad removal or download mechanism. Music sources go through the compliant [`MusicProvider` contract](provider-contract.md) only.

---

## Adopt / Adapt / Avoid summary

| Adopt | Adapt | Avoid |
|---|---|---|
| Single playback service as the source of truth; persistent queue; queue reorder and remove with undo; on-device history heuristics; per-type library sort; JSON backup | Navigation rail becomes the desktop sidebar; Settings becomes a primary destination; local/online search becomes Explore plus a separate Library search; dynamic color becomes an artwork tint limited to the player | Settings sprawl and old/new design toggles; randomized Home order; reorder hidden behind a lock; orphan screens; multi-thousand-line components; unofficial source APIs |
