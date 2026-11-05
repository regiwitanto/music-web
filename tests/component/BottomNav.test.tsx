import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BottomNav } from '@/presentation/components/shell/BottomNav'
import { resetMocks, setPathname } from './next-mocks'

// vi.mock is hoisted above imports, so the factories load the shared mocks lazily.
vi.mock('next/navigation', async () => (await import('./next-mocks')).navigationMock)
vi.mock('next/link', async () => (await import('./next-mocks')).linkMock)

describe('BottomNav (FR-003; ui-shell.md §2)', () => {
  beforeEach(() => resetMocks())

  it('is the main navigation with four labelled items, in order', () => {
    render(<BottomNav />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/', '/explore', '/library', '/settings'])
    for (const [i, label] of ['Home', 'Explore', 'Library', 'Settings'].entries()) {
      const link = links[i]
      if (!link) throw new Error(`missing link ${label}`)
      expect(link.querySelector('svg')).not.toBeNull()
      expect(within(link).getByText(label)).not.toHaveClass('sr-only')
    }
  })

  it('marks only the current item', () => {
    setPathname('/settings/x1')
    render(<BottomNav />)
    const current = screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page')
    expect(current.map((l) => l.getAttribute('href'))).toEqual(['/settings'])
  })
})
