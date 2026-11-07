import { axeScan, expect, isVisuallyHidden, movePointerAway, noHorizontalScroll, openCollapsedSidebar, readMounts, test, waitForHydration } from './fixtures'

/*
 * Story 3 — keyboard and screen-reader users can do everything
 * (quickstart V7–V9, V23, V24; SC-002, SC-003; FR-026–FR-031).
 */

test.describe('skip link and focus order (V7)', () => {
  test('first Tab focuses the skip link and Enter focuses main', async ({ page, isMobile }) => {
    test.skip(isMobile === true, 'Keyboard flow')
    await page.goto('/')
    await waitForHydration(page)
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('main#main')).toBeFocused()
  })

  test('tab order is skip → nav → content, never the player dock, and every stop has an outline', async ({
    page,
    hasTouch,
  }) => {
    test.skip(hasTouch, 'Keyboard flow')
    await page.goto('/')
    await waitForHydration(page)
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab')
      const state = await page.evaluate(() => {
        const el = document.activeElement
        return {
          inDock: !!el?.closest('[data-testid="player-dock"]'),
          outline: el ? getComputedStyle(el).outlineStyle : 'none',
          isBody: el === document.body,
        }
      })
      if (state.isBody) break
      expect(state.inDock).toBe(false)
      expect(state.outline).not.toBe('none')
    }
  })

  test('activating Explore moves focus to its h1 and sets the title', async ({ page, hasTouch }) => {
    test.skip(hasTouch, 'Keyboard flow')
    await page.goto('/')
    await waitForHydration(page)
    const link = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Explore' })
    await link.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { level: 1, name: 'Explore' })).toBeFocused()
    await expect(page).toHaveTitle('Explore · Music Player')
  })
})

test.describe('landmarks', () => {
  test('one visible navigation and one main', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(1)
    await expect(page.getByRole('main')).toHaveCount(1)
  })

  test('the Player region exists at 1440 px but not at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('region', { name: 'Player' })).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByRole('region', { name: 'Player' })).toBeHidden()
  })
})

test.describe('axe scans (V8)', () => {
  const PATHS = ['/', '/explore', '/library', '/settings', '/library/liked', '/settings/x1', '/radio']
  test('no serious or critical issues on the identity (I-T9)', async ({ page }) => {
    for (const path of PATHS) {
      await page.goto(path)
      await waitForHydration(page)
      expect(await axeScan(page), path).toEqual([])
    }
  })
})

test.describe('target sizes and names (V9)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'Resizes the viewport, so it runs on the desktop projects.')

  test('bottom-nav links are at least 44×44 at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const links = page.getByTestId('bottom-nav').getByRole('link')
    await expect(links).toHaveCount(4)
    for (let i = 0; i < 4; i += 1) {
      const box = await links.nth(i).boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(44)
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('every interactive element is at least 24×24 at 1440 px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    const boxes = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('a,button,input,select,textarea'))
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0 && !(r.width <= 1 && r.height <= 1))
        .map((r) => ({ w: r.width, h: r.height })),
    )
    for (const b of boxes) {
      expect(b.w).toBeGreaterThanOrEqual(24)
      expect(b.h).toBeGreaterThanOrEqual(24)
    }
  })

  test('icon-only nav items have names and tooltips', async ({ page }) => {
    await openCollapsedSidebar(page)
    const nav = page.getByRole('navigation', { name: 'Main' })
    for (const label of ['Home', 'Explore', 'Library', 'Settings']) {
      const link = nav.getByRole('link', { name: label })
      expect(await isVisuallyHidden(link.locator('span'))).toBe(true)
      await link.hover()
      await expect(page.getByRole('tooltip', { name: label })).toBeVisible()
      await movePointerAway(page)
    }
  })

  test('the collapse toggle shows its tooltip before it is ever clicked', async ({ page }) => {
    // Expanded state: "Collapse sidebar" is icon-only, so it needs a tooltip too (FR-031).
    await page.goto('/')
    await waitForHydration(page)
    await movePointerAway(page)
    await page.getByRole('button', { name: 'Collapse sidebar' }).hover()
    await expect(page.getByRole('tooltip', { name: 'Collapse sidebar' })).toBeVisible()
  })

  test('the collapse toggle keeps its tooltip after toggling, in both states', async ({ page }) => {
    // Regression test for G9 gap 3 (fixed 2026-11-06): the click replaces the hovered icon,
    // and WebKit then often sent no pointerleave, so the tooltip stopped opening by hover
    // and by focus. Runs on every desktop engine, WebKit included.
    // Collapsed: "Expand sidebar". The same hover approach as the nav items (pointer away, then hover).
    const expand = await openCollapsedSidebar(page)
    await expand.hover()
    await expect(page.getByRole('tooltip', { name: 'Expand sidebar' })).toBeVisible()
    // Expanded: "Collapse sidebar" is icon-only too, so it also needs a tooltip (FR-031).
    await expand.click()
    const collapse = page.getByRole('button', { name: 'Collapse sidebar' })
    await expect(collapse).toBeVisible()
    await movePointerAway(page)
    await collapse.hover()
    await expect(page.getByRole('tooltip', { name: 'Collapse sidebar' })).toBeVisible()
    // Keyboard: after the clicks, moving focus away and back still shows the tooltip.
    await movePointerAway(page)
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('tooltip', { name: 'Collapse sidebar' })).toHaveCount(0)
    await page.keyboard.press('Tab')
    await expect(collapse).toBeFocused()
    await expect(page.getByRole('tooltip', { name: 'Collapse sidebar' })).toBeVisible()
  })
})

test.describe('crossing a breakpoint (V23)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'Resizes the viewport, so it runs on the desktop projects.')

  test('keeps URL, h1, current item and focus; mounts unchanged', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/library/liked')
    await waitForHydration(page)
    const before = await readMounts(page)
    const back = page.getByRole('link', { name: 'Go to Library' })
    await back.focus()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page).toHaveURL(/\/library\/liked$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(back).toBeFocused()
    await expect(page.getByRole('navigation', { name: 'Main' }).locator('[aria-current="page"]')).toHaveText('Library')
    expect(await readMounts(page)).toEqual(before)
    expect(before).toMatchObject({ shell: 1, sidebar: 1, bottomNav: 1 })
  })

  test('focus on a hiding nav form moves to the active item of the visible form', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/library/liked')
    await waitForHydration(page)
    await page.getByTestId('bottom-nav').getByRole('link', { name: 'Home' }).focus()
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.getByTestId('sidebar').locator('a[aria-current="page"]')).toBeFocused()
  })

  test('the hand-off also works from the sidebar to the bottom nav', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/library/liked')
    await waitForHydration(page)
    await page.getByTestId('sidebar').getByRole('link', { name: 'Home' }).focus()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByTestId('bottom-nav').locator('a[aria-current="page"]')).toBeFocused()
  })

  test('focus that already left the nav is not pulled back by a breakpoint change', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/library/liked')
    await waitForHydration(page)
    const home = page.getByTestId('bottom-nav').getByRole('link', { name: 'Home' })
    await home.focus()
    // The user moves focus away while the link is still visible, leaving focus on <body>.
    await home.evaluate((el) => (el as HTMLElement).blur())
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.getByTestId('sidebar').locator('a[aria-current="page"]')).not.toBeFocused()
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
  })

  test('the collapse toggle losing focus below 1024 px hands it to the active sidebar item', async ({ page }) => {
    // The toggle exists only at 1024 px and above; the sidebar itself stays down to 768 px.
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/library/liked')
    await waitForHydration(page)
    await page.getByRole('button', { name: 'Collapse sidebar' }).focus()
    await page.setViewportSize({ width: 900, height: 900 })
    await expect(page.getByTestId('sidebar').locator('a[aria-current="page"]')).toBeFocused()
  })

  test('a hand-off at 1024 px is not repeated later from a stale record', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/library/liked')
    await waitForHydration(page)
    await page.getByRole('button', { name: 'Collapse sidebar' }).focus()
    await page.setViewportSize({ width: 900, height: 900 })
    await expect(page.getByTestId('sidebar').locator('a[aria-current="page"]')).toBeFocused()
    // The user moves focus away; a later move to the bottom nav must leave it there.
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByTestId('bottom-nav').locator('a[aria-current="page"]')).not.toBeFocused()
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
  })

  test('focus on a sidebar link is untouched when only the toggle goes away', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/library/liked')
    await waitForHydration(page)
    const explore = page.getByTestId('sidebar').getByRole('link', { name: 'Explore' })
    await explore.focus()
    await page.setViewportSize({ width: 900, height: 900 })
    await expect(explore).toBeFocused()
  })
})

test.describe('reflow (V24)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'Resizes the viewport, so it runs on the desktop projects.')

  test('no horizontal scroll at 320 px and complete bottom-nav names', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await page.goto('/')
    await noHorizontalScroll(page)
    const links = page.getByTestId('bottom-nav').getByRole('link')
    for (const [i, label] of ['Home', 'Explore', 'Library', 'Settings'].entries()) {
      await expect(links.nth(i)).toHaveAccessibleName(label)
    }
  })

  test('no horizontal scroll at 200% zoom on a 1280 px viewport', async ({ page }) => {
    // 200% zoom of 1280 px is an effective 640 px CSS viewport.
    await page.setViewportSize({ width: 640, height: 450 })
    await page.goto('/')
    await noHorizontalScroll(page)
  })
})
