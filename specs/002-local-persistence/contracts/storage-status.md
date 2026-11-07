# Contract: Storage Status and Banner

Implements Story 2, Story 3 (scenarios 3–4), FR-016, FR-017, FR-022, FR-023, D-002-6 and SC-003. Behaviour is in [data-model §6](../data-model.md#6-storage-status-state-machine); decisions in [research R7, R8, R11](../research.md).

## 1. Status store (`src/application/stores/storage-status.ts`, Zustand)

```ts
type StoragePhase = 'opening' | 'ready' | 'unavailable'
type StorageNotice = 'unavailable' | 'newer-version' | 'blocked-upgrade' | 'stale-tab'
interface StorageStatusState { phase: StoragePhase; notice: StorageNotice | null }
```

Exported as a factory, `createStorageStatusStore()`, plus the app singleton `useStorageStatusStore`. Written only by the lifecycle (`createStorageLifecycle`, [storage-ports.md §5](storage-ports.md#5-use-case)), using its mapping table; infrastructure never writes it. Read by `StorageBanner` and, later, by screens that wait for `phase === 'ready'`.

## 2. Banner text (fixed copy)

| Notice | Text | Source |
|---|---|---|
| `unavailable` | Storage is unavailable: your changes won't be saved. | D-002-6, UX §7 |
| `newer-version` | Storage is unavailable: your changes won't be saved. Data from a newer version of the app was found and has been left untouched. | D-002-6, UX §7 |
| `blocked-upgrade` | A newer version is ready, but another tab is still open. Close the other tab or reload it to finish updating. | New, approved by the owner at G3, 2026-11-07 (research R8) |
| `stale-tab` | This tab is out of date and has stopped saving. Reload this page to continue. | New, approved by the owner at G3, 2026-11-07 (research R8) |

The texts are module constants in `src/presentation/components/shell/StorageBanner.tsx` (English only, one module, architecture §2 "Not adopted: i18n"). They contain no brand names.

## 3. `StorageBanner` rules

| Rule | Detail |
|---|---|
| Placement | First child of the content column inside `AppShell` `<main>`, in normal flow, before the page content. Never fixed or sticky; never covers content, navigation, sidebar or player dock |
| Visibility | The visible box is rendered only when `notice !== null`; nothing is visible while `opening` without a notice, or `ready` |
| Semantics | The `role="status"` (polite live region) element **is always present**, empty until a notice exists, so assistive technology registers it before text arrives (amended after the `/code-review`, 2026-11-07: a region inserted already filled is not reliably announced). No `tabindex`, no link, button or other focusable descendant. Never receives focus |
| Content | An information icon (`aria-hidden`) and the text. Wraps at 320 px; no horizontal scroll |
| Styling | Applied to the inner box. Token utilities only: `bg-surface`, `border border-divider`, `text-text`, `rounded-md`. No new colour token |
| Persistence | Stays for the whole session once shown (no dismiss control), on every page, because it lives in the persistent shell |

## 4. Test oracles

| ID | Oracle | Level |
|---|---|---|
| B-T1 | For each notice, the banner shows exactly the §2 text with `role="status"` | component |
| B-T2 | The banner has no focusable descendants and no `tabindex` | component |
| B-T3 | For `phase` `opening` or `ready` without a notice, the live region exists and is empty (no text, no box) | component |
| B-T4 | `indexedDB` removed by an init script. **Functional:** the shell starts, all four destinations open, the `unavailable` banner is visible on each, no `pageerror`. **Performance (SC-003, separate assertion):** the banner's insertion time, measured in the page from navigation start, is below 1000 ms (see [research R10](../research.md#r10-e2e-mechanics-and-test-hooks-fr-024-sc-001-to-sc-003-sc-006-sc-007)) | E2E, six projects |
| B-T5 | `mp-library` pre-created at a higher version: the `newer-version` banner shows, and after the page closes the database still has its original version and rows (FR-023) | E2E, six projects |
| B-T6 | `indexedDB.open` delayed forever: the shell and navigation render and are usable; no banner (SC-007, edge case "Store opens slowly") | E2E, six projects |
| B-T7 | axe reports 0 serious or critical issues with the banner shown, on all seven 001 paths (SC-008) | E2E |
| B-T8 | Integration: `blocked` sets `blocked-upgrade` and clears it on success; an upgrade elsewhere closes the connection, sets `stale-tab`, and later writes go to memory only; a deletion elsewhere sets `unavailable`, not `stale-tab`; an operation in flight that fails after the switch leaves the first notice and does not switch again | integration |
