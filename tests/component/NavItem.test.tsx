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

  describe('re-selecting the current destination (FR-010, research R8)', () => {
    let scrollTo: ReturnType<typeof vi.fn>
    let prevented: boolean[]
    const record = (event: Event) => {
      // Runs after the link's own handler (bubbling). Record, then stop jsdom navigating.
      prevented.push(event.defaultPrevented)
      event.preventDefault()
    }

    function stubWindow({ scrollY, reducedMotion }: { scrollY: number; reducedMotion: boolean }) {
      scrollTo = vi.fn()
      vi.stubGlobal('scrollTo', scrollTo)
      Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY })
      vi.stubGlobal(
        'matchMedia',
        (query: string) =>
          ({
            matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
          }) as unknown as MediaQueryList,
      )
    }

    beforeEach(() => {
      prevented = []
      document.addEventListener('click', record)
      return () => {
        document.removeEventListener('click', record)
        vi.unstubAllGlobals()
      }
    })

    it('scrolls a scrolled root back to the top, smoothly, without navigating or moving focus', async () => {
      const user = userEvent.setup()
      setPathname('/library')
      stubWindow({ scrollY: 600, reducedMotion: false })
      renderItem()
      const link = screen.getByRole('link', { name: 'Library' })
      link.focus()
      await user.click(link)
      expect(prevented).toEqual([true])
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
      expect(link).toHaveFocus()
    })

    it('jumps instantly under reduced motion', async () => {
      const user = userEvent.setup()
      setPathname('/library')
      stubWindow({ scrollY: 600, reducedMotion: true })
      renderItem()
      await user.click(screen.getByRole('link', { name: 'Library' }))
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })
    })

    it('does nothing when already at the top', async () => {
      const user = userEvent.setup()
      setPathname('/library')
      stubWindow({ scrollY: 0, reducedMotion: false })
      renderItem()
      await user.click(screen.getByRole('link', { name: 'Library' }))
      expect(prevented).toEqual([true])
      expect(scrollTo).not.toHaveBeenCalled()
    })

    it('navigates to the root from a nested page under it', async () => {
      const user = userEvent.setup()
      setPathname('/library/liked')
      stubWindow({ scrollY: 600, reducedMotion: false })
      renderItem()
      await user.click(screen.getByRole('link', { name: 'Library' }))
      expect(prevented).toEqual([false])
      expect(scrollTo).not.toHaveBeenCalled()
    })

    it('navigates normally to a different destination', async () => {
      const user = userEvent.setup()
      setPathname('/explore')
      stubWindow({ scrollY: 600, reducedMotion: false })
      renderItem()
      await user.click(screen.getByRole('link', { name: 'Library' }))
      expect(prevented).toEqual([false])
    })
  })

  it('bottom-nav items show a visible text label', () => {
    render(<NavItem destination={explore} variant="bottom" />)
    const link = screen.getByRole('link', { name: 'Explore' })
    expect(within(link).getByText('Explore')).not.toHaveClass('sr-only')
  })
})
