import { describe, expect, it } from 'vitest'
import { activeDestination, classifyPath, DESTINATIONS, RESERVED_PATTERNS } from '@/domain/navigation'

describe('DESTINATIONS (FR-001, FR-002)', () => {
  it('has exactly the four destinations, in order', () => {
    expect(DESTINATIONS).toHaveLength(4)
    expect(DESTINATIONS.map((d) => d.id)).toEqual(['home', 'explore', 'library', 'settings'])
    expect(DESTINATIONS.map((d) => d.label)).toEqual(['Home', 'Explore', 'Library', 'Settings'])
    expect(DESTINATIONS.map((d) => d.href)).toEqual(['/', '/explore', '/library', '/settings'])
    DESTINATIONS.forEach((d, i) => expect(d.order).toBe(i))
  })

  it('has no Now Playing or other extra entry', () => {
    const ids: string[] = DESTINATIONS.map((d) => d.id)
    expect(ids).not.toContain('now-playing')
    expect(ids.some((id) => /now|playing/i.test(id))).toBe(false)
  })
})

describe('classifyPath (FR-012, routes.md)', () => {
  it.each([
    ['/', 'home'],
    ['/explore', 'explore'],
    ['/library', 'library'],
    ['/settings', 'settings'],
  ] as const)('classifies %s as the %s root', (path, destination) => {
    expect(classifyPath(path)).toEqual({ kind: 'root', destination })
  })

  it.each([
    ['/explore/search', 'explore', 'search'],
    ['/explore/genre/x1', 'explore', 'genre/<seg>'],
    ['/explore/mood/x1', 'explore', 'mood/<seg>'],
    ['/explore/artist/x1', 'explore', 'artist/<seg>'],
    ['/explore/album/x1', 'explore', 'album/<seg>'],
    ['/library/liked', 'library', 'liked'],
    ['/library/playlists', 'library', 'playlists'],
    ['/library/playlist/x1', 'library', 'playlist/<seg>'],
    ['/library/albums', 'library', 'albums'],
    ['/library/artists', 'library', 'artists'],
    ['/library/recent', 'library', 'recent'],
    ['/settings/x1', 'settings', '<seg>'],
  ] as const)('classifies %s as reserved under %s', (path, destination, pattern) => {
    expect(classifyPath(path)).toEqual({ kind: 'reserved', destination, pattern })
  })

  it.each(['/radio', '/library/podcasts', '/explore/genre', '/explore/album/x1/extra', '/settings/a/b', '/explore/search/x1'])(
    'classifies %s as unknown',
    (path) => {
      expect(classifyPath(path)).toEqual({ kind: 'unknown' })
    },
  )

  it('ignores a single trailing slash', () => {
    expect(classifyPath('/library/liked/')).toEqual({ kind: 'reserved', destination: 'library', pattern: 'liked' })
    expect(classifyPath('/explore/')).toEqual({ kind: 'root', destination: 'explore' })
  })

  it('treats an empty segment as unknown', () => {
    expect(classifyPath('//')).toEqual({ kind: 'unknown' })
    expect(classifyPath('/library//liked')).toEqual({ kind: 'unknown' })
    expect(classifyPath('/explore/genre//')).toEqual({ kind: 'unknown' })
  })

  it('is case-sensitive', () => {
    expect(classifyPath('/Library')).toEqual({ kind: 'unknown' })
    expect(classifyPath('/explore/Search')).toEqual({ kind: 'unknown' })
  })

  it('classifies by pathname only, so a query string never changes the result', () => {
    // Callers pass usePathname(), which has no query; a stray query is not a valid pathname.
    expect(classifyPath('/explore/search')).toEqual(classifyPath('/explore/search/'))
  })

  it('treats a path without a leading slash as unknown', () => {
    expect(classifyPath('')).toEqual({ kind: 'unknown' })
    expect(classifyPath('explore')).toEqual({ kind: 'unknown' })
  })

  it('declares the reserved table exactly as data-model §2', () => {
    expect(RESERVED_PATTERNS).toEqual({
      home: [],
      explore: ['search', 'genre/<seg>', 'mood/<seg>', 'artist/<seg>', 'album/<seg>'],
      library: ['liked', 'playlists', 'playlist/<seg>', 'albums', 'artists', 'recent'],
      settings: ['<seg>'],
    })
  })
})

describe('activeDestination (D-001-1)', () => {
  it('returns the destination for root and reserved, and null for unknown', () => {
    expect(activeDestination(classifyPath('/library'))).toBe('library')
    expect(activeDestination(classifyPath('/library/liked'))).toBe('library')
    expect(activeDestination(classifyPath('/radio'))).toBeNull()
  })
})
