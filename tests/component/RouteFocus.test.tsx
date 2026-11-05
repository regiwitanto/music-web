import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouteFocus } from '@/presentation/components/shell/RouteFocus'
import { resetMocks, setPathname } from './next-mocks'

vi.mock('next/navigation', async () => (await import('./next-mocks')).navigationMock)

function Page() {
  return (
    <>
      <RouteFocus />
      <main id="main" tabIndex={-1}>
        <h1 tabIndex={-1}>Title</h1>
      </main>
    </>
  )
}

describe('RouteFocus (FR-028; ui-shell.md §5)', () => {
  beforeEach(() => resetMocks())

  it('does not move focus on the first render', () => {
    render(<Page />)
    expect(document.activeElement).toBe(document.body)
  })

  it('focuses main h1 after the pathname changes', () => {
    const { rerender } = render(<Page />)
    setPathname('/explore')
    rerender(<Page />)
    expect(document.activeElement).toBe(document.querySelector('main h1'))
  })
})
