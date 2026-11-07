import { create } from 'zustand'

/**
 * What the listener is told about the device store (002 contracts/storage-status.md §1).
 * Written only by the lifecycle (`createStorageLifecycle`), using its mapping table; read by
 * the banner and, later, by screens that wait for `phase === 'ready'`.
 */

export type StoragePhase = 'opening' | 'ready' | 'unavailable'
export type StorageNotice = 'unavailable' | 'newer-version' | 'blocked-upgrade' | 'stale-tab'

export interface StorageStatusState {
  phase: StoragePhase
  notice: StorageNotice | null
  set(next: { phase: StoragePhase; notice: StorageNotice | null }): void
}

/** Factory (as in 001's settings store): tests build a fresh store per test. */
export function createStorageStatusStore() {
  return create<StorageStatusState>()((set) => ({
    phase: 'opening',
    notice: null,
    set: (next) => set(next),
  }))
}

export type StorageStatusStore = ReturnType<typeof createStorageStatusStore>

/** The app singleton. */
export const useStorageStatusStore = createStorageStatusStore()
