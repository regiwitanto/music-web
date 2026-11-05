import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerDock } from '@/presentation/components/shell/PlayerDock'

describe('PlayerDock (FR-016, FR-017; ui-shell.md §4)', () => {
  it('is the Player region showing "Nothing playing"', () => {
    render(<PlayerDock />)
    const dock = screen.getByRole('region', { name: 'Player' })
    expect(dock.tagName).toBe('SECTION')
    expect(dock).toHaveAttribute('data-testid', 'player-dock')
    expect(dock).toHaveTextContent('Nothing playing')
  })

  it('has no focusable or interactive descendants', () => {
    render(<PlayerDock />)
    const dock = screen.getByTestId('player-dock')
    expect(dock.querySelectorAll('a,button,input,select,textarea,[tabindex]')).toHaveLength(0)
  })
})
