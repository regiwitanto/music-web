import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * FR-023 and contracts/theme.md §4: components use only semantic token utilities.
 * No raw colours or Tailwind palette classes in src/presentation or src/app, except
 * the token file itself and the neutral app icon.
 */

const ALLOWED = new Set(['src/app/globals.css', 'src/app/icon.svg'])

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

const PALETTE =
  /\b(?:bg|text|border|ring|outline|fill|stroke|from|to|via|divide|placeholder|decoration|shadow|caret|accent)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d{2,3})?\b/

const RULES: Array<[string, RegExp]> = [
  ['hex colour', /#[0-9a-fA-F]{3,8}\b/],
  ['functional colour', /\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(/],
  ['Tailwind palette class', PALETTE],
]

const sources = [...files('src/presentation'), ...files('src/app')]
  .map((p) => p.split('\\').join('/'))
  .filter((p) => !ALLOWED.has(p))

describe('no raw colours outside globals.css (FR-023)', () => {
  it('scans at least one source file', () => {
    expect(sources.length).toBeGreaterThan(0)
  })

  it.each(sources)('%s uses only semantic colour utilities', (path) => {
    const text = readFileSync(path, 'utf8')
    for (const [label, pattern] of RULES) {
      const match = pattern.exec(text)
      expect(match?.[0], `${label} in ${path}`).toBeUndefined()
    }
  })
})
