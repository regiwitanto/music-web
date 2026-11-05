import { create } from 'zustand'
import type { AppearancePreference } from '@/domain/appearance'
import { container } from '@/application/container'
import type { AppearanceRepository, DocumentThemeTarget } from '@/application/ports'

export interface SettingsState {
  /**
   * `null` on the server, where the preference is unknown. On the client it is
   * initialised synchronously from the `<html>` attributes that the pre-paint
   * bootstrap already validated and applied (research R6, R15).
   */
  appearance: AppearancePreference | null
  /** After mount: load the repository, and apply only if it differs from the page. */
  reconcile(): void
  /** Applies to `<html>`, then saves, then updates the store, in that order (research R5). */
  setAppearance(next: Partial<AppearancePreference>): void
}

export interface SettingsDependencies {
  readonly appearance: AppearanceRepository
  readonly themeTarget: DocumentThemeTarget
}

function same(a: AppearancePreference | null, b: AppearancePreference): boolean {
  return a !== null && a.theme === b.theme && a.accent === b.accent
}

/**
 * Factory (analysis finding U1): tests build a fresh store per test with fakes.
 * Dependencies are read from `deps` at call time, never from the container directly.
 * `server` defaults to "no document available".
 */
export function createSettingsStore(
  deps: SettingsDependencies,
  options: { server?: boolean } = {},
) {
  const server = options.server ?? typeof document === 'undefined'

  return create<SettingsState>()((set, get) => ({
    appearance: server ? null : deps.themeTarget.read(),

    setAppearance(next) {
      const current = get().appearance ?? deps.themeTarget.read()
      const merged: AppearancePreference = { ...current, ...next }
      deps.themeTarget.apply(merged)
      deps.appearance.save(merged)
      set({ appearance: merged })
    },

    reconcile() {
      const stored = deps.appearance.load()
      if (same(get().appearance, stored)) return
      deps.themeTarget.apply(stored)
      set({ appearance: stored })
    },
  }))
}

/** The app singleton. Its dependencies resolve lazily through the container. */
export const useSettingsStore = createSettingsStore(container)
