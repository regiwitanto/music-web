# Contract: Routes

Every address below must load directly by URL, survive Refresh, and work with Back and Forward [FR-009, SC-008]. Classification follows [data-model.md §2](../data-model.md#2-routeclassification).

`<id>` in the tests uses the literal sample `x1`.

## 1. Destination roots

| Address | Route file | `h1` | Current nav | Title |
|---|---|---|---|---|
| `/` | `src/app/page.tsx` | Home | Home | `Home · Music Player` |
| `/explore` | `src/app/explore/page.tsx` | Explore | Explore | `Explore · Music Player` |
| `/library` | `src/app/library/page.tsx` | Library | Library | `Library · Music Player` |
| `/settings` | `src/app/settings/page.tsx` | Settings | Settings | `Settings · Music Player` |

## 2. Reserved nested addresses

Every one of these shows "Nothing here yet" with its parent destination current [FR-012, Story 2 scenarios 2 and 7].

| Address | Route file (under `src/app/`) | Current nav |
|---|---|---|
| `/explore/search` (± `?q=&type=`) | `explore/search/page.tsx` | Explore |
| `/explore/genre/<id>` | `explore/genre/[id]/page.tsx` | Explore |
| `/explore/mood/<id>` | `explore/mood/[id]/page.tsx` | Explore |
| `/explore/artist/<id>` | `explore/artist/[id]/page.tsx` | Explore |
| `/explore/album/<id>` | `explore/album/[id]/page.tsx` | Explore |
| `/library/liked` | `library/liked/page.tsx` | Library |
| `/library/playlists` | `library/playlists/page.tsx` | Library |
| `/library/playlist/<id>` | `library/playlist/[id]/page.tsx` | Library |
| `/library/albums` | `library/albums/page.tsx` | Library |
| `/library/artists` | `library/artists/page.tsx` | Library |
| `/library/recent` | `library/recent/page.tsx` | Library |
| `/settings/<section>` | `settings/[section]/page.tsx` | Settings |

**Rules for these routes**
- **Dynamic routes.** `[id]` and `[section]` pages do not export `generateStaticParams`. They render on request with no data access, so they need no backend (D1, ADR-002).
- **`params`.** These pages never read `params` in 001. Later features own lookups and "not available" states.
- **O7 / D-001-2.** `/settings/<section>` accepts any single segment **during MVP only**. Feature 010 (and 009 for Storage) must restrict it.

## 3. Unknown addresses (in-shell Not Found, no current item)

| Example | Why unknown |
|---|---|
| `/radio` | No destination |
| `/library/podcasts` | Unreserved segment |
| `/explore/genre` | Required segment missing |
| `/explore/album/x1/extra` | Extra segment |
| `/settings/a/b` | Extra segment |
| `/explore/search/x1` | Extra segment on a fixed route |

All of these are served by `src/app/not-found.tsx`, rendered inside the root layout [FR-012, Story 2 scenarios 8 and 9]. HTTP status is 404 where Next sends it before streaming. The test asserts the UI only.

## 4. Error boundaries

| File | Scope | Contract |
|---|---|---|
| `src/app/error.tsx` | Every page under the root layout | In-content error with Retry (`retry()`). The shell keeps working [FR-036] |
| `src/app/global-error.tsx` | Root layout and shell failures | Full-screen recovery with Reload. Applies the stored theme itself [FR-037] |

## 5. Not used in 001

There are no `loading.tsx`, `template.tsx`, `route.ts`, middleware or proxy files, no Server Actions, and no `global-not-found.tsx` (constitution XIII; research R1, R9).
