# Feature Specification: Mock Catalog and Provider Registry

**Feature Branch**: `003-catalog-provider`

**Created**: 2026-11-08

**Status**: Approved (owner, 2026-11-08, G1), after clarification D-003-1

**Input**: User description: "003 mock catalog and provider registry" (roadmap Phase 02; specs/README.md row 003: SRC-01, plus the provider registry and the provider contract suite; depends on 001).

**Covers**:
- Feature IDs: SRC-01 (the mock catalog), the provider registry ([provider-contract.md §10](../../docs/provider-contract.md#10-registry)) and the shared provider contract suite ([test-plan §3.3](../../docs/testing/test-plan.md#33-provider-contract-tests))
- Phase 02 acceptance it enables (but does not itself show on screen): "mock failure injection shows every error state" and "provider contract tests pass against the mock catalog" ([roadmap](../../docs/roadmap.md), Phase 02)
- No screens. Explore (004), Library (005) and Home (006) build the screens that use this catalog; About and its attributions are 010 (SET-05)

**Sources**:
- [provider-contract.md](../../docs/provider-contract.md) §1 to §6, §8, §9.1, §10 (concepts and rules; this spec does not choose the implementation)
- [product-requirements.md](../../docs/product-requirements.md) §6 (music-source policy), §7 (branding D5), §8 (assumption A3)
- [architecture.md](../../docs/architecture.md) §5 (domain model; the library entities defined by 002 that 003 may refine but not re-conceive)
- Constitution VII (provider abstraction), X (deterministic tests), XII (licensing and branding), XIII (no backend)

## Clarifications

### Session 2026-11-08

- **D-003-1.** Q: Should artificial latency and failure injection be available only in development and test-hooks builds, or also in the deployed app (for example through `?mockFail=search`)? → A: **Development and test-hooks builds only** (option A). The deployed app never has artificial latency or injected failures, and a normal production build contains neither (FR-023). provider-contract §9.1's `?mockFail=search` example is to be read within that rule; the owning doc is aligned at planning.

## User Scenarios & Testing *(mandatory)*

This feature has no screen of its own. Its "users" are the owner, who must be able to judge Home and Explore against a realistic catalog (PRD A3), and the later features that build those screens. The end listener benefits indirectly: every catalog screen gets the same data, the same paging, and the same errors, wherever it comes from.

### User Story 1 - A realistic, fictional catalog exists and is identical every time (Priority: P1)

The app ships a mock music catalog: genres, moods, artists, albums, tracks and curated playlists, with names that sound plausible but are invented, and with locally generated artwork. Every run, on every device, sees exactly the same catalog, so screens, tests and screenshots are repeatable.

**Why this priority**: Every Phase 02 screen (Explore, Library, Home) needs catalog data before it can be built or judged. Without it nothing else in the phase can start.

**Independent Test**: Load the catalog twice (and on a second machine) and compare: the content is identical. Pick any item and follow its links (album to its tracks, track to its artists and album, playlist to its tracks); every linked item exists.

**Acceptance Scenarios**:

1. **Given** the catalog, **When** it is counted, **Then** it contains about 12 genres, 8 moods, 40 artists, 80 albums, 600 tracks and 20 curated playlists (exact numbers are fixed once, at planning, and never drift afterwards).
2. **Given** any album, **When** its tracks are requested, **Then** every listed track exists, belongs to that album, and is returned in track order.
3. **Given** any track, artist, album or playlist, **When** its references (artists, album, genres, moods, tracks) are followed, **Then** every referenced item exists in the catalog.
4. **Given** the catalog is regenerated from the same seed, **When** it is compared with the committed catalog, **Then** the two are identical.
5. **Given** every name and text in the catalog, **When** it is checked against the project's brand denylist, **Then** no real third-party brand appears; names are invented.
6. **Given** every item that shows artwork, **When** its artwork is inspected, **Then** it was generated locally, comes from no third party, and has a dominant colour.

---

### User Story 2 - Screens get catalog data through one registry, by search, browse or ID (Priority: P1)

A screen asks one registry for catalog data: search by text, browse a genre, a mood or the featured selection, or fetch an artist, album, playlist or track by ID. The registry sends the request to the right provider and returns results in one shape, with paging. The screen never knows which provider answered.

**Why this priority**: This is the single door every later screen goes through (constitution VII). Explore search, genre and mood pages, and artist and album pages all depend on it.

**Independent Test**: Through the registry alone, search for a word that appears in the catalog and page through the results to the end; browse a genre to the end; open an artist and an album from the results. Ask for an ID with an unknown prefix and get "not found".

**Acceptance Scenarios**:

1. **Given** a search text that matches catalog items, **When** it is searched for all types, **Then** results come back grouped as songs, albums, artists and playlists, each group in a stable order, with a top result when there is a match.
2. **Given** a search with more matches than one page, **When** the next page is requested repeatedly, **Then** each page brings new items, no item repeats, and the last page says there is no more.
3. **Given** a search for text that matches nothing, **When** it completes, **Then** every group is empty (a valid "no results", not an error).
4. **Given** a page size, **When** none is given the default is 20, and **When** more than 50 is asked for **Then** at most 50 come back.
5. **Given** a genre, a mood, or the featured selection, **When** it is browsed, **Then** items of that genre or mood come back in pages, and following pages to the end returns every matching item exactly once.
6. **Given** an artist ID, **When** the artist is opened, **Then** the artist comes back with top tracks and albums; **Given** an album ID, **Then** the album comes back with its tracks; **Given** a playlist ID, **Then** the playlist comes back with its tracks.
7. **Given** an ID whose prefix belongs to no registered provider, or an ID that does not exist, **When** it is requested, **Then** the request fails as "not found".
8. **Given** the registry, **When** it is asked which providers are registered, **Then** it lists them with their names, capabilities and attribution (for the About screen in 010).
9. **Given** the mock catalog, **When** its capabilities are read, **Then** search, browse, artist pages and album pages are available, and playback, lyrics and versions are not; no mock track is playable.

---

### User Story 3 - Slowness and failures are predictable and can be produced on purpose (Priority: P2)

Every catalog request can be cancelled, has a time limit, and fails only with one of a fixed set of errors, each marked as retryable or not. For development and testing, the mock catalog can be made slow, and any of its requests can be made to fail, so later features can build and test their loading, empty and error states.

**Why this priority**: Phase 02 must show every error state (roadmap). The screens that show them come later, but the means to produce each state must exist first, and must behave the same as a real provider would.

**Independent Test**: Cancel a request in flight and observe a cancellation (never shown to the user); make a request exceed its time limit and observe a timeout; turn on failure for one kind of request and observe that only that kind fails, with the chosen error.

**Acceptance Scenarios**:

1. **Given** a request in flight, **When** it is cancelled, **Then** it ends as "aborted", and no result is delivered afterwards.
2. **Given** a provider that does not answer within its time limit (2 s for an on-device provider such as the mock catalog, 8 s for a remote one), **When** the limit passes, **Then** the request fails as "timeout", which is retryable.
3. **Given** a provider that fails with an unexpected error, **When** the registry receives it, **Then** it reaches the caller as one of the fixed error kinds, never as a raw error.
4. **Given** data that does not have the expected shape, **When** it is returned by a provider, **Then** the request fails as "invalid response" and the details go to the diagnostics log, not to the user.
5. **Given** failure injection turned on for one kind of request (for example search) with a chosen error kind, **When** that kind of request is made, **Then** it fails with that error, and other kinds of request still succeed.
6. **Given** artificial latency is configured in a development or test-hooks build, **When** catalog requests are made, **Then** each answers after a delay in the configured range; in automated tests the delay is 0 by default.
7. **Given** a search across several providers where one fails, **When** the search completes, **Then** the results of the others are returned, and the failed provider is reported so the screen can show a non-blocking notice.
8. **Given** a method a provider does not support (its capability is off), **When** it is called through the registry, **Then** it fails as "not supported".
9. **Given** a normal production build, **When** it is inspected, **Then** it contains no artificial latency and no failure injection (D-003-1).

---

### User Story 4 - Any provider can be checked against the same contract (Priority: P2)

A single shared set of checks verifies that a provider honours the contract: its capabilities match what it actually does, every ID carries its prefix, paging makes progress and ends, cancellation works, and bad data is rejected. The mock catalog passes it now; the on-device file and sample providers (009) will be run through the same checks.

**Why this priority**: Constitution VII makes passing this suite a condition for merging any provider. Building it with the first provider keeps it honest and ready for 009.

**Independent Test**: Run the shared checks against the mock catalog: all pass. Run them against a deliberately broken provider (wrong prefix, paging that never ends, ignores cancellation): each fault is caught by a named check.

**Acceptance Scenarios**:

1. **Given** the mock catalog, **When** the shared contract checks run, **Then** all pass.
2. **Given** a test provider whose declared capabilities do not match its methods, **When** the checks run, **Then** the capability check fails.
3. **Given** a test provider that returns an ID without its own prefix, **When** the checks run, **Then** the ID check fails.
4. **Given** a test provider whose paging repeats a page or never ends, **When** the checks run, **Then** the paging check fails.
5. **Given** a test provider that ignores cancellation, **When** the checks run, **Then** the cancellation check fails.
6. **Given** a test provider that returns badly shaped data without rejecting it, **When** the checks run, **Then** the invalid-response check fails.
7. **Given** a provider that declares playback, **When** the checks run, **Then** they also verify that a resolved stream has a format the environment can play and that releasing it twice is harmless (not exercised by the mock catalog, which declares no playback).

### Edge Cases

- **Empty or whitespace-only search text**: returns empty groups, not an error, and does not page.
- **Accents and letter case**: "Bjorn" finds "Björn"; "NIGHT" finds "Night" (search ignores case and accents).
- **A cursor from a different query, or a made-up cursor**: the request for that page fails as "not found" and never returns items of another query (a default; see Assumptions).
- **A request cancelled before it starts** (signal already cancelled): ends as "aborted" immediately.
- **A request cancelled after it has completed**: the result already delivered stands; nothing changes.
- **Two providers registered with the same prefix**: registration is refused at startup (a programming error, surfaced in development and tests).
- **An artist with no albums, or a genre with fewer items than one page**: returns what exists, with "no more pages".
- **Curated playlists that reference a track also on an album**: the same track ID is returned in both places, never a copy with a different ID.
- **Failure injection naming an unknown request kind**: ignored and logged; normal behaviour continues.
- **The catalog is requested before the app has finished starting**: the request waits for the catalog to be ready rather than failing.
- **Saved tracks from the catalog** (likes, library items stored by 002): the snapshot kept on the device keeps them displayable even if the catalog changes in a later version; 003 does not change 002's snapshot rules.

## Requirements *(mandatory)*

### Functional Requirements

**Catalog content (Story 1)**

- **FR-001**: The mock catalog MUST contain genres, moods, artists, albums, tracks and curated playlists in the approximate quantities of Story 1 scenario 1; the exact counts are fixed at planning and tested.
- **FR-002**: The catalog MUST be deterministic: generated once from a fixed seed by a repeatable generator, kept in the repository, and identical on every run and device. Regenerating from the same seed MUST reproduce it exactly.
- **FR-003**: Every reference in the catalog (track to artists, album, genres and moods; album to artists and tracks; playlist to tracks and genres; artist to genres) MUST resolve to an existing item.
- **FR-004**: All names and texts MUST be invented. None may match a name on the project's brand denylist, and the catalog MUST contain no real artist, label or trademark that the project knows of.
- **FR-005**: Artwork MUST be generated locally (abstract gradients or shapes), contain no third-party image, and every artwork MUST have a dominant colour suitable for placeholders.
- **FR-006**: Catalog items MUST use the library entity shapes defined by 002 (track, album, artist, artwork) so that a catalog item can be saved to the library unchanged. Fields MAY be refined (as 002 allows) but no concept may be redefined. The catalog-only shapes (artist detail, catalog playlist, genre or mood, page of results) are added by this feature.
- **FR-007**: Every mock track MUST be marked not playable, and the mock catalog MUST declare playback, lyrics and versions as unavailable. Pointing mock tracks at sample audio is out of scope (sample audio is 009).
- **FR-008**: Track metadata MUST include title, artists, album, duration, genres, moods, track and disc number where relevant, and an explicit flag; albums MUST include a year; durations and years MUST be plausible (for example, durations between 1 and 10 minutes).

**Registry and requests (Story 2)**

- **FR-009**: All catalog data MUST be obtained through a single registry. No screen or application code may call a provider directly (constitution VII).
- **FR-010**: The registry MUST register providers at startup in the fixed order on-device files, sample, mock; in this feature only the mock catalog is registered. Registering two providers with the same prefix MUST be refused.
- **FR-011**: Every entity ID MUST have the form `<provider>:<local id>`. The registry MUST route each request by that prefix. An unknown prefix MUST fail as "not found". IDs MUST be treated as opaque everywhere outside the registry and providers.
- **FR-012**: Search MUST accept a text, the types to search (songs, albums, artists, playlists), a page size and an optional cursor, and MUST return results grouped by type, each group paged, plus a top result when there is a match.
- **FR-013**: Search matching in the mock catalog MUST ignore letter case and accents, match on names (track title, artist name, album title, playlist name), and order results deterministically: exact match first, then names starting with the text, then names containing it, ties broken by name and then by ID.
- **FR-014**: Paging MUST use cursors: each page returns a cursor for the next page, or none at the end. The default page size MUST be 20 and the maximum 50. Following cursors to the end MUST return every matching item exactly once.
- **FR-015**: The registry MUST provide browse by genre, by mood and a featured selection, fetch by ID for track, album (with tracks), artist (with top tracks and albums) and catalog playlist (with tracks), and lists of genres and moods.
- **FR-016**: Search across several providers MUST query them in parallel, merge results per type keeping each provider's order, and leave out a provider that fails, reporting which one failed so the caller can show a non-blocking notice.
- **FR-017**: The registry MUST list the registered providers with their display name, capabilities and attribution, for the About screen (010). The mock catalog's display name and any attribution MUST contain no third-party brand.
- **FR-018**: Calling a request the provider's capabilities say it does not support MUST fail as "not supported". Screens decide what to show from capabilities only, never from which provider it is (constitution VII).

**Time limits, cancellation and errors (Story 3)**

- **FR-019**: Every request MUST accept a cancellation signal. A cancelled request MUST end as "aborted", deliver no result afterwards, and is never shown to the user.
- **FR-020**: The registry MUST apply a time limit to every request: 2 seconds for on-device providers (the mock catalog counts as on-device) and 8 seconds for remote providers. Exceeding it MUST fail as "timeout".
- **FR-021**: Every failure reaching a caller MUST be one of: not found, unavailable, timeout, rate limited, unauthorized, not supported, invalid response, stream expired, aborted; each MUST carry the provider and whether it is retryable, as in [provider-contract.md §6](../../docs/provider-contract.md#6-errors). Any other thrown error MUST be converted before it reaches the caller.
- **FR-022**: Every provider response MUST be validated against its expected shape. A response that fails MUST produce "invalid response" and an entry in the diagnostics log (002) with no personal data.
- **FR-023**: The mock catalog MUST support artificial latency (a range in milliseconds; 0 by default in automated tests) and failure injection per request kind with a chosen error kind. **Where these may be turned on (D-003-1)**: only in development and test-hooks builds, under the same rule as 001's and 002's test hooks. A normal production build MUST contain neither, and the existing build scan MUST be able to show they are absent; the deployed app never adds latency or injected failures.
- **FR-024**: Loading the catalog MUST NOT slow the app shell's first paint: catalog data is loaded when it is first requested, not as part of the shell, and a request made before it is ready waits for it rather than failing.

**Contract suite (Story 4)**

- **FR-025**: A shared contract suite MUST exist that any provider can be run against. It MUST check: capabilities match the methods that exist (an unsupported method fails as "not supported"); every returned ID has the provider's prefix; paging makes progress, never repeats an item, and ends; cancellation ends as "aborted"; badly shaped data produces "invalid response"; and, for a provider that declares playback, that a resolved stream's format is playable in the test environment and that releasing it twice is harmless.
- **FR-026**: The mock catalog MUST pass the contract suite. The suite MUST itself be shown to catch each fault it checks for, by running it against deliberately broken test providers.

### Key Entities *(include if feature involves data)*

- **Provider**: a source of catalog metadata (and, for later providers, playable audio). Has an ID prefix, a display name, capabilities, an optional attribution and a status (ready, degraded, unavailable).
- **Capabilities**: which kinds of request a provider supports (search and which types, browse, artist pages, album pages, playback, lyrics, versions). Screens decide behaviour from these alone.
- **Registry**: the single entry point. Knows the registered providers, routes requests by ID prefix, applies time limits, converts errors, merges multi-provider searches, and lists providers.
- **Genre / Mood**: a named taxonomy entry with optional artwork and colour; tracks, artists and playlists refer to them.
- **Artist, Album, Track, Artwork**: the library entities from 002, as catalog items; an **artist detail** adds top tracks and albums; an **album with tracks** adds its tracklist.
- **Catalog playlist**: a curated, read-only playlist from a provider (name, description, artwork, ordered track IDs, genres, curator). Distinct from the user's own playlists (002), which are local.
- **Page of results**: items plus a cursor for the next page (none at the end), and optionally a total.
- **Search result**: one page per requested type, plus an optional top result.
- **Provider error**: one of the fixed kinds, with the provider and a retryable flag.
- **Mock catalog data**: the generated, committed catalog and its generator seed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Two independent loads of the catalog, on different machines, produce identical content (100% of items equal), and regenerating from the seed reproduces the committed catalog exactly.
- **SC-002**: 100% of references in the catalog resolve to an existing item, and 0 names match the brand denylist.
- **SC-003**: The mock catalog passes 100% of the shared contract checks, and each check fails against at least one deliberately broken test provider.
- **SC-004**: Following search, genre or mood paging to the end returns every matching item exactly once (0 duplicates, 0 omissions) for every genre, every mood and a fixed set of at least 10 search texts.
- **SC-005**: With artificial latency off, 95% of catalog requests answer in under 100 ms on the reference development machine; with it on, every request answers within the configured range (plus 50 ms tolerance). These are wall-clock measurements, reported, not proof of determinism.
- **SC-006**: A request that exceeds its time limit fails as "timeout" within 250 ms after the limit, and a cancelled request ends as "aborted" with no later result, in 100% of test runs.
- **SC-007**: The app shell's first paint is not delayed by the catalog: the shell's measured first paint stays within 10% of the measurement before this feature, on the same machine and build type.
- **SC-008**: Every error kind the mock catalog can be made to produce through failure injection reaches the caller as that kind (100% of the injectable kinds), so later features can show each error state.
- **SC-009**: The owner can judge Home and Explore with this catalog (PRD A3): confirmed at this feature's review by inspecting a sample of the catalog (names, artwork, spread across genres and moods).

## Assumptions

- **No screens in this feature.** Explore (004), Library (005) and Home (006) build the screens; About (010) shows the provider list. 003 may add test-only hooks, but no user-visible surface.
- **Only the mock catalog is registered.** The on-device file and sample providers are 009; the registry's fixed order already reserves their places.
- **No mock track is playable.** Mock tracks pointing at sample audio (allowed by provider-contract §9.1) waits for sample audio in 009 and would be proposed there.
- **Catalog size follows provider-contract §9.1** ("about" 12, 8, 40, 80, 600, 20); the exact numbers are a planning decision and then fixed.
- **Search ranking** (FR-013) is a reasonable default for a mock catalog, not a recommendation algorithm; personal ranking is Phase 04 (011).
- **An unusable cursor** (made up, or from another query) ends the list with "not found" rather than returning items of another query.
- **The mock catalog is an on-device provider** for time limits (2 s), because its data ships with the app.
- **Diagnostics**: invalid responses are recorded in the diagnostics log built by 002 (in-memory, no personal data).
- **No network, no backend**: the catalog ships with the app (constitution XIII); no remote request is made.
- **Tests are deterministic** (constitution X): injected clock and random source, fixed fixtures, no real network, latency 0 by default.
- **Branding**: the brand denylist is the one the project's branding scan already uses (001); the catalog generator draws invented names from neutral word parts.
- **New dependencies**, if any are needed (for example for the generator or response validation, which 002 already added), are justified in architecture §2 at planning.
