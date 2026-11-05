'use client'

import { useSettingsStore } from '@/application/stores/settings'
import {
  ACCENT_LABELS,
  ACCENTS,
  buildAppearanceSelectionScript,
  THEME_LABELS,
  THEMES,
} from '@/application/shell'
import type { Accent, Theme } from '@/domain/appearance'
import { InlineScript } from '@/presentation/components/InlineScript'

/**
 * Settings → Appearance (theme.md §5). Native radios, controlled from the store.
 * The selected indicator is drawn by CSS from the <html> attributes, and the inline
 * script after the fieldsets checks the matching radios during parsing (R15).
 */
export function AppearanceSettings() {
  // On the server this is null (no radio rendered checked; the inline script below
  // checks them during parsing). On the client the store is initialised synchronously
  // from <html>, so even the hydration render carries the persisted values and React
  // never clears the checked state (verified by the V25 cold-load E2E test).
  const appearance = useSettingsStore((s) => s.appearance)
  const setAppearance = useSettingsStore.getState().setAppearance

  return (
    <section aria-labelledby="appearance-heading" className="mt-6 flex flex-col gap-6">
      <h2 id="appearance-heading" className="text-title-3">
        Appearance
      </h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-body-strong">Theme</legend>
        <div className="flex flex-wrap gap-3">
          {THEMES.map((value: Theme) => (
            <label
              key={value}
              data-option-theme={value}
              className="appearance-option flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2"
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={appearance?.theme === value}
                onChange={() => setAppearance({ theme: value })}
                suppressHydrationWarning
              />
              <span aria-hidden="true" className="appearance-swatch" />
              <span>{THEME_LABELS[value]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-body-strong">Accent</legend>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((value: Accent) => (
            <label
              key={value}
              data-option-accent={value}
              className="appearance-option flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2"
            >
              <input
                type="radio"
                name="accent"
                value={value}
                checked={appearance?.accent === value}
                onChange={() => setAppearance({ accent: value })}
                suppressHydrationWarning
              />
              <span aria-hidden="true" className="appearance-swatch" />
              <span>{ACCENT_LABELS[value]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <InlineScript html={buildAppearanceSelectionScript()} />
    </section>
  )
}
