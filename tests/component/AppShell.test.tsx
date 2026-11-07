import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { configureContainer } from '@/application/container'
import { AppShell } from '@/presentation/components/shell/AppShell'
import { RecordingObsoleteDataCleaner } from '@/test/fakes/RecordingObsoleteDataCleaner'

vi.mock('next/navigation', async () => (await import('./next-mocks')).navigationMock)
vi.mock('next/link', async () => (await import('./next-mocks')).linkMock)

/*
 * 014 contracts/identity.md §5 and oracle I-T7: the shell removes the obsolete 001
 * appearance value once, after mount, through the container (FR-019).
 */

describe('AppShell obsolete-data cleanup (I-T7)', () => {
  beforeEach(() => {
    // jsdom has no matchMedia; AppShell tracks two breakpoints with it.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  })

  it('removes the obsolete appearance value exactly once on mount, and not again on rerender', () => {
    const cleaner = new RecordingObsoleteDataCleaner()
    configureContainer({ obsoleteData: cleaner })

    const { rerender } = render(
      <AppShell>
        <h1>Page</h1>
      </AppShell>,
    )
    expect(cleaner.calls).toBe(1)

    rerender(
      <AppShell>
        <h1>Another page</h1>
      </AppShell>,
    )
    expect(cleaner.calls).toBe(1)
  })
})
