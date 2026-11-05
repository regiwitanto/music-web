import type { Page } from '@playwright/test'
import { expect, readMounts, test, waitForHydration } from './fixtures'

/*
 * Story 2 — navigation preserves place and never resets the shell
 * (quickstart V3–V6; SC-007, SC-008; FR-009–FR-012; D-001-1).
 */

type Expectation = { path: string; h1: string; current: string | null; title: string }

const ROOTS: Expectation[] = [
  { path: '/', h1: 'Home', current: 'Home', title: 'Home · Music Player' },
  { path: '/explore', h1: 'Explore', current: 'Explore', title: 'Explore · Music Player' },
  { path: '/library', h1: 'Library', current: 'Library', title: 'Library · Music Player' },
  { path: '/settings', h1: 'Settings', current: 'Settings', title: 'Settings · Music Player' },
]

const reserved = (path: string, destination: string): Expectation => ({
  path,
  h1: 'Nothing here yet',
  current: destination,
  title: `Nothing here yet — ${destination} · Music Player`,
})

const RESERVED: Expectation[] = [
  reserved('/explore/search', 'Explore'),
  reserved('/explore/search?q=a&type=song', 'Explore'),
  reserved('/explore/genre/x1', 'Explore'),
  reserved('/explore/mood/x1', 'Explore'),
  reserved('/explore/artist/x1', 'Explore'),
  reserved('/explore/album/x1', 'Explore'),
  reserved('/library/liked', 'Library'),
  reserved('/library/playlists', 'Library'),
  reserved('/library/playlist/x1', 'Library'),
  reserved('/library/albums', 'Library'),
  reserved('/library/artists', 'Library'),
  reserved('/library/recent', 'Library'),
  reserved('/settings/x1', 'Settings'),
]

const UNKNOWN = ['/radio', '/library/podcasts', '/explore/genre', '/explore/album/x1/extra', '/settings/a/b', '/explore/search/x1']

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main' })

async function expectPage(page: Page, e: Expectation) {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(e.h1)
  await expect(page).toHaveTitle(e.title)
  if (e.current === null) {
    await expect(page.locator('[aria-current]')).toHaveCount(0)
  } else {
    await expect(nav(page).locator('[aria-current="page"]')).toHaveCount(1)
    await expect(nav(page).getByRole('link', { name: e.current })).toHaveAttribute('aria-current', 'page')
  }
}

const SHELL_ONCE = { shell: 1, sidebar: 1, bottomNav: 1 }

/**
 * Client-side navigation to an address no 001 UI links to (the reserved pages).
 * Next 16 exposes its public app-router instance as `window.next.router`
 * (next/dist/client/components/app-router-instance.js); the test uses it only
 * to reach those pages without a full page load.
 */
async function clientNavigate(page: Page, href: string) {
  await page.evaluate((h) => {
    const router = (window as unknown as { next?: { router?: { push(url: string): void } } }).next?.router
    if (!router) throw new Error('window.next.router is not available')
    router.push(h)
  }, href)
  await expect(page).toHaveURL(href)
}

test('V3: the shell is created once across navigations (SC-007)', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => readMounts(page)).toMatchObject(SHELL_ONCE)

  for (const label of ['Explore', 'Library', 'Settings', 'Home']) {
    await nav(page).getByRole('link', { name: label }).click() // 1–4: nav clicks
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(label)
  }
  await clientNavigate(page, '/explore/genre/x1') // 5
  await clientNavigate(page, '/library/playlists') // 6
  await page.getByRole('link', { name: 'Go to Library' }).click() // 7: in-page link
  await expect(page).toHaveURL('/library')
  await page.goBack() // 8
  await expect(page).toHaveURL('/library/playlists')
  await page.goBack() // 9
  await expect(page).toHaveURL('/explore/genre/x1')
  await page.goForward() // 10
  await expect(page).toHaveURL('/library/playlists')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nothing here yet')

  expect(await readMounts(page)).toMatchObject(SHELL_ONCE)
})

test.describe('V4: direct load, Refresh, Back and Forward (SC-008)', () => {
  const all = [...ROOTS, ...RESERVED]

  for (const e of all) {
    test(`${e.path} loads directly and survives Refresh`, async ({ page }) => {
      await page.goto(e.path)
      await expectPage(page, e)
      await page.reload()
      await expectPage(page, e)
    })
  }

  test('Back and Forward between addresses keep the page and current item in step', async ({ page }) => {
    for (let i = 0; i + 1 < all.length; i += 2) {
      const a = all[i]
      const b = all[i + 1]
      if (!a || !b) continue
      await page.goto(a.path)
      await page.goto(b.path)
      await page.goBack()
      await expectPage(page, a)
      await page.goForward()
      await expectPage(page, b)
    }
  })
})

test.describe('V5: unknown addresses show Not Found in the shell (D-001-1)', () => {
  for (const path of UNKNOWN) {
    test(`${path}`, async ({ page }) => {
      await page.goto(path)
      await expectPage(page, { path, h1: 'Page not found', current: null, title: 'Page not found · Music Player' })
      await expect(page.getByTestId('not-found')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/')
      await expect(nav(page)).toBeVisible()

      await nav(page).getByRole('link', { name: 'Library' }).click()
      await expect(page).toHaveURL('/library')
      await expectPage(page, ROOTS[2] as Expectation)
    })
  }
})

test.describe('V6: re-selecting a destination (FR-010)', () => {
  test('scrolls the root to the top, does nothing at the top, and returns to the root from a nested page', async ({ page }) => {
    await page.goto('/library')
    // Before hydration, React would discard the injected spacer and the click handler would not exist yet.
    await waitForHydration(page)
    await page.evaluate(() => {
      const spacer = document.createElement('div')
      spacer.style.height = '3000px'
      spacer.id = 'e2e-spacer'
      document.querySelector('main > div')?.append(spacer)
      ;(window as unknown as { __noReload?: boolean }).__noReload = true
      window.scrollTo(0, 1500)
    })
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

    await nav(page).getByRole('link', { name: 'Library' }).click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(page).toHaveURL('/library')

    // At the top: nothing happens — no navigation, no reload.
    await nav(page).getByRole('link', { name: 'Library' }).click()
    await expect(page).toHaveURL('/library')
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true)
    await expect(page.locator('#e2e-spacer')).toHaveCount(1)

    await page.goto('/library/liked')
    await waitForHydration(page)
    await nav(page).getByRole('link', { name: 'Library' }).click()
    await expect(page).toHaveURL('/library')
    await expectPage(page, ROOTS[2] as Expectation)
  })
})
