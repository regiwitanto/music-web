import { expect, readMounts, test, waitForHydration } from './fixtures'

/*
 * Story 5 — a player dock is reserved without pretending to play
 * (quickstart V16; SC-001, SC-007; FR-015–FR-017).
 */

const SHELL = { shell: 1, sidebar: 1, bottomNav: 1, dock: 1 }

test.describe('visibility', () => {
  for (const width of [1440, 768]) {
    test(`Player region shows "Nothing playing" without buttons at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      const dock = page.getByRole('region', { name: 'Player' })
      await expect(dock).toBeVisible()
      await expect(dock).toContainText('Nothing playing')
      await expect(dock.getByRole('button')).toHaveCount(0)
    })
  }

  test('Player region is hidden and not in the accessibility tree at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.getByTestId('player-dock')).toBeHidden()
    await expect(page.getByRole('region', { name: 'Player' })).toHaveCount(0)
  })
})

test.describe('never covers content (SC-001, A2)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'Resizes the viewport, so it runs on the desktop projects.')
  const PATHS = ['/', '/explore', '/library', '/settings', '/library/liked']

  for (const inset of [0, 34]) {
    for (const width of [320, 375, 768, 1024, 1440]) {
      test(`last element is above the dock/nav at ${width} px, inset ${inset}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 700 })
        for (const path of PATHS) {
          await page.goto(path)
          await waitForHydration(page)
          if (inset) await page.addStyleTag({ content: `:root { --safe-bottom: ${inset}px !important; }` })
          await page.evaluate(() => {
            const spacer = document.createElement('div')
            spacer.style.height = '3000px'
            const marker = document.createElement('div')
            marker.id = 'end-marker'
            marker.style.height = '8px'
            spacer.append(marker)
            document.querySelector('main > div')?.append(spacer)
            window.scrollTo(0, document.documentElement.scrollHeight)
          })
          const result = await page.evaluate((narrow) => {
            const marker = document.getElementById('end-marker')!.getBoundingClientRect()
            const cover = document
              .querySelector(narrow ? '[data-testid="bottom-nav"]' : '[data-testid="player-dock"]')!
              .getBoundingClientRect()
            return { markerBottom: marker.bottom, coverTop: cover.top }
          }, width < 768)
          expect(result.markerBottom, `${path} @${width}`).toBeLessThanOrEqual(result.coverTop)
        }
      })
    }
  }
})

test.describe('stays mounted (SC-007)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'Resizes the viewport, so it runs on the desktop projects.')

  for (const width of [1440, 390]) {
    test(`one mount of each shell part at ${width} px, unchanged after 10 navigations`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      await waitForHydration(page)
      await expect.poll(() => readMounts(page)).toEqual(SHELL)
      const nav = page.getByRole('navigation', { name: 'Main' }).locator('visible=true')
      const go = async (label: string) => {
        await nav.getByRole('link', { name: label }).click()
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      }
      const sequence = ['Explore', 'Library', 'Settings', 'Home', 'Library', 'Explore', 'Settings', 'Home']
      for (const label of sequence) await go(label)
      // Nested reserved addresses, through the client router (no document reload).
      for (const path of ['/explore/genre/x1', '/library/playlists']) {
        await page.evaluate((p) => (window as unknown as { next: { router: { push(p: string): void } } }).next.router.push(p), path)
        await expect(page).toHaveURL(new RegExp(`${path}$`))
        await expect(page.getByRole('heading', { level: 1, name: 'Nothing here yet' })).toBeVisible()
      }
      expect(await readMounts(page)).toEqual(SHELL)
    })
  }
})
