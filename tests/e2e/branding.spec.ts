import { expect, test } from './fixtures'

/*
 * Branding (quickstart V22; SC-006; FR-039–FR-042). No third-party names or scaffold
 * strings anywhere a user can see them. Names are built from fragments so this file
 * never matches the source scan.
 */

const FORBIDDEN = [
  ['Metro', 'list'],
  ['You', 'Tube'],
  ['Spot', 'ify'],
  ['Apple', ' ', 'Music'],
].map((parts) => parts.join(''))
const SCAFFOLD = ['Create Next App', 'Deploy now', 'Vercel']

const ROOTS = ['/', '/explore', '/library', '/settings']
const RESERVED = [
  '/explore/search',
  '/explore/search?q=a&type=song',
  '/explore/genre/x1',
  '/explore/mood/x1',
  '/explore/artist/x1',
  '/explore/album/x1',
  '/library/liked',
  '/library/playlists',
  '/library/playlist/x1',
  '/library/albums',
  '/library/artists',
  '/library/recent',
  '/settings/x1',
]
const UNKNOWN = ['/radio', '/library/podcasts', '/explore/genre', '/explore/album/x1/extra', '/settings/a/b', '/explore/search/x1']

test('no forbidden name or scaffold string on any address, and titles carry the display name', async ({ page }) => {
  test.setTimeout(120_000)
  for (const path of [...ROOTS, ...RESERVED, ...UNKNOWN]) {
    await page.goto(path)
    const { text, title, metas } = await page.evaluate(() => ({
      text: document.body.innerText,
      title: document.title,
      metas: Array.from(document.querySelectorAll('meta')).map((m) => m.getAttribute('content') ?? ''),
    }))
    const haystack = [text, title, ...metas].join('\n').toLowerCase()
    for (const name of [...FORBIDDEN, ...SCAFFOLD]) {
      expect(haystack, `${path} contains "${name}"`).not.toContain(name.toLowerCase())
    }
    expect(title, path).toMatch(/· Music Player$|^Music Player$/)
  }
})
