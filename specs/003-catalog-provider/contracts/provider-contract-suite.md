# Contract: The shared provider contract suite (003)

**Decisions**: [research.md](../research.md) R6, R11 · **Owning doc**: [test-plan §3.3](../../../docs/testing/test-plan.md#33-provider-contract-tests)

## 1. Entry point

```ts
// tests/contract/provider-contract.ts
interface ContractSubject {
  name: string
  create(options?: { source?: unknown }): MusicProvider        // a fresh provider; `source` replaces its data
  samples: {
    ids: Partial<Record<'track' | 'album' | 'artist' | 'playlist', EntityId>>
    searchWithMatches: string[]          // at least one per supported search type
    searchWithoutMatches: string
    browse?: BrowseRequest
  }
  corruptSource?: unknown                // omitted only by a provider with no external source (reason recorded)
}
function runProviderContract(subject: ContractSubject): void   // declares Vitest describe/it blocks
```

The suite tests the provider directly, plus one pass through a registry holding only that provider.

## 2. Checks

| Check | What it asserts |
|---|---|
| `capabilities` | each flag matches the method's presence; `searchTypes` empty when `search` is false; through the registry a missing method gives `NOT_SUPPORTED` |
| `id-prefix` | every ID in every sample response (items, nested artists and albums, track IDs, genre and mood IDs) starts with `<id>:` |
| `paging` | cursors end within `ceil(total / limit) + 1` pages (or 100 pages when `total` is absent), no item repeats, `limit` 51 returns at most 50 |
| `abort` | already-aborted signal and mid-request abort both reject `ABORTED` |
| `invalid-response` | a provider created over `corruptSource` rejects `INVALID_RESPONSE` |
| `stream` (if `capabilities.stream`) | `resolveStream` MIME type accepted by the stubbed `canPlayType`; `release()` twice does not throw |

## 3. Oracles

| ID | Given | Then |
|---|---|---|
| S-T1 | the mock | every check passes (`stream` reported as not applicable) |
| S-T2 | broken provider: `browse: true` flag, no method | only `capabilities` fails |
| S-T3 | broken provider: returns `other:` IDs | only `id-prefix` fails |
| S-T4 | broken provider: `nextCursor` never null | only `paging` fails |
| S-T5 | broken provider: ignores its signal | only `abort` fails |
| S-T6 | broken provider: accepts the corrupt source | only `invalid-response` fails |
| S-T7 | a test provider declaring `stream` with a valid source and idempotent `release` | `stream` passes; with a non-idempotent `release` it fails |

S-T2 to S-T7 run the suite's checks as plain functions and assert which one fails, so a meta-test never leaves a red test in the normal run (`tests/contract/broken-providers.test.ts`). The broken providers live in `src/test/fakes/`.
