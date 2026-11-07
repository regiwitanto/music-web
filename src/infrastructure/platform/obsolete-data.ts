import type { ObsoleteDataCleaner } from '@/application/ports'

/** The key the 001 version wrote. Private here: nothing else in the app knows it any more. */
const OBSOLETE_APPEARANCE_KEY = 'mp.appearance'

/** Deletes the obsolete 001 appearance value from localStorage (014 contracts/identity.md §5). */
export class LocalStorageObsoleteDataCleaner implements ObsoleteDataCleaner {
  removeObsoleteAppearance(): void {
    try {
      window.localStorage.removeItem(OBSOLETE_APPEARANCE_KEY)
    } catch {
      // Storage unavailable (private mode, blocked): there is nothing to remove.
    }
  }
}
