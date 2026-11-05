import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_DISPLAY_NAME } from '@/application/shell'
import { Sidebar } from '@/presentation/components/shell/Sidebar'
import { TooltipProvider } from '@/presentation/components/ui/tooltip'
import { resetMocks } from './next-mocks'

// vi.mock is hoisted above imports, so the factories load the shared mocks lazily.
vi.mock('next/navigation', async () => (await import('./next-mocks')).navigationMock)
vi.mock('next/link', async () => (await import('./next-mocks')).linkMock)

function Harness({ initiallyCollapsed = false }: { initiallyCollapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed)
  return (
    <TooltipProvider>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
    </TooltipProvider>
  )
}

describe('Sidebar (FR-005, FR-007; ui-shell.md §2)', () => {
  beforeEach(() => resetMocks())

  it('is the main navigation with exactly four links, in order', () => {
    render(<Harness />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/', '/explore', '/library', '/settings'])
    expect(links.map((l) => l.textContent?.trim())).toEqual(['Home', 'Explore', 'Library', 'Settings'])
  })

  it('shows the public name, which stays in the accessible text when collapsed', () => {
    const { unmount } = render(<Harness />)
    expect(screen.getByText(APP_DISPLAY_NAME)).not.toHaveClass('sr-only')
    unmount()

    render(<Harness initiallyCollapsed />)
    expect(screen.getByText(APP_DISPLAY_NAME)).toHaveClass('sr-only')
  })

  it('has a collapse toggle whose name and aria-expanded follow its state', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await user.click(toggle)
    const expand = screen.getByRole('button', { name: 'Expand sidebar' })
    expect(expand).toHaveAttribute('aria-expanded', 'false')
  })

  it('has no playlist shortcuts area and no fifth item', () => {
    render(<Harness />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getAllByRole('link')).toHaveLength(4)
    expect(within(nav).queryByText(/playlist/i)).toBeNull()
    expect(within(nav).queryByRole('link', { name: /now playing/i })).toBeNull()
  })
})
