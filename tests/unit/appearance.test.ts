import { describe, expect, it } from 'vitest'
import {
  ACCENT_LABELS,
  ACCENTS,
  APPEARANCE_STORAGE_KEY,
  type AppearancePreference,
  DEFAULT_APPEARANCE,
  parseAppearance,
  serializeAppearance,
  THEME_LABELS,
  THEMES,
} from '@/domain/appearance'

const ALL: AppearancePreference[] = THEMES.flatMap((theme) => ACCENTS.map((accent) => ({ theme, accent })))

describe('appearance constants (data-model §3)', () => {
  it('lists the themes and accents in display order', () => {
    expect(THEMES).toEqual(['system', 'light', 'dark', 'oled'])
    expect(ACCENTS).toEqual(['violet', 'blue', 'teal', 'green', 'amber', 'orange', 'rose', 'red'])
  })

  it('labels every value', () => {
    expect(THEMES.map((t) => THEME_LABELS[t])).toEqual(['System', 'Light', 'Dark', 'OLED Black'])
    expect(ACCENTS.map((a) => ACCENT_LABELS[a])).toEqual(['Violet', 'Blue', 'Teal', 'Green', 'Amber', 'Orange', 'Rose', 'Red'])
  })

  it('defaults to System and Violet, stored under mp.appearance', () => {
    expect(DEFAULT_APPEARANCE).toEqual({ theme: 'system', accent: 'violet' })
    expect(APPEARANCE_STORAGE_KEY).toBe('mp.appearance')
  })
})

describe('parseAppearance (total, never throws)', () => {
  it.each([null, '', 'not json', 'null', '[]', '42', '"dark"', 'true', '{"v":2,"theme":"dark","accent":"teal"}', '{"theme":"dark","accent":"teal"}'])(
    'returns the defaults for %j',
    (raw) => {
      expect(parseAppearance(raw)).toEqual(DEFAULT_APPEARANCE)
    },
  )

  it('falls back field by field', () => {
    expect(parseAppearance('{"v":1,"theme":"neon","accent":"teal"}')).toEqual({ theme: 'system', accent: 'teal' })
    expect(parseAppearance('{"v":1,"theme":"dark","accent":"pink"}')).toEqual({ theme: 'dark', accent: 'violet' })
    expect(parseAppearance('{"v":1,"theme":7,"accent":null}')).toEqual(DEFAULT_APPEARANCE)
    expect(parseAppearance('{"v":1}')).toEqual(DEFAULT_APPEARANCE)
  })

  it('ignores inherited property names', () => {
    expect(parseAppearance('{"v":1,"theme":"toString","accent":"constructor"}')).toEqual(DEFAULT_APPEARANCE)
  })

  it('returns a fresh object, not the shared default', () => {
    const parsed = parseAppearance(null)
    expect(parsed).not.toBe(DEFAULT_APPEARANCE)
  })
})

describe('serializeAppearance', () => {
  it('produces the versioned JSON shape', () => {
    expect(serializeAppearance({ theme: 'dark', accent: 'teal' })).toBe('{"v":1,"theme":"dark","accent":"teal"}')
  })

  it.each(ALL.map((p) => [p.theme, p.accent, p] as const))('round-trips %s + %s', (_t, _a, p) => {
    expect(parseAppearance(serializeAppearance(p))).toEqual(p)
  })

  it('covers all 32 combinations', () => {
    expect(ALL).toHaveLength(32)
  })
})
