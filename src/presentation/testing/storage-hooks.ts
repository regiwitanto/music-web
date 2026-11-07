import { container } from '@/application/container'
import type { DiagnosticsLog, Storage } from '@/application/ports'
import { type StorageNotice, useStorageStatusStore } from '@/application/stores/storage-status'

/**
 * Storage test hook (002 research R10; FR-024). Test-only: present only in a build made with
 * NEXT_PUBLIC_TEST_HOOKS=1. The flag is checked with a literal comparison inside the function
 * body, so Next inlines it and a normal production build removes the whole body, including the
 * global name (001 ui-shell.md §7.2). E2E uses it to seed data, read it back, and record what a
 * `watch` delivers, with each value stamped by `Date.now()` when it arrived.
 */

type WatchName = 'likes' | 'playlists' | 'libraryItems' | 'recentSearches'

export interface StorageTestHooks {
  storage: Storage
  diagnostics: DiagnosticsLog
  watches: Record<string, Array<{ at: number; value: unknown }>>
  record(name: WatchName): void
  status(): { phase: string; notice: string | null }
  /** Shows a notice for the G11 screenshots of the two notices E2E cannot produce for real. */
  showNotice(notice: StorageNotice): void
}

declare global {
  interface Window {
    __STORAGE__?: StorageTestHooks
  }
}

/** Call once from a mount-only effect. */
export function installStorageHooks(): void {
  if (process.env.NEXT_PUBLIC_TEST_HOOKS === '1') {
    const { storage, diagnostics } = container
    const hooks: StorageTestHooks = {
      storage,
      diagnostics,
      watches: {},
      record(name) {
        const sources = {
          likes: () => storage.likes.watchList(),
          playlists: () => storage.playlists.watchList(),
          libraryItems: () => storage.libraryItems.watchList(),
          recentSearches: () => storage.recentSearches.watchList(),
        }
        const entries = (hooks.watches[name] ??= [])
        sources[name]().subscribe((value) => entries.push({ at: Date.now(), value }))
      },
      status() {
        const { phase, notice } = useStorageStatusStore.getState()
        return { phase, notice }
      },
      showNotice(notice) {
        useStorageStatusStore.getState().set({ phase: notice === 'blocked-upgrade' ? 'opening' : 'unavailable', notice })
      },
    }
    window.__STORAGE__ = hooks
  }
}
