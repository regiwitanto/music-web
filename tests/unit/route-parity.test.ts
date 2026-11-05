import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DESTINATIONS, RESERVED_PATTERNS } from '@/domain/navigation'

/*
 * Parity invariant (data-model §2): the set of src/app/**\/page.tsx route files
 * equals the destination roots plus every reserved pattern, so the router and
 * classifyPath can never drift apart.
 */

const APP = 'src/app'

function pageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return pageFiles(path)
    return entry === 'page.tsx' ? [path] : []
  })
}

/** "src/app/explore/genre/[id]/page.tsx" → "/explore/genre/<seg>" */
function toAddressPattern(file: string): string {
  const segments = relative(APP, file).split(sep).slice(0, -1)
  return '/' + segments.map((s) => (/^\[[^\]]+\]$/.test(s) ? '<seg>' : s)).join('/')
}

function expectedPatterns(): string[] {
  return DESTINATIONS.flatMap((d) => [
    d.href,
    ...RESERVED_PATTERNS[d.id].map((p) => `${d.href === '/' ? '' : d.href}/${p}`),
  ])
}

describe('route-file parity (data-model §2)', () => {
  it('has exactly one route file per root and reserved pattern', () => {
    const actual = pageFiles(APP).map(toAddressPattern).sort()
    expect(actual).toEqual(expectedPatterns().sort())
  })

  it('has no duplicate route files', () => {
    const actual = pageFiles(APP).map(toAddressPattern)
    expect(new Set(actual).size).toBe(actual.length)
  })
})
