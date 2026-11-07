import type { Page } from '@playwright/test'
import {
  clearFault,
  expect,
  freezeSkeletonAnimations,
  readMounts,
  releaseHold,
  setFaults,
  test,
  waitForHydration,
} from './fixtures'

/*
 * Story 6 — honest placeholder, loading and error states
 * (quickstart V18–V21; SC-010; FR-034–FR-038).
 */

const SHELL = { shell: 1, sidebar: 1, bottomNav: 1, dock: 1 }
type W = Window & { __SKELETON_ANIMATION__?: Animation; __noReload?: boolean }

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main' }).locator('visible=true')

test.describe('empty states (scenario 1)', () => {
  const ROOTS = [
    ['/', 'Home', 'Your personal mixes and recent music will appear here.'],
    ['/explore', 'Explore', 'Search and browse music here.'],
    ['/library', 'Library', 'Songs, albums, artists and playlists you save will appear here.'],
  ] as const
  for (const [path, h1, copy] of ROOTS) {
    test(`${path} shows its h1 and empty state`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1)
      await expect(page.getByTestId('empty-state')).toContainText(copy)
    })
  }
})

test.describe('delayed skeleton (V18)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'Deterministic animation control runs on the desktop projects.')

  type Sample = { skeleton: boolean; empty: boolean }
  async function startHeld(page: Page) {
    await setFaults(page, { '/explore': { mode: 'hold' } })
    await freezeSkeletonAnimations(page)
    await page.goto('/')
    await waitForHydration(page)
    await page.evaluate(() => {
      const w = window as unknown as { __samples: Sample[] }
      w.__samples = []
      const tick = () => {
        w.__samples.push({
          skeleton: !!document.querySelector('[data-testid="skeleton"]'),
          empty: !!document.querySelector('[data-testid="empty-state"]'),
        })
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    await nav(page).getByRole('link', { name: 'Explore' }).click()
    await page.locator('[data-testid=skeleton]').waitFor({ state: 'attached' })
  }
  const opacity = (page: Page) =>
    page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="skeleton"]')!).opacity)
  const setTime = (page: Page, t: number) =>
    page.evaluate((time) => {
      ;(window as W).__SKELETON_ANIMATION__!.currentTime = time
    }, t)
  const samples = (page: Page) => page.evaluate(() => (window as unknown as { __samples: Sample[] }).__samples)

  test('boundary: invisible at 149 ms, visible at 150 ms', async ({ page }) => {
    await startHeld(page)
    await setTime(page, 149)
    expect(await opacity(page)).toBe('0')
    // Hidden from assistive technology too until the threshold.
    await expect(page.getByRole('status')).toHaveCount(0)
    await setTime(page, 150)
    expect(await opacity(page)).toBe('1')
    await expect(page.getByRole('status')).toHaveText('Loading')
    expect((await samples(page)).some((s) => s.skeleton && s.empty)).toBe(false)
  })

  test('released before the threshold: no visible skeleton frame', async ({ page }) => {
    await startHeld(page)
    await setTime(page, 149)
    await releaseHold(page, '/explore')
    await expect(page.getByTestId('empty-state')).toBeVisible()
    await expect(page.getByTestId('skeleton')).toHaveCount(0)
    expect((await samples(page)).some((s) => s.skeleton && s.empty)).toBe(false)
  })

  test('released after the threshold: empty state replaces the skeleton', async ({ page }) => {
    await startHeld(page)
    await setTime(page, 150)
    expect(await opacity(page)).toBe('1')
    await releaseHold(page, '/explore')
    await expect(page.getByTestId('empty-state')).toBeVisible()
    await expect(page.getByTestId('skeleton')).toHaveCount(0)
    expect((await samples(page)).some((s) => s.skeleton && s.empty)).toBe(false)
  })
})

test.describe('page failure (V19)', () => {
  test('contained, persistent, and Retry recovers without a reload', async ({ page }) => {
    await setFaults(page, { '/library': { mode: 'throw' } })
    await page.goto('/')
    await waitForHydration(page)
    await page.evaluate(() => {
      ;(window as W).__noReload = true
    })
    await nav(page).getByRole('link', { name: 'Library' }).click()
    const error = page.locator('main').getByTestId('error-state')
    await expect(error).toBeVisible()
    await expect(error).toContainText("This page couldn't be shown.")
    // Focus moves to the error h1 (FR-028): the content that held focus was replaced.
    await expect(error.getByRole('heading', { level: 1 })).toBeFocused()

    await nav(page).getByRole('link', { name: 'Explore' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Explore' })).toBeVisible()
    await nav(page).getByRole('link', { name: 'Library' }).click()
    await expect(page.locator('main').getByTestId('error-state')).toBeVisible()

    await clearFault(page, '/library')
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeFocused()
    await expect(page.getByTestId('empty-state')).toBeVisible()
    expect(await page.evaluate(() => (window as W).__noReload)).toBe(true)
    expect(await readMounts(page)).toEqual(SHELL)
  })
})

test.describe('whole-app failure (V20)', () => {
  test('recovery screen in the identity, Reload starts a new document', async ({ page }) => {
    await setFaults(page, { __shell__: { mode: 'throw' } })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeVisible()
    await expect(page.getByText('The app ran into a problem.')).toBeVisible()
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(16, 27, 35)')
    expect(await page.locator('body').innerText()).not.toMatch(/Injected test fault|digest|at \w+/i)

    await page.getByRole('button', { name: 'Reload' }).click()
    await expect(page.getByRole('navigation', { name: 'Main' }).locator('visible=true')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible()
  })
})

test.describe('reduced motion (V21)', () => {
  test('re-selecting the current root jumps to top instantly; transitions are short', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await waitForHydration(page)
    await page.evaluate(() => {
      const spacer = document.createElement('div')
      spacer.style.height = '3000px'
      document.querySelector('main > div')?.append(spacer)
      window.scrollTo(0, 1500)
    })
    await nav(page).getByRole('link', { name: 'Home' }).click()
    // Instant: no smooth scrolling, so the position is already 0 on the next frame.
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 500 }).toBe(0)
    const longest = await page.evaluate(() =>
      Math.max(
        0,
        ...Array.from(document.querySelectorAll('*')).map((el) =>
          Math.max(...getComputedStyle(el).transitionDuration.split(',').map((d) => parseFloat(d) * (d.includes('ms') ? 1 : 1000))),
        ),
      ),
    )
    expect(longest).toBeLessThanOrEqual(120)
  })
})
