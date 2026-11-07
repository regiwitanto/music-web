import { container } from '@/application/container'
import type { StorageEvent, StorageLifecycle } from '@/application/ports'
import { type StorageStatusStore, useStorageStatusStore } from '@/application/stores/storage-status'

/**
 * Opens the device store once and keeps the status the listener sees in step with it (002
 * contracts/storage-ports.md §5). It reaches the store only through the `StorageLifecycle` port,
 * never through Dexie, and this file holds the only mapping from results and events to a phase
 * and a notice:
 *
 * | Start result or event                | Status                                 |
 * |--------------------------------------|----------------------------------------|
 * | start → ready                        | ready, no notice (clears blocked)      |
 * | start → unavailable                  | unavailable, `unavailable`             |
 * | start → unavailable (newer data)     | unavailable, `newer-version`           |
 * | blocked                              | opening, `blocked-upgrade`             |
 * | upgraded-elsewhere                   | unavailable, `stale-tab`               |
 * | deleted-elsewhere, lost              | unavailable, `unavailable`             |
 *
 * Once the phase is `unavailable`, later events do not replace the notice: the first one wins.
 */

interface Dependencies {
  lifecycle: StorageLifecycle
  status: StorageStatusStore
}

export function createStorageLifecycle({ lifecycle, status }: Dependencies) {
  let started: Promise<void> | undefined

  const settle = (phase: 'opening' | 'ready' | 'unavailable', notice: ReturnType<StorageStatusStore['getState']>['notice']) => {
    // The first notice wins once the store is unavailable.
    if (status.getState().phase === 'unavailable') return
    status.getState().set({ phase, notice })
  }

  const onEvent = (event: StorageEvent) => {
    switch (event.type) {
      case 'blocked':
        settle('opening', 'blocked-upgrade')
        break
      case 'upgraded-elsewhere':
        settle('unavailable', 'stale-tab')
        break
      case 'deleted-elsewhere':
      case 'lost':
        settle('unavailable', 'unavailable')
        break
    }
  }

  return {
    /** Idempotent per instance (StrictMode runs effects twice) and never throws. */
    start(): Promise<void> {
      started ??= (async () => {
        lifecycle.onEvent(onEvent)
        const result = await lifecycle.start()
        if (result.outcome === 'ready') settle('ready', null)
        else settle('unavailable', result.cause === 'newer-version' ? 'newer-version' : 'unavailable')
      })()
      return started
    },
  }
}

let singleton: ReturnType<typeof createStorageLifecycle> | undefined

/** The app's one lifecycle, built lazily from the container. Called once from `AppShell` after mount. */
export function startStorage(): Promise<void> {
  singleton ??= createStorageLifecycle({ lifecycle: container.storageLifecycle, status: useStorageStatusStore })
  return singleton.start()
}
