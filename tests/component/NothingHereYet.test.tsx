import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DESTINATIONS } from '@/application/shell'
import { NothingHereYet } from '@/presentation/components/states/NothingHereYet'

vi.mock('next/link', async () => (await import('./next-mocks')).linkMock)

const [, explore, library, settings] = DESTINATIONS

describe('NothingHereYet (FR-012; ui-shell.md §6)', () => {
  it.each([explore, library, settings])('links back to the $label root', (destination) => {
    render(<NothingHereYet destination={destination} />)
    const heading = screen.getByRole('heading', { level: 1, name: 'Nothing here yet' })
    expect(heading).toHaveAttribute('tabindex', '-1')
    expect(screen.getByText(`This part of ${destination.label} isn't available yet.`)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: `Go to ${destination.label}` })).toHaveAttribute('href', destination.href)
    expect(screen.getByTestId('nothing-here-yet')).toContainElement(heading)
  })
})
