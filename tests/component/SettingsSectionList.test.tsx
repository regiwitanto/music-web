import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SettingsSectionList } from '@/presentation/components/settings/SettingsSectionList'

/*
 * 014 contracts/settings-page.md §4, oracles S-T1 to S-T3 (D-014-1, FR-017).
 */

describe('SettingsSectionList', () => {
  it('lists the five sections in D-014-1 order, each marked Coming soon (S-T1)', () => {
    render(<SettingsSectionList />)
    const list = screen.getByRole('list', { name: 'Settings sections' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    const names = ['Playback', 'Storage', 'Library & Data', 'Accessibility', 'About']
    items.forEach((item, i) => {
      expect(item).toHaveTextContent(names[i] as string)
      expect(item).toHaveTextContent('Coming soon')
    })
  })

  it('has no focusable or interactive descendants (S-T2)', () => {
    const { container } = render(<SettingsSectionList />)
    expect(container.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0)
  })

  it('offers no appearance, theme or accent control or wording (S-T3)', () => {
    const { container } = render(<SettingsSectionList />)
    expect(container.querySelectorAll('fieldset, input[type="radio"]')).toHaveLength(0)
    expect(container.textContent).not.toMatch(/theme|accent|appearance/i)
  })
})
