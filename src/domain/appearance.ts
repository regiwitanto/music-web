/**
 * Theme and accent preference (spec FR-018 to FR-022; data-model §3; contracts/theme.md).
 */

export const THEMES = ['system', 'light', 'dark', 'oled'] as const
export const ACCENTS = ['violet', 'blue', 'teal', 'green', 'amber', 'orange', 'rose', 'red'] as const

export type Theme = (typeof THEMES)[number]
export type Accent = (typeof ACCENTS)[number]

export interface AppearancePreference {
  theme: Theme
  accent: Accent
}

export const THEME_LABELS: Readonly<Record<Theme, string>> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
  oled: 'OLED Black',
}

export const ACCENT_LABELS: Readonly<Record<Accent, string>> = {
  violet: 'Violet',
  blue: 'Blue',
  teal: 'Teal',
  green: 'Green',
  amber: 'Amber',
  orange: 'Orange',
  rose: 'Rose',
  red: 'Red',
}

export const DEFAULT_APPEARANCE: Readonly<AppearancePreference> = Object.freeze({ theme: 'system', accent: 'violet' })

/** Internal device-storage key. Contains no public brand. */
export const APPEARANCE_STORAGE_KEY = 'mp.appearance'

const STORAGE_VERSION = 1

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

export function isAccent(value: unknown): value is Accent {
  return typeof value === 'string' && (ACCENTS as readonly string[]).includes(value)
}

function defaults(): AppearancePreference {
  return { theme: DEFAULT_APPEARANCE.theme, accent: DEFAULT_APPEARANCE.accent }
}

/**
 * Total parser: never throws. `null`, non-JSON, a non-object, or `v !== 1` give the
 * defaults; otherwise each field is validated independently.
 */
export function parseAppearance(raw: string | null): AppearancePreference {
  if (raw === null) return defaults()
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return defaults()
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return defaults()
  const record = data as Record<string, unknown>
  if (record.v !== STORAGE_VERSION) return defaults()
  return {
    theme: isTheme(record.theme) ? record.theme : DEFAULT_APPEARANCE.theme,
    accent: isAccent(record.accent) ? record.accent : DEFAULT_APPEARANCE.accent,
  }
}

export function serializeAppearance(preference: AppearancePreference): string {
  return JSON.stringify({ v: STORAGE_VERSION, theme: preference.theme, accent: preference.accent })
}

/**
 * The pre-paint bootstrap (research R4, ADR-009): a self-contained ES5 IIFE for the
 * first child of <head>. It reads storage, validates against the embedded lists,
 * and sets only `data-theme` / `data-accent`. It never throws and never writes storage.
 */
export function buildThemeBootstrapScript(): string {
  return (
    '(function(){try{' +
    `var T=${JSON.stringify(THEMES)},A=${JSON.stringify(ACCENTS)};` +
    `var r=localStorage.getItem(${JSON.stringify(APPEARANCE_STORAGE_KEY)});if(!r)return;` +
    `var p=JSON.parse(r);if(!p||typeof p!=="object"||p.v!==${STORAGE_VERSION})return;` +
    'var d=document.documentElement;' +
    'if(T.indexOf(p.theme)>=0)d.setAttribute("data-theme",p.theme);' +
    'if(A.indexOf(p.accent)>=0)d.setAttribute("data-accent",p.accent)' +
    '}catch(e){}})()'
  )
}
