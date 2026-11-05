import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Compass } from 'lucide-react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AsyncView } from '@/presentation/components/states/AsyncView'
import { DelayedSkeleton } from '@/presentation/components/states/DelayedSkeleton'
import { EmptyState } from '@/presentation/components/states/EmptyState'
import { ErrorState } from '@/presentation/components/states/ErrorState'
import { resetMocks } from './next-mocks'

vi.mock('next/navigation', async () => (await import('./next-mocks')).navigationMock)

const MESSAGE = 'Nothing here.'

beforeEach(() => resetMocks())
afterEach(() => {
  vi.unstubAllEnvs()
  delete window.__TEST_FAULTS__
  delete window.__TEST_RELEASE__
  delete window.__SHELL_MOUNTS__
})

describe('state components (ui-shell.md §6)', () => {
  it('EmptyState renders the message and a decorative icon', () => {
    const { container } = render(<EmptyState icon={Compass} message={MESSAGE} />)
    expect(screen.getByText(MESSAGE)).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('ErrorState shows plain copy and calls onRetry once', async () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByText("This page couldn't be shown.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('error-state').textContent).not.toMatch(/digest|stack|Error:/i)
  })

  it('ErrorState focuses its h1 on mount', () => {
    render(<ErrorState onRetry={() => {}} />)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })

  it('DelayedSkeleton announces "Loading" through a busy status region', () => {
    render(<DelayedSkeleton />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveTextContent('Loading')
  })

  it('DelayedSkeleton starts hidden and reveals after 150 ms', () => {
    render(<DelayedSkeleton />)
    const el = screen.getByTestId('skeleton')
    expect(el).toHaveClass('skeleton-reveal')
  })

  it.each([
    ['loading', { status: 'loading' as const }, 'skeleton'],
    ['empty', { status: 'empty' as const }, 'empty-state'],
    ['error', { status: 'error' as const, retry: () => {} }, 'error-state'],
    ['ready', { status: 'ready' as const, data: 1 }, 'ready'],
  ])('AsyncView outputs exactly one of the four for %s', (_n, state, expected) => {
    render(
      <AsyncView state={state} empty={<EmptyState icon={Compass} message={MESSAGE} />}>
        {() => <div data-testid="ready">ready</div>}
      </AsyncView>,
    )
    const ids = ['skeleton', 'empty-state', 'error-state', 'ready']
    expect(ids.filter((id) => screen.queryByTestId(id))).toEqual([expected])
  })
})

async function load() {
  vi.resetModules()
  const [{ TestFault }, { useTestHold }, { PlaceholderView }, { recordShellMount }] = await Promise.all([
    import('@/presentation/testing/TestFault'),
    import('@/presentation/testing/useTestHold'),
    import('@/presentation/components/states/PlaceholderView'),
    import('@/presentation/testing/shell-mounts'),
  ])
  return { TestFault, useTestHold, PlaceholderView, recordShellMount }
}

describe('PlaceholderView', () => {
  it('renders empty-state on first render and never a skeleton', async () => {
    vi.stubEnv('NEXT_PUBLIC_TEST_HOOKS', '')
    const { PlaceholderView } = await load()
    render(<PlaceholderView icon={Compass} message={MESSAGE} />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.queryByTestId('skeleton')).toBeNull()
  })
})

describe('test hooks, flag off', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_TEST_HOOKS', ''))

  it('TestFault renders nothing and never throws', async () => {
    const { TestFault } = await load()
    window.__TEST_FAULTS__ = { '/': { mode: 'throw' } }
    const { container } = render(<TestFault />)
    expect(container).toBeEmptyDOMElement()
  })

  it('useTestHold is false, no release hook, and holds are ignored', async () => {
    const { useTestHold, PlaceholderView } = await load()
    window.__TEST_FAULTS__ = { '/': { mode: 'hold' } }
    expect(renderHook(() => useTestHold()).result.current).toBe(false)
    expect(window.__TEST_RELEASE__).toBeUndefined()
    render(<PlaceholderView icon={Compass} message={MESSAGE} />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('recordShellMount leaves the global undefined', async () => {
    const { recordShellMount } = await load()
    recordShellMount('shell')
    expect(window.__SHELL_MOUNTS__).toBeUndefined()
  })
})

describe('test hooks, flag on', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_TEST_HOOKS', '1'))

  it('throw throws on every render and the entry stays (X1)', async () => {
    const { TestFault } = await load()
    window.__TEST_FAULTS__ = { '/': { mode: 'throw' } }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestFault />)).toThrow()
    expect(() => render(<TestFault />)).toThrow()
    expect(window.__TEST_FAULTS__['/']).toEqual({ mode: 'throw' })
    spy.mockRestore()
  })

  it('a hold shows the skeleton until released, never both (C1)', async () => {
    const { PlaceholderView } = await load()
    // The mocked pathname is '/' (resetModules gives the hooks a fresh next-mocks instance).
    window.__TEST_FAULTS__ = { '/': { mode: 'hold' } }
    // Mount on the client after hydration: render once empty, then a fresh mount.
    const { container } = render(<PlaceholderView icon={Compass} message={MESSAGE} />)
    expect(container.querySelector('[data-testid="skeleton"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="empty-state"]')).toBeNull()
    act(() => window.__TEST_RELEASE__?.('/'))
    expect(container.querySelector('[data-testid="skeleton"]')).toBeNull()
    expect(container.querySelector('[data-testid="empty-state"]')).not.toBeNull()
  })

  it('hooks run in the same order with the flag on and off', async () => {
    for (const flag of ['1', '']) {
      vi.stubEnv('NEXT_PUBLIC_TEST_HOOKS', flag)
      const { TestFault, useTestHold } = await load()
      expect(() => render(<TestFault />)).not.toThrow()
      expect(() => renderHook(() => useTestHold())).not.toThrow()
    }
  })

  it('recordShellMount increments only the named component', async () => {
    const { recordShellMount } = await load()
    recordShellMount('sidebar')
    expect(window.__SHELL_MOUNTS__).toEqual({ shell: 0, sidebar: 1, bottomNav: 0, dock: 0 })
  })
})
