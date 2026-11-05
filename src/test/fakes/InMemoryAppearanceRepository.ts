import type { AppearanceRepository } from '@/application/ports'
import { type AppearancePreference, DEFAULT_APPEARANCE } from '@/domain/appearance'

/** In-memory test fake for AppearanceRepository. Never imported by app code (lint-enforced). */
export class InMemoryAppearanceRepository implements AppearanceRepository {
  /** When true, save() fails internally and swallows the error, like blocked storage. */
  failOnSave = false
  private value: AppearancePreference

  constructor(
    initial: AppearancePreference = DEFAULT_APPEARANCE,
    private readonly onCall?: (call: string) => void,
  ) {
    this.value = { ...initial }
  }

  load(): AppearancePreference {
    this.onCall?.(`load:${this.value.theme}/${this.value.accent}`)
    return { ...this.value }
  }

  save(preference: AppearancePreference): void {
    this.onCall?.(`save:${preference.theme}/${preference.accent}`)
    try {
      if (this.failOnSave) throw new Error('storage unavailable')
      this.value = { ...preference }
    } catch {
      // Swallowed, as the port requires.
    }
  }

  /** The stored value, for assertions. */
  get stored(): AppearancePreference {
    return { ...this.value }
  }
}
