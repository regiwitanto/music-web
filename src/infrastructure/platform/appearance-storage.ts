import type { AppearanceRepository } from '@/application/ports'
import {
  APPEARANCE_STORAGE_KEY,
  type AppearancePreference,
  DEFAULT_APPEARANCE,
  parseAppearance,
  serializeAppearance,
} from '@/domain/appearance'

/** The 001 appearance store (contracts/theme.md §1). From 002 on it is the pre-paint mirror. */
export class LocalStorageAppearanceRepository implements AppearanceRepository {
  load(): AppearancePreference {
    try {
      return parseAppearance(window.localStorage.getItem(APPEARANCE_STORAGE_KEY))
    } catch {
      return { ...DEFAULT_APPEARANCE }
    }
  }

  save(preference: AppearancePreference): void {
    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, serializeAppearance(preference))
    } catch {
      // Storage unavailable (private mode, blocked, quota): the change still applies for the session.
    }
  }
}
