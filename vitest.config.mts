import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// `@/` maps to `src/` without vite-tsconfig-paths (research R13).
const src = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': src } },
  test: {
    // Gate G7: domain coverage of at least 90% lines and branches.
    coverage: {
      provider: 'v8',
      include: ['src/domain/**'],
      thresholds: { lines: 90, branches: 90 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts', 'tests/lint/**/*.test.ts'],
        },
      },
      {
        // Repositories, lifecycle and migrations under fake-indexeddb (002 plan R9).
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          setupFiles: ['fake-indexeddb/auto'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['tests/component/**/*.test.tsx'],
          setupFiles: ['tests/setup/vitest.setup.ts'],
        },
      },
    ],
  },
})
