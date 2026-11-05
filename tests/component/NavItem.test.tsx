import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DESTINATIONS } from '@/application/shell'
import { NavItem } from '@/presentation/components/shell/NavItem'
import { TooltipProvider } from '@/presentation/components/ui/tooltip'
import { resetMocks, setPathname } from './next-mocks'

// vi.mock is hoisted above imports, so the factories load the shared mocks lazily.
vi.mock('next/navigation', async () => (await import('./next-mocks')).navigationMock)
vi.mock('next/link', async () => (await import('./next-mocks')).linkMock)

const [, explore, library] = DESTINATIONS

function renderItem(props: Partial<Parameters<typeof NavItem>[0]> = {}) {
  return render(
    <TooltipProvider>
      <NavItem destination={library} variant="sidebar" {...props} />
    </TooltipProvider>,
  )
}

describe('NavItem (FR-008, FR-031; ui-shell.md §2)', () => {
  beforeEach(() => resetMocks())

  it('is a link named by its label, pointing at the destination root', () => {
    renderItem()
    const link = screen.getByRole('link', { name: 'Library' })
    expect(link).toHaveAttribute('href', '/library')
  })

  it('keeps the label as the accessible name when collapsed to an icon', () => {
    renderItem({ collapsed: true })
    expect(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument()
  })

  it('marks the current destination, including on a reserved nested address', () => {
    setPathname('/library')
    const { unmount } = renderItem()
    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page')
    unmount()

    setPathname('/library/liked')
    renderItem()
    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page')
  })

  it('does not mark other destinations or unknown addresses', () => {
    setPathname('/explore')
    const { unmount } = renderItem()
    expect(screen.getByRole('link', { name: 'Library' })).not.toHaveAttribute('aria-current')
    unmount()

    setPathname('/library/podcasts')
    renderItem()
    expect(screen.getByRole('link', { name: 'Library' })).not.toHaveAttribute('aria-current')
  })

  it('shows the filled icon and the accent colour only when current', () => {
    setPathname('/library')
    const { unmount } = renderItem()
    const active = screen.getByRole('link', { name: 'Library' })
    expect(active).toHaveClass('text-accent')
    expect(active.querySelector('svg')).toHaveAttribute('fill', 'currentColor')
    unmount()

    setPathname('/')
    renderItem()
    const inactive = screen.getByRole('link', { name: 'Library' })
    expect(inactive).not.toHaveClass('text-accent')
    expect(inactive.querySelector('svg')).toHaveAttribute('fill', 'none')
  })

  it('shows a tooltip with the label when an icon-only item is hovered', async () => {
    const user = userEvent.setup()
    renderItem({ destination: explore, collapsed: true })
    await user.hover(screen.getByRole('link', { name: 'Explore' }))
    const tooltip = await screen.findByRole('tooltip')
    expect(within(tooltip).getByText('Explore')).toBeInTheDocument()
  })

  it('bottom-nav items show a visible text label', () => {
    render(<NavItem destination={explore} variant="bottom" />)
    const link = screen.getByRole('link', { name: 'Explore' })
    expect(within(link).getByText('Explore')).not.toHaveClass('sr-only')
  })
})
