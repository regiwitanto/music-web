import type { Page } from '@playwright/test'
import {
  breakStorage,
  expect,
  recordThemeAttributes,
  seedAppearance,
  test,
  waitForHydration,
} from './fixtures'

/*
 * Story 4 — choose a theme and accent that stick
 * (quickstart V10–V14, V17, V25; oracles T1–T7, T9–T11; SC-004).
 */

const THEMES = ['system', 'light', 'dark', 'oled'] as const
const ACCENTS = ['violet', 'blue', 'teal', 'green', 'amber', 'orange', 'rose', 'red'] as const

const BG: Record<string, string> = {
  light: 'rgb(255, 255, 255)',
  dark: 'rgb(18, 18, 20)',
  oled: 'rgb(0, 0, 0)',
}
// Accent on a light surface / dark surface (design-system §2.2).
const ACCENT_RGB = {
  violet: { l: 'rgb(109, 63, 224)', d: 'rgb(167, 139, 250)' },
  blue: { l: 'rgb(31, 95, 214)', d: 'rgb(122, 167, 255)' },
  teal: { l: 'rgb(11, 124, 120)', d: 'rgb(45, 212, 191)' },
  green: { l: 'rgb(31, 122, 53)', d: 'rgb(74, 222, 128)' },
  amber: { l: 'rgb(161, 92, 0)', d: 'rgb(251, 191, 36)' },
  orange: { l: 'rgb(194, 65, 12)', d: 'rgb(251, 146, 60)' },
  rose: { l: 'rgb(192, 38, 91)', d: 'rgb(251, 113, 153)' },
  red: { l: 'rgb(196, 43, 43)', d: 'rgb(248, 113, 113)' },
} as const satisfies Record<(typeof ACCENTS)[number], { l: string; d: string }>

const stored = (theme: string, accent: string) => JSON.stringify({ v: 1, theme, accent })
const radio = (page: Page, group: 'theme' | 'accent', value: string) =>
  page.locator(`input[name="${group}"][value="${value}"]`)
const attrs = (page: Page) =>
  page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    accent: document.documentElement.getAttribute('data-accent'),
  }))

test.describe('immediate application (V10, T1, T5)', () => {
  test('every theme × accent restyles the whole UI inside the click', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/settings')
    await waitForHydration(page)
    for (const theme of ['light', 'dark', 'oled'] as const) {
      for (const accent of ACCENTS) {
        const result = await page.evaluate(
          ([t, a]) => {
            ;(document.querySelector(`input[name="theme"][value="${t}"]`) as HTMLInputElement).click()
            ;(document.querySelector(`input[name="accent"][value="${a}"]`) as HTMLInputElement).click()
            const cs = (el: Element | null) => (el ? getComputedStyle(el) : null)
            return {
              body: cs(document.body)?.backgroundColor,
              nav: cs(document.querySelector('[data-testid="sidebar"] [aria-current="page"]'))?.color,
              sidebar: cs(document.querySelector('[data-testid="sidebar"]'))?.backgroundColor,
              main: cs(document.querySelector('main'))?.color,
            }
          },
          [theme, accent],
        )
        expect(result.body, `${theme}/${accent}`).toBe(BG[theme])
        expect(result.nav, `${theme}/${accent}`).toBe(ACCENT_RGB[accent][theme === 'light' ? 'l' : 'd'])
        // Sidebar and main are not left in the previous theme.
        expect(result.sidebar).not.toBe(result.main)
      }
    }
  })

  test('the player dock restyles too', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/settings')
    await waitForHydration(page)
    const bg = await page.evaluate(() => {
      ;(document.querySelector('input[name="theme"][value="oled"]') as HTMLInputElement).click()
      const dock = document.querySelector('[data-testid="player-dock"]') as HTMLElement
      return { dock: getComputedStyle(dock).backgroundColor, text: getComputedStyle(dock).color }
    })
    expect(bg.dock).toBe('rgb(14, 14, 16)')
    expect(bg.text).not.toBe('rgb(91, 91, 102)')
  })

  test('OLED gives a pure black body', async ({ page }) => {
    await page.goto('/settings')
    await waitForHydration(page)
    await radio(page, 'theme', 'oled').click()
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(0, 0, 0)')
  })
})

test.describe('persistence (V11, V17, T2)', () => {
  test('Dark + Teal survive reload and a new context with the same storage state', async ({ page, browser }) => {
    await page.goto('/settings')
    await waitForHydration(page)
    await radio(page, 'theme', 'dark').click()
    await radio(page, 'accent', 'teal').click()
    await page.reload()
    expect(await attrs(page)).toEqual({ theme: 'dark', accent: 'teal' })

    const state = await page.context().storageState()
    const context = await browser.newContext({ storageState: state })
    const second = await context.newPage()
    await second.goto('/')
    expect(await attrs(second)).toEqual({ theme: 'dark', accent: 'teal' })
    await context.close()
  })

  test('empty storage gives System + Violet', async ({ page }) => {
    await page.goto('/')
    expect(await attrs(page)).toEqual({ theme: 'system', accent: 'violet' })
  })
})

test.describe('no flash on cold load (V12, T3)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'Engine desktop projects only.')

  for (const theme of ['light', 'dark', 'oled'] as const) {
    test(`10 cold loads show ${theme} from the first paint`, async ({ browser, jsHold }) => {
      for (let i = 0; i < 10; i += 1) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
        const page = await context.newPage()
        await seedAppearance(page, stored(theme, 'teal'))
        await recordThemeAttributes(page)
        await jsHold.hold(page)
        await page.goto('/', { waitUntil: 'domcontentloaded' })
        await expect.poll(() => jsHold.pendingCount()).toBeGreaterThan(0)
        await expect.poll(() => jsHold.pendingCount()).toBeGreaterThan(0)
      jsHold.assertNotHydrated()
        expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(BG[theme])
        expect(await attrs(page)).toEqual({ theme, accent: 'teal' })
        const log = await page.evaluate(
          () =>
            (window as unknown as { __THEME_LOG__: Array<{ value: string | null; hasBody: boolean }> }).__THEME_LOG__,
        )
        // Before <body> exists only the server default or the persisted value may appear.
        const allowed = [theme, 'teal', 'system', 'violet']
        for (const entry of log) expect(allowed).toContain(entry.value)
        const link = page.locator('[aria-current="page"]:visible').first()
        const color = await link.evaluate((el) => getComputedStyle(el).color)
        expect(color).toBe(theme === 'light' ? ACCENT_RGB.teal.l : ACCENT_RGB.teal.d)
        await context.close()
      }
    })
  }
})

test.describe('System follows the OS (V13, T4, T11)', () => {
  test('toggling the colour scheme changes the palette live; System stays checked', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/settings')
    await waitForHydration(page)
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(BG.light)
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
      .toBe(BG.dark)
    await expect(radio(page, 'theme', 'system')).toBeChecked()
    await page.emulateMedia({ colorScheme: 'light' })
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
      .toBe(BG.light)
  })
})

test.describe('storage failure and bad values (V14, T6, T7)', () => {
  test('blocked storage: switching works, reload gives System + Violet, no app console error', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))
    await breakStorage(page)
    await page.goto('/settings')
    await waitForHydration(page)
    await radio(page, 'theme', 'dark').click()
    expect(await attrs(page)).toMatchObject({ theme: 'dark' })
    await page.reload()
    expect(await attrs(page)).toEqual({ theme: 'system', accent: 'violet' })
    expect(errors).toEqual([])
  })

  test('corrupt value gives System + Violet', async ({ page }) => {
    await seedAppearance(page, '{not json')
    await page.goto('/')
    expect(await attrs(page)).toEqual({ theme: 'system', accent: 'violet' })
  })

  test('partially valid value keeps its valid field', async ({ page }) => {
    await seedAppearance(page, JSON.stringify({ v: 1, theme: 'dark', accent: 'pink' }))
    await page.goto('/')
    expect(await attrs(page)).toEqual({ theme: 'dark', accent: 'violet' })
  })
})

test.describe('radios on first paint (V25, T9, T10)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'Engine desktop projects only.')

  for (const theme of THEMES) {
    test(`cold /settings with ${theme} + teal shows one checked radio per group before hydration`, async ({
      page,
      jsHold,
    }) => {
      const problems: string[] = []
      page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text())
      })
      await seedAppearance(page, stored(theme, 'teal'))
      await jsHold.hold(page)
      await page.goto('/settings', { waitUntil: 'domcontentloaded' })
      await expect.poll(() => jsHold.pendingCount()).toBeGreaterThan(0)
      jsHold.assertNotHydrated()

      const checked = () =>
        page.evaluate(() => ({
          theme: Array.from(document.querySelectorAll<HTMLInputElement>('input[name="theme"]'))
            .filter((i) => i.checked)
            .map((i) => i.value),
          accent: Array.from(document.querySelectorAll<HTMLInputElement>('input[name="accent"]'))
            .filter((i) => i.checked)
            .map((i) => i.value),
        }))
      expect(await checked()).toEqual({ theme: [theme], accent: ['teal'] })
      const indicator = await radio(page, 'theme', theme).evaluate((el) => getComputedStyle(el).backgroundImage)
      expect(indicator).toContain('radial-gradient')

      jsHold.release()
      await page.waitForFunction(
        () => (window as unknown as { __SHELL_MOUNTS__?: { shell: number } }).__SHELL_MOUNTS__?.shell === 1,
      )
      expect(await checked()).toEqual({ theme: [theme], accent: ['teal'] })
      expect(problems.filter((p) => /hydrat/i.test(p))).toEqual([])

      // Hydration really happened: only React's handler updates <html> on an arrow key.
      await radio(page, 'theme', theme).focus()
      // Avoid wrapping from the last option, which engines handle differently.
      const index = THEMES.indexOf(theme)
      const last = index === THEMES.length - 1
      await page.keyboard.press(last ? 'ArrowUp' : 'ArrowDown')
      const next = THEMES[last ? index - 1 : index + 1]
      await expect.poll(async () => (await attrs(page)).theme).toBe(next)
    })
  }

  test('client navigation to /settings shows the right radios on first render (T10)', async ({ page }) => {
    await seedAppearance(page, stored('dark', 'rose'))
    await page.goto('/')
    await waitForHydration(page)
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Settings' }).click()
    await expect(radio(page, 'theme', 'dark')).toBeChecked()
    await expect(radio(page, 'accent', 'rose')).toBeChecked()
  })
})

test.describe('forced colors', () => {
  test('the selected radio stays distinguishable in forced-colors mode', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forcedColors emulation is Chromium-only')
    await page.emulateMedia({ forcedColors: 'active' })
    await seedAppearance(page, stored('dark', 'teal'))
    await page.goto('/settings')
    const style = (value: string) =>
      radio(page, 'theme', value).evaluate((el) => {
        const cs = getComputedStyle(el)
        return `${cs.borderTopColor}|${cs.backgroundImage}`
      })
    const selected = await style('dark')
    const other = await style('light')
    expect(selected).not.toBe(other)
    expect(selected).toContain('radial-gradient')
    expect(other).not.toContain('radial-gradient')
  })
})
