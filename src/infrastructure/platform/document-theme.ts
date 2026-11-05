import type { DocumentThemeTarget } from '@/application/ports'
import { type AppearancePreference, DEFAULT_APPEARANCE, isAccent, isTheme } from '@/domain/appearance'

/** Reads and writes `data-theme` / `data-accent` on `<html>` (contracts/theme.md §2). */
export class HtmlDocumentThemeTarget implements DocumentThemeTarget {
  read(): AppearancePreference {
    const root = document.documentElement
    const theme = root.getAttribute('data-theme')
    const accent = root.getAttribute('data-accent')
    return {
      theme: isTheme(theme) ? theme : DEFAULT_APPEARANCE.theme,
      accent: isAccent(accent) ? accent : DEFAULT_APPEARANCE.accent,
    }
  }

  apply(preference: AppearancePreference): void {
    const root = document.documentElement
    root.setAttribute('data-theme', preference.theme)
    root.setAttribute('data-accent', preference.accent)
  }
}
