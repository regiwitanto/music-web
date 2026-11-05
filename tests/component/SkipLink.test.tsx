import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SkipLink } from '@/presentation/components/shell/SkipLink'

describe('SkipLink (FR-026)', () => {
  it('is a link to #main with the skip-link class', () => {
    render(<SkipLink />)
    const link = screen.getByRole('link', { name: 'Skip to content' })
    expect(link).toHaveAttribute('href', '#main')
    expect(link).toHaveClass('skip-link')
  })

  it('moves focus to main#main on activation', async () => {
    const user = userEvent.setup()
    render(
      <>
        <SkipLink />
        <main id="main" tabIndex={-1}>
          content
        </main>
      </>,
    )
    await user.click(screen.getByRole('link', { name: 'Skip to content' }))
    expect(document.activeElement).toBe(document.getElementById('main'))
  })

  it('has no "Skip to player" link', () => {
    render(<SkipLink />)
    expect(screen.queryByRole('link', { name: /skip to player/i })).toBeNull()
  })
})
