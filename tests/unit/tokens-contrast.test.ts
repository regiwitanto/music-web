import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/*
 * Visual-identity tokens (014 spec FR-001 to FR-013; contracts/identity.md §1, §6 I-T1/I-T2;
 * research R2, R3, R10). Reads the shipped src/app/globals.css, so the CSS stays the single
 * source of truth. A later value change that breaks a ratio fails here.
 */

const css = readFileSync('src/app/globals.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** Bodies of every plain `:root { … }` rule (the identity has no nested rules inside them). */
const rootBodies = [...css.matchAll(/(?:^|[}\s])(:root)\s*\{([^{}]*)\}/g)].map((m) => m[2] ?? '')
const rootText = rootBodies.join('\n')

function decl(name: string): string {
  const m = new RegExp(`${name.replace(/[-]/g, '\\-')}\\s*:\\s*([^;]+);`).exec(rootText)
  if (!m?.[1]) throw new Error(`missing token ${name} in :root`)
  return m[1].trim()
}

type Rgb = readonly [number, number, number]

function hexToRgb(hex: string): Rgb {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m?.[1]) throw new Error(`not a #RRGGBB colour: ${hex}`)
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function channel(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** `fg` at opacity `alpha` composited over opaque `under`, rounded to 8-bit like a browser. */
function over(fg: Rgb, alpha: number, under: Rgb): Rgb {
  return [0, 1, 2].map((i) => Math.round((fg[i] as number) * alpha + (under[i] as number) * (1 - alpha))) as unknown as Rgb
}

const COLOUR_TOKENS = [
  '--bg', '--surface', '--raised', '--text', '--text-muted', '--accent', '--accent-hover',
  '--accent-pressed', '--on-accent', '--border-strong', '--divider', '--danger',
] as const
const TRANSLUCENT_TOKENS = ['--overlay-hover', '--overlay-pressed', '--overlay-selected', '--scrim'] as const

const colour = (name: string): Rgb => hexToRgb(decl(name))

/** Parses `color-mix(in srgb, var(--base) N%, transparent)` into its base token and opacity. */
function translucent(name: string): { base: Rgb; alpha: number } {
  const m = /^color-mix\(\s*in srgb\s*,\s*var\((--[\w-]+)\)\s+(\d+(?:\.\d+)?)%\s*,\s*transparent\s*\)$/.exec(decl(name))
  if (!m?.[1] || !m[2]) throw new Error(`${name} is not in the color-mix(in srgb, var(<base>) <N>%, transparent) form`)
  return { base: colour(m[1]), alpha: Number(m[2]) / 100 }
}

const BASES = ['--bg', '--surface', '--raised'] as const

describe('definition (I-T2)', () => {
  it('declares the colour tokens in exactly one :root block', () => {
    expect(rootBodies.filter((b) => /--bg\s*:/.test(b))).toHaveLength(1)
  })

  it('declares color-scheme: dark on :root', () => {
    expect(rootText).toMatch(/color-scheme\s*:\s*dark\s*;/)
  })

  it('has no theme or accent variants and never reads the system colour scheme', () => {
    expect(css).not.toMatch(/data-theme/)
    expect(css).not.toMatch(/data-accent/)
    expect(css).not.toMatch(/prefers-color-scheme/)
  })

  it('never uses pure black as the page background', () => {
    expect(decl('--bg').toUpperCase()).not.toBe('#000000')
  })

  it.each(COLOUR_TOKENS)('%s is an opaque #RRGGBB colour', (name) => {
    expect(decl(name)).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it.each(TRANSLUCENT_TOKENS)('%s is written in the color-mix form', (name) => {
    expect(() => translucent(name)).not.toThrow()
  })

  it('declares the overlay shadow', () => {
    expect(decl('--shadow-overlay')).toMatch(/rgb\(0 0 0 \/ 0\.45\)/)
  })
})

describe('approved palette (owner decisions K1/K2, 2026-11-07)', () => {
  it.each([
    ['--bg', '#101B23'],
    ['--surface', '#182731'],
    ['--accent', '#D8AD88'],
    ['--text', '#E8EDF0'],
    ['--text-muted', '#A9B9C1'],
  ])('%s is exactly %s', (name, value) => {
    expect(decl(name).toUpperCase()).toBe(value)
  })

  it('translucent tokens use the approved strengths', () => {
    expect(translucent('--overlay-hover').alpha).toBeCloseTo(0.06)
    expect(translucent('--overlay-pressed').alpha).toBeCloseTo(0.1)
    expect(translucent('--overlay-selected').alpha).toBeCloseTo(0.12)
    expect(translucent('--scrim').alpha).toBeCloseTo(0.85)
  })
})

describe('opaque pairs (research R2; FR-009 to FR-011)', () => {
  const pairs: Array<[string, string, number]> = [
    ...BASES.flatMap((b): Array<[string, string, number]> => [
      ['--text', b, 4.5],
      ['--text-muted', b, 4.5],
      ['--accent', b, 4.5],
      ['--accent-hover', b, 4.5],
      ['--accent-pressed', b, 4.5],
      ['--danger', b, 4.5],
      ['--border-strong', b, 3],
    ]),
    ['--on-accent', '--accent', 4.5],
    ['--on-accent', '--accent-hover', 4.5],
    ['--on-accent', '--accent-pressed', 4.5],
  ]
  it.each(pairs)('%s on %s meets %d:1', (fg, bg, min) => {
    expect(contrast(colour(fg), colour(bg))).toBeGreaterThanOrEqual(min)
  })
})

describe('state overlays composited over each base (research R2)', () => {
  const hover = translucent('--overlay-hover')
  const pressed = translucent('--overlay-pressed')
  const selected = translucent('--overlay-selected')

  describe.each(BASES)('over %s', (base) => {
    const under = colour(base)
    it('text stays ≥ 4.5:1 on the hover and pressed overlays', () => {
      expect(contrast(colour('--text'), over(hover.base, hover.alpha, under))).toBeGreaterThanOrEqual(4.5)
      expect(contrast(colour('--text'), over(pressed.base, pressed.alpha, under))).toBeGreaterThanOrEqual(4.5)
    })
    it('muted text stays ≥ 4.5:1 on the hover and pressed overlays', () => {
      expect(contrast(colour('--text-muted'), over(hover.base, hover.alpha, under))).toBeGreaterThanOrEqual(4.5)
      expect(contrast(colour('--text-muted'), over(pressed.base, pressed.alpha, under))).toBeGreaterThanOrEqual(4.5)
    })
    it('accent text stays ≥ 4.5:1 on the selected overlay', () => {
      expect(contrast(colour('--accent'), over(selected.base, selected.alpha, under))).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('the strong border stays ≥ 3:1 on a pressed control over a raised surface', () => {
    const pressedOnRaised = over(pressed.base, pressed.alpha, colour('--raised'))
    expect(contrast(colour('--border-strong'), pressedOnRaised)).toBeGreaterThanOrEqual(3)
  })
})

describe('Now Playing scrim over pure white artwork (research R3; worst case)', () => {
  const scrim = translucent('--scrim')
  const composite = over(scrim.base, scrim.alpha, [255, 255, 255])

  it('primary text ≥ 4.5:1', () => {
    expect(contrast(colour('--text'), composite)).toBeGreaterThanOrEqual(4.5)
  })
  it('primary text at 80% opacity ≥ 4.5:1', () => {
    expect(contrast(over(colour('--text'), 0.8, composite), composite)).toBeGreaterThanOrEqual(4.5)
  })
  it('muted text ≥ 4.5:1', () => {
    expect(contrast(colour('--text-muted'), composite)).toBeGreaterThanOrEqual(4.5)
  })
  it('accent ≥ 4.5:1', () => {
    expect(contrast(colour('--accent'), composite)).toBeGreaterThanOrEqual(4.5)
  })
})
