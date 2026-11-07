import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStorageStatusStore } from '@/application/stores/storage-status'
import { StorageBanner } from '@/presentation/components/shell/StorageBanner'

/*
 * Oracles B-T1 to B-T3 (002 contracts/storage-status.md §2–§4): the fixed texts, role="status",
 * nothing focusable, and nothing rendered without a notice.
 */

const NEUTRAL = "Storage is unavailable: your changes won't be saved."
const TEXTS = {
  unavailable: NEUTRAL,
  'newer-version': `${NEUTRAL} Data from a newer version of the app was found and has been left untouched.`,
  'blocked-upgrade':
    'A newer version is ready, but another tab is still open. Close the other tab or reload it to finish updating.',
  'stale-tab': 'This tab is out of date and has stopped saving. Reload this page to continue.',
} as const

const show = (phase: 'opening' | 'ready' | 'unavailable', notice: keyof typeof TEXTS | null) =>
  act(() => useStorageStatusStore.getState().set({ phase, notice }))

beforeEach(() => {
  act(() => useStorageStatusStore.getState().set({ phase: 'opening', notice: null }))
})

describe('StorageBanner (B-T1 to B-T3)', () => {
  it.each(Object.entries(TEXTS))('shows the fixed text for the %s notice in a status region (B-T1)', (notice, text) => {
    render(<StorageBanner />)
    show(notice === 'blocked-upgrade' ? 'opening' : 'unavailable', notice as keyof typeof TEXTS)
    const region = screen.getByRole('status')
    expect(region).toHaveTextContent(text)
    expect(region.textContent).toBe(text)
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('has no focusable descendants and no tabindex (B-T2)', () => {
    const { container } = render(<StorageBanner />)
    show('unavailable', 'newer-version')
    expect(container.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0)
    expect(screen.getByRole('status')).not.toHaveAttribute('tabindex')
  })

  it.each([
    ['opening', null],
    ['ready', null],
  ] as const)('shows nothing for phase %s without a notice, but keeps the empty live region (B-T3)', (phase, notice) => {
    render(<StorageBanner />)
    show(phase, notice)
    // The status region exists before any text does, so assistive technology registers it and
    // announces the text when it arrives (review finding; research R11). It is empty: no text, no box.
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('uses token utilities only, with the icon hidden from assistive technology', () => {
    const { container } = render(<StorageBanner />)
    show('unavailable', 'unavailable')
    const box = screen.getByRole('status').firstElementChild as HTMLElement
    for (const token of ['bg-surface', 'border-divider', 'text-text', 'rounded-md']) expect(box.className).toContain(token)
    expect(box.className).not.toMatch(/#[0-9a-f]{3,8}|rgb\(|\b(?:bg|text|border)-(?:red|blue|green|gray|white|black)/i)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps the same live region while the text appears and disappears, without reloading', () => {
    render(<StorageBanner />)
    const region = screen.getByRole('status')
    expect(region).toBeEmptyDOMElement()
    show('unavailable', 'unavailable')
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent(NEUTRAL)
    show('ready', null)
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toBeEmptyDOMElement()
  })
})
