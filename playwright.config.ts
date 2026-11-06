import { defineConfig } from '@playwright/test'

// E2E runs against a production build made beforehand with NEXT_PUBLIC_TEST_HOOKS=1
// (quickstart §2). Playwright only starts the server; it never builds. A dedicated
// port keeps E2E away from a `next dev` server on the default port 3000.
const PORT = 3100
const desktop = { viewport: { width: 1440, height: 900 } }
const mobile = { viewport: { width: 390, height: 844 }, hasTouch: true }

// Traces (actions, DOM snapshots, screencast, console, network; not DOM events or React
// state) are kept for failed WebKit tests only, where the rare tooltip flake is being
// investigated (docs/quality-gates.md, 001 G9 gap 5). Tracing every project made Firefox
// tests time out under parallel load (gap 6). Passing tests keep nothing. The HTML report
// embeds the trace (copy in test-results/); the next run wipes both (test-plan §2).
const trace = { trace: 'retain-on-failure' as const }
const noTrace = { trace: 'off' as const }

export default defineConfig({
  testDir: 'tests/e2e',
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  forbidOnly: !!process.env.CI,
  // Two workers, not the default (half the cores, 8 here). With 8 the suite had 11 timeouts
  // on Firefox and WebKit; with 2 it passed twice in a row and ran faster
  // (docs/quality-gates.md, 001 G9 gap 6).
  workers: 2,
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium-desktop', use: { browserName: 'chromium', ...desktop, ...noTrace } },
    { name: 'chromium-mobile', use: { browserName: 'chromium', ...mobile, isMobile: true, ...noTrace } },
    { name: 'firefox-desktop', use: { browserName: 'firefox', ...desktop, ...noTrace } },
    // Firefox does not support `isMobile`; touch and viewport still apply.
    { name: 'firefox-mobile', use: { browserName: 'firefox', ...mobile, ...noTrace } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', ...desktop, ...trace } },
    { name: 'webkit-mobile', use: { browserName: 'webkit', ...mobile, isMobile: true, ...trace } },
  ],
})
