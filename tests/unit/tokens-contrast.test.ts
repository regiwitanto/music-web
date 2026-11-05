import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ACCENTS } from '@/domain/appearance'

/*
 * Token contrast (spec FR-023, SC-005; contracts/theme.md T8; research R11).
 * Reads the shipped src/app/globals.css, so the CSS stays the single source of truth.
 */

type Decls = Record<string, string>

/** Minimal extractor: maps "<media>|<selector>" to its custom-property declarations. */
function extract(css: string): Map<string, Decls> {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = new Map<string, Decls>()
  const walk = (source: string, media: string) => {
    let i = 0
    while (i < source.length) {
      const open = source.indexOf('{', i)
      if (open === -1) return
      const prelude = source.slice(i, open).trim()
      let depth = 1
      let j = open + 1
      while (j < source.length && depth > 0) {
        if (source[j] === '{') depth += 1
        else if (source[j] === '}') depth -= 1
        j += 1
      }
      const body = source.slice(open + 1, j - 1)
      if (prelude.startsWith('@media')) {
        walk(body, prelude.replace(/\s+/g, ' '))
      } else if (!prelude.startsWith('@')) {
        const decls: Decls = {}
        for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
          const [, name, value] = m
          if (name && value) decls[name] = value.trim()
        }
        for (const selector of prelude.split(',').map((s) => s.trim().replace(/\s+/g, ' '))) {
          const key = `${media}|${selector}`
          rules.set(key, { ...(rules.get(key) ?? {}), ...decls })
        }
      }
      i = j
    }
  }
  walk(text, '')
  return rules
}

function channel(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m?.[1]) throw new Error(`not a #RRGGBB colour: ${hex}`)
  const n = parseInt(m[1], 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const rules = extract(readFileSync('src/app/globals.css', 'utf8'))
const DARK_MEDIA = '@media (prefers-color-scheme: dark)'

function block(key: string): Decls {
  const decls = rules.get(key)
  if (!decls) throw new Error(`missing CSS block ${key}`)
  return decls
}

function token(decls: Decls, name: string): string {
  const value = decls[name]
  if (!value) throw new Error(`missing ${name}`)
  return value
}

const NEUTRALS = ['--bg', '--surface', '--raised', '--text', '--text-muted', '--border-strong', '--divider', '--danger']
const THEME_PALETTES = { light: 'light', dark: 'dark', oled: 'dark' } as const

// Pairs from design-system §2.1–2.2 and their thresholds.
const NEUTRAL_PAIRS: Array<[string, string, number]> = [
  ['--text', '--bg', 4.5],
  ['--text', '--surface', 4.5],
  ['--text', '--raised', 4.5],
  ['--text-muted', '--bg', 4.5],
  ['--text-muted', '--surface', 4.5],
  ['--text-muted', '--raised', 4.5],
  ['--border-strong', '--bg', 3],
  ['--border-strong', '--surface', 3],
  ['--border-strong', '--raised', 3],
  ['--danger', '--bg', 4.5],
]

describe.each(Object.entries(THEME_PALETTES))('theme %s', (theme, palette) => {
  const decls = block(`|:root[data-theme="${theme}"]`)

  it('defines every neutral token as a hex colour', () => {
    for (const name of NEUTRALS) expect(token(decls, name)).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it.each(NEUTRAL_PAIRS)('%s on %s meets %d:1', (fg, bg, min) => {
    expect(contrast(token(decls, fg), token(decls, bg))).toBeGreaterThanOrEqual(min)
  })

  it(`resolves --accent from the ${palette} accent inputs`, () => {
    const suffix = palette === 'light' ? 'l' : 'd'
    expect(token(decls, '--accent')).toBe(`var(--accent-${suffix})`)
    expect(token(decls, '--on-accent')).toBe(`var(--on-accent-${suffix})`)
  })

  it.each(ACCENTS)('accent %s meets text and focus-ring contrast', (accent) => {
    const a = block(`|:root[data-accent="${accent}"]`)
    const suffix = palette === 'light' ? 'l' : 'd'
    const fill = token(a, `--accent-${suffix}`)
    const on = token(a, `--on-accent-${suffix}`)
    // Accent is used as text (active nav label) and as the focus ring, on bg and surface.
    expect(contrast(fill, token(decls, '--bg'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(fill, token(decls, '--surface'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(on, fill)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('system theme and OLED', () => {
  it('system uses the Light values by default and the Dark values under prefers-color-scheme: dark', () => {
    const light = block('|:root[data-theme="light"]')
    const dark = block('|:root[data-theme="dark"]')
    const systemLight = block('|:root[data-theme="system"]')
    const systemDark = block(`${DARK_MEDIA}|:root[data-theme="system"]`)
    for (const name of [...NEUTRALS, '--accent', '--on-accent']) {
      expect(token(systemLight, name), name).toBe(token(light, name))
      expect(token(systemDark, name), name).toBe(token(dark, name))
    }
  })

  it('OLED page background is pure black', () => {
    expect(token(block('|:root[data-theme="oled"]'), '--bg').toUpperCase()).toBe('#000000')
  })
})
