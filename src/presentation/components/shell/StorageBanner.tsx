'use client'

import { Info } from 'lucide-react'
import { type StorageNotice, useStorageStatusStore } from '@/application/stores/storage-status'

/**
 * The persistent notice shown when the device store cannot save (002 contracts/storage-status.md
 * §2–§3; FR-017). It sits in normal flow at the top of the content column, so it can never cover
 * content or the navigation. It is a polite live region, takes no focus and has nothing focusable
 * inside. The live region itself is always present and empty until a notice exists: many screen
 * readers announce text that arrives in an existing region but not a region inserted already
 * filled (review finding; research R11). English only, one module (architecture §2, "Not adopted: i18n").
 */

const NEUTRAL = "Storage is unavailable: your changes won't be saved."

const TEXTS: Record<StorageNotice, string> = {
  unavailable: NEUTRAL,
  'newer-version': `${NEUTRAL} Data from a newer version of the app was found and has been left untouched.`,
  'blocked-upgrade':
    'A newer version is ready, but another tab is still open. Close the other tab or reload it to finish updating.',
  'stale-tab': 'This tab is out of date and has stopped saving. Reload this page to continue.',
}

export function StorageBanner() {
  const notice = useStorageStatusStore((state) => state.notice)
  return (
    <div role="status">
      {notice !== null && (
        <div className="mb-4 flex items-start gap-3 rounded-md border border-divider bg-surface px-4 py-3 text-body text-text">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p>{TEXTS[notice]}</p>
        </div>
      )}
    </div>
  )
}
