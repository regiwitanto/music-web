import { defineConfig } from '@playwright/test'

// E2E runs against a production build made beforehand with NEXT_PUBLIC_TEST_HOOKS=1
// (quickstart §2). Playwright only starts the server; it never builds. A dedicated
// port keeps E2E away from a `next dev` server on the default port 3000.
const PORT = 3100
const desktop = { viewport: { width: 1440, height: 900 } }
const mobile = { viewport: { width: 390, height: 844 }, hasTouch: true }

export default defineConfig({
  testDir: 'tests/e2e',
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Keep a full trace (DOM snapshots, events, console) for every failed test, so a rare
    // flake can be diagnosed from its first occurrence (docs/quality-gates.md, 001 G9 gap 5).
    // Passing tests keep nothing. Locally the trace is in test-results/ until the next run;
    // the HTML report (uploaded by CI) embeds it.
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium-desktop', use: { browserName: 'chromium', ...desktop } },
    { name: 'chromium-mobile', use: { browserName: 'chromium', ...mobile, isMobile: true } },
    { name: 'firefox-desktop', use: { browserName: 'firefox', ...desktop } },
    // Firefox does not support `isMobile`; touch and viewport still apply.
    { name: 'firefox-mobile', use: { browserName: 'firefox', ...mobile } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', ...desktop } },
    { name: 'webkit-mobile', use: { browserName: 'webkit', ...mobile, isMobile: true } },
  ],
})
