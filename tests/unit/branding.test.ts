import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { APP_DISPLAY_NAME, pageTitle } from '@/domain/branding'

// Built from fragments so this test file never matches the branding scan.
const FORBIDDEN = [['Metro', 'list'], ['You', 'Tube'], ['Spot', 'ify'], ['Apple', ' ', 'Music']].map((p) => p.join(''))

describe('branding (FR-039, FR-040)', () => {
  it('has one public display name', () => {
    expect(APP_DISPLAY_NAME).toBe('Music Player')
  })

  it('formats page titles as "{Page} · {name}"', () => {
    expect(pageTitle('Library')).toBe('Library · Music Player')
  })

  it('contains no forbidden third-party name', () => {
    const source = readFileSync('src/domain/branding.ts', 'utf8').toLowerCase()
    for (const name of FORBIDDEN) expect(source).not.toContain(name.toLowerCase())
  })
})
