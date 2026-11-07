import type { Browser, BrowserContext, Page } from '@playwright/test'
import { axeScan, expect, noHorizontalScroll, test, waitForHydration, waitForStorageHooks, type StorageWindow } from './fixtures'

/*
 * Local persistence (002; quickstart V6 to V10; contracts oracles; SC-001, SC-003, SC-006, SC-007).
 * Seeding and reading go through `window.__STORAGE__`, the test hook in the test-hooks build.
 *
 * Functional correctness and time budgets are separate assertions (research R10): behaviour is
 * proven first with a generous timeout that only stops a hung test; the 1 s budgets are then
 * checked against timestamps taken inside the browser. Those are wall-clock measurements: they
 * are reported with their measured value and are not fully deterministic.
 */

const VIEWPORT = { width: 1440, height: 900 }

const SEED = {
  track: {
    id: 'mock:trk_1',
    title: 'Song',
    artists: [{ id: 'mock:art_1', name: 'Artist' }],
    album: { id: 'mock:alb_1', title: 'Album' },
    durationMs: null,
    genreIds: ['rock'],
    moodIds: ['calm'],
    explicit: false,
    playable: true,
  },
  album: { id: 'mock:alb_1', title: 'Album', artists: [{ id: 'mock:art_1', name: 'Artist' }], year: 2020, trackIds: ['mock:trk_1'] },
  artist: { id: 'mock:art_1', name: 'Artist', genreIds: ['rock'] },
  like: { trackId: 'mock:trk_1', likedAt: 111 },
  playlist: {
    id: 'pl-1',
    kind: 'user',
    name: 'Road trip',
    description: 'Long drive',
    items: [
      { uid: 'u1', trackId: 'mock:trk_a', addedAt: 1 },
      { uid: 'u2', trackId: 'mock:trk_b', addedAt: 2 },
      { uid: 'u3', trackId: 'mock:trk_a', addedAt: 3 },
    ],
    createdAt: 100,
    updatedAt: 200,
  },
  libraryItems: [
    { kind: 'album', entityId: 'mock:alb_1', addedAt: 10 },
    { kind: 'artist', entityId: 'mock:art_1', addedAt: 20 },
    { kind: 'track', entityId: 'mock:trk_1', addedAt: 30 },
  ],
  search: { query: 'queen', searchedAt: 400 },
}

async function seed(page: Page) {
  await page.evaluate(async (s) => {
    const { storage } = (window as unknown as StorageWindow).__STORAGE__!
    await storage.snapshots.putTracks([s.track as never])
    await storage.snapshots.putAlbums([s.album as never])
    await storage.snapshots.putArtists([s.artist as never])
    await storage.likes.add(s.like.trackId as never, s.like.likedAt)
    await storage.playlists.put(s.playlist as never)
    for (const item of s.libraryItems) await storage.libraryItems.save(item.kind as never, item.entityId as never, item.addedAt)
    await storage.recentSearches.record(s.search.query, s.search.searchedAt)
  }, SEED)
}

async function readBack(page: Page) {
  return page.evaluate(async () => {
    const { storage, diagnostics } = (window as unknown as StorageWindow).__STORAGE__!
    return {
      tracks: await storage.snapshots.getTracks(['mock:trk_1' as never]),
      albums: await storage.snapshots.getAlbums(['mock:alb_1' as never]),
      artists: await storage.snapshots.getArtists(['mock:art_1' as never]),
      likes: await storage.likes.list(),
      playlists: await storage.playlists.list(),
      libraryItems: [...(await storage.libraryItems.list())].sort((a, b) => a.addedAt - b.addedAt),
      searches: await storage.recentSearches.list(),
      invalidRows: diagnostics.entries().filter((e) => e.kind === 'invalid-row').length,
    }
  })
}

const EXPECTED = {
  tracks: [SEED.track],
  albums: [SEED.album],
  artists: [SEED.artist],
  likes: [SEED.like],
  playlists: [SEED.playlist],
  libraryItems: SEED.libraryItems,
  searches: [SEED.search],
  invalidRows: 0,
}

async function openApp(page: Page, path = '/') {
  await page.goto(path)
  await waitForStorageHooks(page)
}

async function freshContext(browser: Browser, storageState?: Awaited<ReturnType<BrowserContext['storageState']>>) {
  return browser.newContext({ viewport: VIEWPORT, ...(storageState ? { storageState } : {}) })
}

test.describe('saved library data survives (V6, SC-001, FR-010, FR-011)', () => {
  test('every kind of record reads back identical after a reload', async ({ page }) => {
    await openApp(page)
    await seed(page)
    expect(await readBack(page)).toEqual(EXPECTED)
    await page.reload()
    await waitForStorageHooks(page)
    expect(await readBack(page)).toEqual(EXPECTED)
  })

  test('every kind of record reads back identical in a new browser context with the same storage state (restart)', async ({
    browser,
  }) => {
    const first = await freshContext(browser)
    const page = await first.newPage()
    await openApp(page)
    await seed(page)
    const state = await first.storageState({ indexedDB: true })
    await first.close()

    const second = await freshContext(browser, state)
    const restarted = await second.newPage()
    await openApp(restarted)
    expect(await readBack(restarted)).toEqual(EXPECTED)
    await second.close()
  })

  test('saved items still display with the network cut and without asking the catalog (Story 1 scenario 2)', async ({ browser }) => {
    const first = await freshContext(browser)
    const page = await first.newPage()
    await openApp(page)
    const origin = new URL(page.url()).origin
    await seed(page)
    const state = await first.storageState({ indexedDB: true })
    await first.close()

    // Restart with catalog-like requests blocked and counted: any fetch or XHR except Next's own
    // same-origin route prefetches (`?_rsc=`), which are the app's routing, not a catalog call.
    const second = await freshContext(browser, state)
    const blocked: string[] = []
    await second.route('**/*', (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const isAppRouting = url.origin === origin && url.searchParams.has('_rsc')
      if ((request.resourceType() === 'fetch' || request.resourceType() === 'xhr') && !isAppRouting) {
        blocked.push(request.url())
        return route.abort()
      }
      return route.continue()
    })
    const restarted = await second.newPage()
    await openApp(restarted)
    expect(await readBack(restarted)).toEqual(EXPECTED)

    // And again with the network disconnected after start-up.
    await second.setOffline(true)
    expect(await readBack(restarted)).toEqual(EXPECTED)
    expect(blocked).toEqual([])
    await second.close()
  })
})

test.describe('changes reach other open tabs (V7, SC-006, FR-014)', () => {
  /** B subscribes first (so subscription set-up is not timed); A writes; returns B's receipt delay in ms. */
  async function deliverLikeToOtherTab(context: BrowserContext): Promise<number> {
    const tabA = await context.newPage()
    const tabB = await context.newPage()
    await openApp(tabA)
    await openApp(tabB)

    await tabB.evaluate(() => (window as unknown as StorageWindow).__STORAGE__!.record('likes'))
    await expect
      .poll(() => tabB.evaluate(() => (window as unknown as StorageWindow).__STORAGE__!.watches.likes?.length ?? 0), { timeout: 10_000 })
      .toBeGreaterThan(0)

    const start = await tabA.evaluate(async () => {
      const t0 = Date.now()
      await (window as unknown as StorageWindow).__STORAGE__!.storage.likes.add('mock:trk_1' as never, 10)
      return t0
    })

    // Functional: the like arrives. The timeout only stops a hung test; it is not the budget.
    await expect
      .poll(
        () =>
          tabB.evaluate(() =>
            (window as unknown as StorageWindow).__STORAGE__!.watches.likes!.some((e) => (e.value as unknown[]).length > 0),
          ),
        { timeout: 15_000 },
      )
      .toBe(true)

    const receivedAt = await tabB.evaluate(
      () => (window as unknown as StorageWindow).__STORAGE__!.watches.likes!.find((e) => (e.value as unknown[]).length > 0)!.at,
    )
    return receivedAt - start
  }

  test('a like saved in one tab arrives in the other without a reload', async ({ context }) => {
    const delay = await deliverLikeToOtherTab(context)
    expect(Number.isFinite(delay)).toBe(true)
  })

  test('the like arrives within the 1 s budget (SC-006; wall-clock, in-browser timestamps)', async ({ context }, testInfo) => {
    const delay = await deliverLikeToOtherTab(context)
    testInfo.annotations.push({ type: 'measured-ms', description: String(delay) })
    expect(delay, `measured ${delay} ms`).toBeLessThan(1000)
  })
})

/* ---------- US2: the app keeps working when the device cannot save ---------- */

const NEUTRAL = "Storage is unavailable: your changes won't be saved."
const DESTINATIONS = ['/', '/explore', '/library', '/settings']
const ALL_PATHS = ['/', '/explore', '/library', '/settings', '/library/liked', '/settings/x1', '/radio']

/**
 * Makes the browser report no IndexedDB at all (the real "storage blocked" failure). The
 * prefixed names go too: WebKit still exposes `webkitIndexedDB`, which Dexie falls back to.
 */
async function removeIndexedDb(page: Page) {
  await page.addInitScript(() => {
    for (const name of ['indexedDB', 'webkitIndexedDB', 'mozIndexedDB', 'msIndexedDB']) {
      Object.defineProperty(window, name, { value: undefined, configurable: true })
    }
  })
}

/**
 * Records `performance.now()` (measured from the page's time origin, that is navigation start)
 * when a status region with the banner text is first inserted, as `window.__bannerAt`.
 */
async function recordBannerTime(page: Page) {
  await page.addInitScript((text) => {
    const w = window as unknown as { __bannerAt?: number }
    new MutationObserver(() => {
      if (w.__bannerAt !== undefined) return
      for (const el of document.querySelectorAll('[role="status"]')) {
        if (el.textContent?.includes(text)) {
          w.__bannerAt = performance.now()
          return
        }
      }
    }).observe(document, { childList: true, subtree: true })
  }, NEUTRAL)
}

/**
 * WebKit reports a `pageerror` when navigating away cancels one of Next's own route prefetches
 * (`?_rsc=`): "Fetch API cannot load ... due to access control checks". It comes from the test's
 * navigation, not from the app or the store, so it is not an application error.
 */
const isCancelledRoutePrefetch = (message: string) => message.includes('_rsc=') && message.includes('access control checks')

const banner = (page: Page) => page.getByRole('status').filter({ hasText: NEUTRAL })

test.describe('the device cannot save (V8, B-T4, FR-016, FR-017, SC-003)', () => {
  test('the shell starts, every destination opens, the banner shows on each, and nothing errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => {
      if (!isCancelledRoutePrefetch(e.message)) errors.push(e.message)
    })
    await removeIndexedDb(page)
    for (const path of DESTINATIONS) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      // Functional: the timeout only stops a hung test; it is not the 1 s budget.
      await expect(banner(page)).toBeVisible({ timeout: 10_000 })
    }
    expect(errors).toEqual([])
  })

  test('the banner appears within the 1 s budget (SC-003; wall-clock, in-page timestamp from navigation start)', async ({
    page,
  }, testInfo) => {
    await removeIndexedDb(page)
    await recordBannerTime(page)
    const measured: Record<string, number> = {}
    for (const path of DESTINATIONS) {
      await page.goto(path)
      await expect(banner(page)).toBeVisible({ timeout: 10_000 })
      measured[path] = await page.evaluate(() => (window as unknown as { __bannerAt?: number }).__bannerAt ?? Number.NaN)
    }
    testInfo.annotations.push({ type: 'measured-ms', description: JSON.stringify(measured) })
    for (const [path, ms] of Object.entries(measured)) expect(ms, `${path}: measured ${ms} ms`).toBeLessThan(1000)
  })

  test('data saved while the store is unavailable lasts for the session and is gone after a reload (Story 2)', async ({ page }) => {
    await removeIndexedDb(page)
    await openApp(page)
    await expect(banner(page)).toBeVisible({ timeout: 10_000 })
    await page.evaluate(() => (window as unknown as StorageWindow).__STORAGE__!.storage.likes.add('mock:trk_1' as never, 10))
    expect(await page.evaluate(() => (window as unknown as StorageWindow).__STORAGE__!.storage.likes.list())).toHaveLength(1)

    await page.reload()
    await waitForStorageHooks(page)
    await expect(banner(page)).toBeVisible({ timeout: 10_000 })
    expect(await page.evaluate(() => (window as unknown as StorageWindow).__STORAGE__!.storage.likes.list())).toEqual([])
  })

  test('with the banner shown there are no serious or critical accessibility issues, and Tab never enters the banner (B-T7)', async ({
    page,
    hasTouch,
  }) => {
    await removeIndexedDb(page)
    for (const path of ALL_PATHS) {
      await page.goto(path)
      await waitForHydration(page)
      await expect(banner(page)).toBeVisible({ timeout: 10_000 })
      expect(await axeScan(page), path).toEqual([])
    }
    if (!hasTouch) {
      await page.goto('/')
      await expect(banner(page)).toBeVisible({ timeout: 10_000 })
      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press('Tab')
        const inBanner = await page.evaluate(() => !!document.activeElement?.closest('[role="status"]'))
        expect(inBanner, `Tab press ${i + 1}`).toBe(false)
      }
    }
  })

  test('at 320 px the banner causes no horizontal scroll', async ({ page }) => {
    await removeIndexedDb(page)
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('/')
    await expect(banner(page)).toBeVisible({ timeout: 10_000 })
    await noHorizontalScroll(page)
  })
})

test.describe('a slow store never delays the shell (V10, B-T6, SC-007)', () => {
  test('with indexedDB.open never completing, the shell and navigation render and work, and no banner shows', async ({ page }) => {
    await page.addInitScript(() => {
      // A request that never fires any event: the store stays "opening" forever.
      IDBFactory.prototype.open = function () {
        return {} as IDBOpenDBRequest
      }
    })
    await page.goto('/')
    await waitForHydration(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible()
    await page.getByRole('navigation', { name: 'Main' }).locator('visible=true').getByRole('link', { name: 'Library' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible()
    await expect(banner(page)).toHaveCount(0)
  })
})

/* ---------- US3: data written by a newer version (B-T5, V9, FR-023) ---------- */

test.describe('data written by a newer version is left untouched (B-T5, V9, FR-023)', () => {
  test('the newer-version notice shows, the app works in memory, and the stored database is unchanged', async ({ page }) => {
    // Create mp-library at a higher version from a same-origin page that runs no app code.
    await page.goto('/icon.svg')
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.open('mp-library', 99)
          request.onupgradeneeded = () => {
            request.result.createObjectStore('likes', { keyPath: 'trackId' }).put({ trackId: 'mock:trk_9', likedAt: 1 })
          }
          request.onsuccess = () => {
            request.result.close()
            resolve()
          }
          request.onerror = () => reject(request.error)
        }),
    )

    await openApp(page)
    const region = page.getByRole('status').filter({ hasText: 'Data from a newer version of the app was found and has been left untouched.' })
    await expect(region).toBeVisible({ timeout: 10_000 })
    await expect(region).toContainText(NEUTRAL)

    // It works in memory: a like saved now is readable, and the stored like is not read.
    await page.evaluate(() => (window as unknown as StorageWindow).__STORAGE__!.storage.likes.add('mock:trk_1' as never, 10))
    const memoryLikes = await page.evaluate(() => (window as unknown as StorageWindow).__STORAGE__!.storage.likes.list())
    expect(memoryLikes).toEqual([{ trackId: 'mock:trk_1', likedAt: 10 }])

    // The stored database is exactly as it was: same version, no added tables, the original row only.
    const stored = await page.evaluate(
      () =>
        new Promise<{ version: number; stores: string[]; rows: unknown[] }>((resolve, reject) => {
          const request = indexedDB.open('mp-library')
          request.onsuccess = () => {
            const db = request.result
            const read = db.transaction('likes').objectStore('likes').getAll()
            read.onsuccess = () => {
              const result = { version: db.version, stores: [...db.objectStoreNames], rows: read.result }
              db.close()
              resolve(result)
            }
            read.onerror = () => reject(read.error)
          }
          request.onerror = () => reject(request.error)
        }),
    )
    expect(stored).toEqual({ version: 99, stores: ['likes'], rows: [{ trackId: 'mock:trk_9', likedAt: 1 }] })
  })
})
