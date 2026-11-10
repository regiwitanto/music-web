# Contract: Catalog port and provider registry (003)

**Owner of the shapes**: [data-model.md §1 to §3](../data-model.md) · **Decisions**: [research.md](../research.md) R1, R2, R5, R8, R9

## 1. Who calls what

- Application and presentation code call **only** `container.catalog` (type `Catalog`). They never import a provider or `ProviderRegistry` (constitution VII, architecture §3 rule 3; lint already blocks infrastructure imports outside `container.ts`).
- `ProviderRegistry` implements `Catalog` over a list of `MusicProvider`s. In 003 the container registers only `MockProvider`.

## 2. Registry rules

| # | Rule | Spec |
|---|---|---|
| 1 | Providers are ordered by `PROVIDER_ORDER = ['local', 'sample', 'mock']`; unknown IDs after, in the given order. A duplicate ID throws at construction | FR-010 |
| 2 | Requests by ID are routed by the prefix before the first `:`. No provider for the prefix → `NOT_FOUND` | FR-011 |
| 3 | A provider with status `unavailable` → `UNAVAILABLE`, without being called | R9 |
| 4 | Capability off, or method absent → `NOT_SUPPORTED`, without calling | FR-018 |
| 5 | `init` runs once per provider, on its first request, shared by concurrent requests, with an 8 s limit; failure fails that request and the next request retries | FR-024, R5 |
| 6 | Each request has a time limit starting after `init`: 2 s when `onDevice`, else 8 s → `TIMEOUT` | FR-020 |
| 7 | The caller's signal aborts → `ABORTED`; a result arriving after abort or time-out is dropped | FR-019 |
| 8 | Errors: `ProviderError` passes through; `AbortError` → `ABORTED`; anything else → `UNAVAILABLE` and a `provider-error` diagnostics entry | FR-021 |
| 9 | Search fans out in parallel to providers with `search` and at least one requested type; per-type results merged in registry order; failed providers left out and listed in `failedProviders`; all failed → the first error | FR-016 |
| 10 | `topResult` of a merged search is the first provider's top result in registry order that exists | FR-012 |
| 11 | `browse({ kind: 'genre' or 'mood', id })` is routed by the ID's prefix; `featured` fans out like search, one provider after another | FR-015, R2 |
| 12 | `listGenres` and `listMoods` are concatenated in registry order, skipping providers that fail or lack `browse` | FR-015 |
| 13 | Fan-out cursors wrap provider cursors (data-model §6); a malformed registry cursor → `NOT_FOUND` | FR-014, R8 |
| 14 | `providers()` returns `ProviderInfo` for each provider, in order, synchronously | FR-017 |

## 3. Oracles

| ID | Given / When | Then |
|---|---|---|
| C-T1 | providers given as mock, local-test, sample-test | `providers()` order is local, sample, mock |
| C-T2 | two providers with the same ID | constructor throws |
| C-T3 | `getTrack('nope:1')` | `ProviderError` `NOT_FOUND`, not retryable |
| C-T4 | provider lacking `browse` (flag false) and `browse` requested | `NOT_SUPPORTED`; the provider's method was not called |
| C-T5 | provider whose flag says `browse: true` but the method is absent | `NOT_SUPPORTED` |
| C-T6 | two concurrent first requests | `init` called once; both answer |
| C-T7 | `init` never resolves (fake timers, 8 s) | request fails `UNAVAILABLE`; a second request calls `init` again |
| C-T8 | on-device provider never answers (fake timers) | `TIMEOUT` at 2 s (not before); remote test provider at 8 s |
| C-T9 | caller aborts mid-request | `ABORTED`; a late provider answer is not delivered |
| C-T10 | already-aborted signal | `ABORTED` without calling the provider |
| C-T11 | provider throws `TypeError` | `UNAVAILABLE`, retryable, one `provider-error` diagnostics entry |
| C-T12 | search across two providers, one throws | results of the other; `failedProviders` = [the failed one] |
| C-T13 | search across two providers, both throw | rejects with the first provider's error |
| C-T14 | search across two providers, paged to the end per type | every item of both exactly once, first provider's items first |
| C-T15 | caller aborts a fan-out search | `ABORTED`; `failedProviders` never contains an aborted provider |
| C-T16 | provider status `unavailable` | `UNAVAILABLE`; method not called |
| C-T17 | garbage registry cursor | `NOT_FOUND` |
| C-T18 | `listGenres` across two providers, one failing | the other's genres only, no rejection |

All oracles run in Vitest (`tests/unit/provider-registry.test.ts`) with test providers from `src/test/fakes/`, fake timers for C-T7 and C-T8, and no network.
