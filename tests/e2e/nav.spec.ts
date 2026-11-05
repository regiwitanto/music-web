import { expect, isVisuallyHidden, movePointerAway, noHorizontalScroll, test } from './fixtures'

/*
 * Story 1 — reach any destination from anywhere (quickstart V1, V2; SC-001; FR-001–008, FR-014, FR-031).
 */

const ITEMS = [
  { label: 'Home', href: '/', h1: 'Home' },
  { label: 'Explore', href: '/explore', h1: 'Explore' },
  { label: 'Library', href: '/library', h1: 'Library' },
  { label: 'Settings', href: '/settings', h1: 'Settings' },
] as const

const WIDTHS = [320, 375, 768, 1024, 1440] as const

test.describe('width sweep (V1)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'The sweep resizes the viewport, so it runs on the desktop projects.')

  for (const width of WIDTHS) {
    test(`one navigation form, four items, one current item at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')

      const nav = page.getByRole('navigation', { name: 'Main' })
      await expect(nav).toHaveCount(1)
      await expect(page.getByTestId(width < 768 ? 'bottom-nav' : 'sidebar')).toBeVisible()
      await expect(page.getByTestId(width < 768 ? 'sidebar' : 'bottom-nav')).toBeHidden()

      const links = nav.getByRole('link')
      await expect(links).toHaveCount(4)
      for (const [i, item] of ITEMS.entries()) {
        await expect(links.nth(i)).toHaveAttribute('href', item.href)
        await expect(links.nth(i)).toHaveAccessibleName(item.label)
      }

      for (const item of ITEMS) {
        await nav.getByRole('link', { name: item.label }).click()
        await expect(page).toHaveURL(item.href)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(item.h1)
        await expect(nav.locator('[aria-current="page"]')).toHaveCount(1)
        await expect(nav.getByRole('link', { name: item.label })).toHaveAttribute('aria-current', 'page')
        await noHorizontalScroll(page)
      }
    })
  }
})

test.describe('sidebar forms (V1, V2)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'Sidebar layouts are checked on the desktop projects.')

  test('768–1023 px: icon-only sidebar with no collapse toggle', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 })
    await page.goto('/')
    const sidebar = page.getByTestId('sidebar')
    expect(await isVisuallyHidden(sidebar.getByText('Explore', { exact: true }))).toBe(true)
    await expect(page.getByRole('button', { name: /collapse sidebar|expand sidebar/i })).toBeHidden()
    const box = await sidebar.boundingBox()
    expect(box?.width).toBe(72)
  })

  test('800 px: hovering an icon-only item shows its tooltip (Story 1 scenario 3)', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 })
    await page.goto('/')
    for (const item of ITEMS) {
      // Playwright jumps the pointer in one step; move away first so the previous
      // tooltip's hover grace area cannot keep it open.
      await movePointerAway(page)
      await expect(page.getByRole('tooltip')).toHaveCount(0)
      await page.getByTestId('sidebar').getByRole('link', { name: item.label }).hover()
      await expect(page.getByRole('tooltip')).toHaveText(item.label)
    }
  })

  test('1440 px: collapsing switches 240 ↔ 72 px and keeps every item one click away', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.getByTestId('sidebar')
    expect((await sidebar.boundingBox())?.width).toBe(240)
    expect(await isVisuallyHidden(sidebar.getByText('Explore', { exact: true }))).toBe(false)

    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    expect((await sidebar.boundingBox())?.width).toBe(72)
    expect(await isVisuallyHidden(sidebar.getByText('Explore', { exact: true }))).toBe(true)

    await sidebar.getByRole('link', { name: 'Explore' }).hover()
    await expect(page.getByRole('tooltip')).toHaveText('Explore')

    for (const item of ITEMS) {
      await sidebar.getByRole('link', { name: item.label }).click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(item.h1)
    }

    await page.getByRole('button', { name: 'Expand sidebar' }).click()
    expect((await sidebar.boundingBox())?.width).toBe(240)
  })
})

test.describe('wide screens (FR-014)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'Wide layouts are checked on the desktop projects.')

  for (const width of [1600, 1920]) {
    test(`${width} px: no horizontal scroll, content at most 1600 px wide and centred`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      await noHorizontalScroll(page)
      const main = await page.locator('main#main').boundingBox()
      const content = await page.locator('main#main > div').first().boundingBox()
      if (!main || !content) throw new Error('main or its content wrapper is not rendered')
      expect(content.width).toBeLessThanOrEqual(1600)
      // main is offset by the sidebar through padding-left, so measure from its content edge.
      const paddingLeft = await page.locator('main#main').evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft))
      const leftGap = content.x - (main.x + paddingLeft)
      const rightGap = main.x + main.width - (content.x + content.width)
      expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(1)
    })
  }
})

test.describe('mobile projects', () => {
  test.skip(({ hasTouch }) => !hasTouch, 'Runs on the mobile (touch) projects.')

  test('bottom bar with labelled items and no sidebar', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav).toHaveCount(1)
    await expect(page.getByTestId('bottom-nav')).toBeVisible()
    for (const item of ITEMS) await expect(nav.getByText(item.label, { exact: true })).toBeVisible()
    await nav.getByRole('link', { name: 'Library' }).tap()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Library')
  })
})

test('there is no fifth item and no Now Playing destination (FR-002)', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /now playing/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /now playing/i })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveCount(4)
})
