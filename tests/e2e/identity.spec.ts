import type { Page } from '@playwright/test'
import {
  axeScan,
  breakStorage,
  expect,
  freezeSkeletonAnimations,
  seedObsoleteAppearance,
  setFaults,
  test,
  waitForHydration,
} from './fixtures'

/*
 * The single permanent visual identity (014; quickstart V1–V9; contracts/identity.md §6
 * I-T3 to I-T6, I-T8; contracts/settings-page.md S-T3 to S-T5; SC-001 to SC-006).
 */

const BG = 'rgb(16, 27, 35)' // #101B23
const TEXT = 'rgb(232, 237, 240)' // #E8EDF0
const ACCENT = 'rgb(216, 173, 136)' // #D8AD88

const PATHS = ['/', '/explore', '/library', '/settings', '/library/liked', '/settings/x1', '/radio'] as const
const DESTINATIONS = ['/', '/explore', '/library', '/settings']

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main' }).locator('visible=true')

type Focus = { outlineStyle: string; outlineWidth: string; outlineColor: string; tag: string }
const focusState = (page: Page): Promise<Focus | null> =>
  page.evaluate(async () => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    // Buttons and links use `transition-colors`, which also animates outline-color: read the
    // settled value, not the first frame after focus (no timers; the animations are awaited).
    await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)))
    const cs = getComputedStyle(el)
    return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, tag: el.tagName }
  })

/** Presses Tab up to `max` times and returns the focus state at every stop until focus leaves the page. */
async function tabStops(page: Page, max: number): Promise<Focus[]> {
  const stops: Focus[] = []
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press('Tab')
    const state = await focusState(page)
    if (!state) break
    stops.push(state)
  }
  return stops
}

test.describe('first frame (I-T3, V1, SC-001)', () => {
  test.setTimeout(180_000)

  for (const scheme of ['light', 'dark'] as const) {
    for (const path of PATHS) {
      test(`${path} shows the identity before any script runs, system preference ${scheme}`, async ({
        browser,
        browserName,
        hasTouch,
        jsHold,
      }) => {
        // SC-001: 10 cold loads per destination in Chromium; one load elsewhere.
        const loads = browserName === 'chromium' && DESTINATIONS.includes(path) ? 10 : 1
        for (let i = 0; i < loads; i += 1) {
          const context = await browser.newContext({
            viewport: hasTouch ? { width: 390, height: 844 } : { width: 1440, height: 900 },
            hasTouch,
            colorScheme: scheme,
          })
          const page = await context.newPage()
          await jsHold.hold(page)
          await page.goto(path, { waitUntil: 'domcontentloaded' })
          await expect.poll(() => jsHold.pendingCount()).toBeGreaterThan(0)
          jsHold.assertNotHydrated()

          const body = await page.evaluate(() => {
            const cs = getComputedStyle(document.body)
            return { bg: cs.backgroundColor, color: cs.color }
          })
          expect(body, `${path} ${scheme} load ${i + 1}`).toEqual({ bg: BG, color: TEXT })

          const current = page.locator('[aria-current="page"]:visible')
          if (path === '/radio') {
            // Not Found marks no destination as current (001 D-001-1).
            await expect(current).toHaveCount(0)
          } else {
            expect(await current.first().evaluate((el) => getComputedStyle(el).color)).toBe(ACCENT)
          }
          await context.close()
        }
      })
    }
  }
})

test.describe('the system preference changes nothing (I-T4, V2, Story 1 scenarios 2–3)', () => {
  const read = (page: Page) =>
    page.evaluate(() => {
      const bg = (selector: string) => {
        const el = document.querySelector(selector)
        return el ? getComputedStyle(el).backgroundColor : null
      }
      const current = document.querySelector('[aria-current="page"]')
      return {
        body: getComputedStyle(document.body).backgroundColor,
        text: getComputedStyle(document.body).color,
        sidebar: bg('[data-testid="sidebar"]'),
        bottomNav: bg('[data-testid="bottom-nav"]'),
        dock: bg('[data-testid="player-dock"]'),
        current: current ? getComputedStyle(current).color : null,
      }
    })

  for (const path of PATHS) {
    test(`${path}: light and dark system preferences give identical colours, also when switched live`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: 'light' })
      await page.goto(path)
      await waitForHydration(page)
      const light = await read(page)
      expect(light.body).toBe(BG)

      await page.emulateMedia({ colorScheme: 'dark' })
      expect(await read(page), 'switched live').toEqual(light)

      await page.reload()
      await waitForHydration(page)
      expect(await read(page), 'reloaded under dark').toEqual(light)
    })
  }
})

test.describe('native surfaces are dark (I-T5, V3, SC-002)', () => {
  for (const path of ['/', '/radio']) {
    test(`${path} declares a dark colour scheme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' })
      await page.goto(path)
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark')
      await expect(page.locator('meta[name="color-scheme"][content="dark"]')).toHaveCount(1)
    })
  }
})

test.describe('the obsolete 001 appearance value (I-T6, V4, FR-019, SC-006)', () => {
  const values = {
    valid: JSON.stringify({ v: 1, theme: 'light', accent: 'red' }),
    unknown: '{"v":1,"theme":"neon","accent":"plaid"}',
    corrupt: 'not json',
  }
  for (const [name, raw] of Object.entries(values)) {
    test(`a ${name} value is removed and has no effect`, async ({ page }) => {
      await seedObsoleteAppearance(page, raw)
      await page.goto('/')
      await waitForHydration(page)
      await expect.poll(() => page.evaluate(() => window.localStorage.getItem('mp.appearance'))).toBeNull()
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(BG)
    })
  }

  test('blocked storage: the page loads without an error and shows the identity', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await breakStorage(page)
    await page.goto('/')
    await waitForHydration(page)
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(BG)
    expect(errors).toEqual([])
  })
})

test.describe('Settings (S-T3 to S-T5, V5, V6, Story 2)', () => {
  test('lists five Coming soon rows and no appearance control', async ({ page }) => {
    await page.goto('/settings')
    await waitForHydration(page)
    const rows = page.getByRole('list', { name: 'Settings sections' }).getByRole('listitem')
    await expect(rows).toHaveCount(5)
    const names = ['Playback', 'Storage', 'Library & Data', 'Accessibility', 'About']
    for (const [i, name] of names.entries()) {
      await expect(rows.nth(i)).toContainText(name)
      await expect(rows.nth(i)).toContainText('Coming soon')
    }
    await expect(page.locator('main fieldset, main input[type="radio"]')).toHaveCount(0)
    expect(await page.locator('main').innerText()).not.toMatch(/theme|accent|appearance/i)
  })

  test('no row can be reached with the keyboard', async ({ page, hasTouch }) => {
    test.skip(hasTouch, 'Keyboard flow')
    await page.goto('/settings')
    await waitForHydration(page)
    await page.getByRole('heading', { level: 1, name: 'Settings' }).focus()
    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.press('Tab')
      const inList = await page.evaluate(
        () => !!document.activeElement?.closest('ul[aria-label="Settings sections"]'),
      )
      expect(inList, `Tab press ${i + 1}`).toBe(false)
    }
  })

  test('/settings/appearance is an ordinary reserved address', async ({ page }) => {
    await page.goto('/settings/appearance')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nothing here yet')
    await expect(page.getByRole('link', { name: 'Settings' }).locator('visible=true').first()).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(page.locator('main fieldset, main input[type="radio"]')).toHaveCount(0)
  })
})

test.describe('focus ring on every surface (V7, Story 3 scenario 3, FR-011)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'Keyboard flow')

  for (const path of ['/', '/settings']) {
    test(`${path}: every Tab stop shows a 2 px accent outline`, async ({ page }) => {
      await page.goto(path)
      await waitForHydration(page)
      const stops = await tabStops(page, 15)
      expect(stops.length).toBeGreaterThanOrEqual(5)
      for (const stop of stops) {
        expect(stop).toMatchObject({ outlineStyle: 'solid', outlineWidth: '2px', outlineColor: ACCENT })
      }
    })
  }

  test('the Retry button (copper-filled) shows the same outline', async ({ page }) => {
    await setFaults(page, { '/explore': { mode: 'throw' } })
    await page.goto('/')
    await waitForHydration(page)
    await nav(page).getByRole('link', { name: 'Explore' }).click()
    const error = page.locator('main').getByTestId('error-state')
    await expect(error).toBeVisible()
    await expect(error.getByRole('heading', { level: 1 })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Retry' })).toBeFocused()
    expect(await focusState(page)).toMatchObject({
      outlineStyle: 'solid',
      outlineWidth: '2px',
      outlineColor: ACCENT,
    })
  })
})

test.describe('forced colours (I-T8, V8, FR-014, D-014-2)', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Forced-colours emulation is Chromium-only; real Windows High Contrast is Deferred (D-014-2).',
  )

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
  })

  test('the active destination has a visible marker besides colour', async ({ page, hasTouch }) => {
    await page.goto('/library')
    await waitForHydration(page)
    const marker = await page.evaluate((mobile) => {
      const root = document.querySelector(mobile ? '[data-testid="bottom-nav"]' : '[data-testid="sidebar"]')
      const cs = getComputedStyle(root!.querySelector('[aria-current="page"]')!)
      return mobile
        ? { style: cs.borderTopStyle, width: cs.borderTopWidth }
        : { style: cs.borderLeftStyle, width: cs.borderLeftWidth }
    }, hasTouch)
    expect(marker).toEqual({ style: 'solid', width: '2px' })
  })

  test('the marker does not shift the content of the current item against its siblings', async ({
    page,
    hasTouch,
  }) => {
    await page.goto('/library')
    await waitForHydration(page)
    // Offset of each link's icon inside the link: equal for all four when the width is reserved.
    const offsets = await page.evaluate((mobile) => {
      const root = document.querySelector(mobile ? '[data-testid="bottom-nav"]' : '[data-testid="sidebar"]')!
      return [...root.querySelectorAll('a')].map((a) => {
        const icon = a.querySelector('svg')!.getBoundingClientRect()
        const box = a.getBoundingClientRect()
        return mobile ? Math.round(icon.top - box.top) : Math.round(icon.left - box.left)
      })
    }, hasTouch)
    expect(offsets).toHaveLength(4)
    expect(new Set(offsets).size, `icon offsets ${offsets.join(', ')}`).toBe(1)
  })

  test('every Tab stop keeps a visible outline', async ({ page, hasTouch }) => {
    test.skip(hasTouch, 'Keyboard flow')
    await page.goto('/')
    await waitForHydration(page)
    const stops = await tabStops(page, 15)
    expect(stops.length).toBeGreaterThanOrEqual(5)
    for (const stop of stops) expect(stop.outlineStyle).not.toBe('none')
  })

  test('skeleton blocks keep a border', async ({ page, hasTouch }) => {
    test.skip(hasTouch, 'Deterministic animation control runs on the desktop projects.')
    await setFaults(page, { '/explore': { mode: 'hold' } })
    await freezeSkeletonAnimations(page)
    await page.goto('/')
    await waitForHydration(page)
    await nav(page).getByRole('link', { name: 'Explore' }).click()
    await page.locator('[data-testid=skeleton]').waitFor({ state: 'attached' })
    // Tailwind's base layer gives every element `border: 0 solid`, so the width is what counts.
    const widths = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="skeleton"] [data-slot="skeleton"]')].map(
        (el) => getComputedStyle(el).borderTopWidth,
      ),
    )
    expect(widths.length).toBeGreaterThan(0)
    for (const width of widths) expect(width).toBe('1px')
  })

  test('the primary Retry button keeps a border', async ({ page }) => {
    await setFaults(page, { '/explore': { mode: 'throw' } })
    await page.goto('/')
    await waitForHydration(page)
    await nav(page).getByRole('link', { name: 'Explore' }).click()
    const retry = page.getByRole('button', { name: 'Retry' })
    await expect(retry).toBeVisible()
    // The base layer's `border: 0 solid` makes the style meaningless on its own; check the width.
    expect(await retry.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('1px')
  })

  test('no serious or critical accessibility issues on any page in scope', async ({ page }) => {
    for (const path of PATHS) {
      await page.goto(path)
      await waitForHydration(page)
      // `color-contrast` is off here only: in forced-colours mode the browser paints the user's
      // system colours, so axe's check of the author colours says nothing. The identity's contrast
      // is proven by tests/unit/tokens-contrast.test.ts and by the normal-mode scan in a11y.spec.ts.
      expect(await axeScan(page, { disableRules: ['color-contrast'] }), path).toEqual([])
    }
  })
})
