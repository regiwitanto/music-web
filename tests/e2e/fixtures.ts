import AxeBuilder from '@axe-core/playwright'
import { test as base, expect, type Page } from '@playwright/test'
import type { DiagnosticsLog, Storage } from '@/application/ports'

/**
 * Shared E2E helpers for feature 001 (tasks.md T007).
 * Browser-side globals are read through `TestWindow` casts so these test
 * declarations never collide with the app's own `Window` augmentations.
 */

type Fault = { mode: 'throw' } | { mode: 'hold' }

type TestWindow = Window & {
  __TEST_FAULTS__?: Record<string, Fault>
  __TEST_RELEASE__?: (key: string) => void
  __SHELL_MOUNTS__?: { shell: number; sidebar: number; bottomNav: number; dock: number }
  __SKELETON_ANIMATION__?: Animation
}

/** Seeds the obsolete 001 value localStorage['mp.appearance'] before any page script runs (014 data-model §2). */
export async function seedObsoleteAppearance(page: Page, raw: string): Promise<void> {
  await page.addInitScript((value) => {
    window.localStorage.setItem('mp.appearance', value)
  }, raw)
}

/** Makes every localStorage read and write throw, like blocked storage. */
export async function breakStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const blocked = () => {
      throw new DOMException('Storage is blocked', 'SecurityError')
    }
    const throwing = {
      getItem: blocked,
      setItem: blocked,
      removeItem: blocked,
      clear: blocked,
      key: blocked,
      get length(): number {
        return blocked()
      },
    }
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => throwing })
  })
}

/**
 * Installs window.__TEST_FAULTS__ once per tab. A sessionStorage marker stops a
 * reload from reinstalling them (X2). Call at most once per page, with all keys.
 */
export async function setFaults(page: Page, faults: Record<string, Fault>): Promise<void> {
  await page.addInitScript((value) => {
    try {
      if (window.sessionStorage.getItem('__faults_installed__')) return
      window.sessionStorage.setItem('__faults_installed__', '1')
    } catch {
      // No sessionStorage: install every time.
    }
    ;(window as TestWindow).__TEST_FAULTS__ = value
  }, faults)
}

/** Faults persist until cleared; call this before Retry or Reload (X1). */
export async function clearFault(page: Page, key: string): Promise<void> {
  await page.evaluate((k) => {
    delete (window as TestWindow).__TEST_FAULTS__?.[k]
  }, key)
}

/** Releases a `hold` fault through the app's test hook (C1). */
export async function releaseHold(page: Page, key: string): Promise<void> {
  await page.evaluate((k) => {
    const release = (window as TestWindow).__TEST_RELEASE__
    if (!release) throw new Error('__TEST_RELEASE__ is not defined: is this a test-hooks build?')
    release(k)
  }, key)
}

/**
 * Pauses the `reveal` animation of every inserted [data-testid=skeleton] in the
 * microtask after insertion, before the first paint, and exposes it as
 * __SKELETON_ANIMATION__. Tests set its currentTime instead of waiting (C1).
 */
export async function freezeSkeletonAnimations(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const freeze = (el: Element) => {
      for (const a of el.getAnimations()) {
        if (a instanceof CSSAnimation && a.animationName === 'reveal') {
          a.pause()
          a.currentTime = 0
          ;(window as TestWindow).__SKELETON_ANIMATION__ = a
        }
      }
    }
    new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return
          if (node.matches('[data-testid="skeleton"]')) freeze(node)
          node.querySelectorAll('[data-testid="skeleton"]').forEach(freeze)
        })
      }
    }).observe(document, { childList: true, subtree: true })
  })
}

/**
 * Waits until React has hydrated the shell. The AppShell mount effect, which only
 * runs after hydration commits, records `shell` in the test-hooks build. Use it
 * before mutating the DOM or relying on client-side handlers.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(() => ((window as TestWindow).__SHELL_MOUNTS__?.shell ?? 0) >= 1)
}

/** The storage test hook (002 contracts; src/presentation/testing/storage-hooks.ts). */
export type StorageHooks = {
  storage: Storage
  diagnostics: DiagnosticsLog
  /** Values recorded by `record(name)`, each stamped with `Date.now()` when it arrived. */
  watches: Record<string, Array<{ at: number; value: unknown }>>
  record(name: 'likes' | 'playlists' | 'libraryItems' | 'recentSearches'): void
  status(): { phase: string; notice: string | null }
  showNotice(notice: 'unavailable' | 'newer-version' | 'blocked-upgrade' | 'stale-tab'): void
}
export type StorageWindow = Window & { __STORAGE__?: StorageHooks }

/** Waits until the app has installed `window.__STORAGE__` (after the shell mounts, in the test-hooks build). */
export async function waitForStorageHooks(page: Page, timeout = 10_000): Promise<void> {
  await page.waitForFunction(() => (window as unknown as StorageWindow).__STORAGE__ !== undefined, undefined, { timeout })
}

/** Reads the per-component shell mount counters (ui-shell.md §7.1). */
export async function readMounts(page: Page): Promise<TestWindow['__SHELL_MOUNTS__']> {
  return page.evaluate(() => (window as TestWindow).__SHELL_MOUNTS__)
}

/** Runs axe and returns only serious and critical violations. `disableRules` turns rules off by id. */
export async function axeScan(page: Page, options: { disableRules?: string[] } = {}) {
  const builder = new AxeBuilder({ page })
  if (options.disableRules) builder.disableRules(options.disableRules)
  const results = await builder.analyze()
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
}

/** True when the element is visually hidden (sr-only: a clipped box of at most 1×1 px) or not rendered. */
export async function isVisuallyHidden(locator: import('@playwright/test').Locator): Promise<boolean> {
  const box = await locator.boundingBox()
  return box === null || (box.width <= 1 && box.height <= 1)
}

/**
 * Moves the pointer to the page's top-right corner, away from every tooltip trigger.
 *
 * After the pointer leaves an open tooltip's trigger, Radix stores a grace area in React
 * state and only attaches the `pointermove` listener that closes the tooltip in an effect
 * after the next render. If every move lands before that render, nothing closes it. So:
 * wait for two animation frames, then move once more (docs/quality-gates.md, 001 G9 gap 5).
 */
export async function movePointerAway(page: Page): Promise<void> {
  const size = page.viewportSize()
  const x = (size?.width ?? 800) - 2
  await page.mouse.move(x, 2, { steps: 4 })
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  )
  await page.mouse.move(x - 1, 3)
}

/** Loads `/` on a desktop project, collapses the sidebar and returns the "Expand sidebar" toggle. */
export async function openCollapsedSidebar(page: Page): Promise<import('@playwright/test').Locator> {
  await page.goto('/')
  await waitForHydration(page)
  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  const expand = page.getByRole('button', { name: 'Expand sidebar' })
  await expect(expand).toBeVisible()
  await movePointerAway(page)
  return expand
}

/** Asserts the page has no horizontal scroll. */
export async function noHorizontalScroll(page: Page): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
}

/** JS chunk hold for the no-flash method (research R14, H1). No automatic timeout. */
export type JsHold = {
  /** Routes every /_next/static JS request on `page` and holds it until release(). */
  hold(page: Page): Promise<void>
  /** Lets every held request continue. Idempotent. */
  release(): void
  pendingCount(): number
  fulfilledCount(): number
  /** Proves no client JS has run: something is held and nothing went through. */
  assertNotHydrated(): void
}

export const test = base.extend<{ jsHold: JsHold }>({
  // Playwright requires an object pattern for the fixture's dependencies. The
  // callback is named `provide` so the React hooks lint rule does not misfire.
  jsHold: async ({}, provide) => {
    let resolveRelease: () => void = () => {}
    const released = new Promise<void>((resolve) => {
      resolveRelease = resolve
    })
    let isReleased = false
    let pending = 0
    let fulfilled = 0
    const pages: Page[] = []

    const hold: JsHold = {
      async hold(page) {
        pages.push(page)
        await page.route('**/_next/static/**/*.js', async (route) => {
          pending += 1
          await released
          try {
            await route.continue()
            fulfilled += 1
          } catch {
            // The page may already be closed during teardown.
          }
        })
      },
      release() {
        if (isReleased) return
        isReleased = true
        resolveRelease()
      },
      pendingCount: () => pending,
      fulfilledCount: () => fulfilled,
      assertNotHydrated() {
        expect(pending, 'the page requested no JS chunks, so the hold proves nothing').toBeGreaterThan(0)
        expect(fulfilled, 'a JS chunk was let through before the pre-hydration checks').toBe(0)
      },
    }

    await provide(hold)

    // Teardown always runs, including after a failure or timeout.
    hold.release()
    for (const page of pages) {
      await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {})
    }
  },
})

export { expect }
