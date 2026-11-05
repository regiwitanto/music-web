import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppearancePreference } from '@/domain/appearance'
import { InMemoryAppearanceRepository } from '@/test/fakes/InMemoryAppearanceRepository'

async function setup(initial: AppearancePreference = { theme: 'system', accent: 'violet' }) {
  document.documentElement.setAttribute('data-theme', initial.theme)
  document.documentElement.setAttribute('data-accent', initial.accent)
  vi.resetModules()
  const { configureContainer } = await import('@/application/container')
  const { HtmlDocumentThemeTarget } = await import('@/infrastructure/platform/document-theme')
  const repo = new InMemoryAppearanceRepository(initial)
  const saved: AppearancePreference[] = []
  const origSave = repo.save.bind(repo)
  repo.save = (p) => {
    saved.push({ ...p })
    origSave(p)
  }
  configureContainer({ appearance: repo, themeTarget: new HtmlDocumentThemeTarget() })
  const { AppearanceSettings } = await import('@/presentation/components/settings/AppearanceSettings')
  const view = render(<AppearanceSettings />)
  return { saved, view }
}

describe('AppearanceSettings (theme.md §5)', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-accent')
  })

  it('has the heading, both groups, the radios and no Save button', async () => {
    await setup()
    expect(screen.getByRole('heading', { level: 2, name: 'Appearance' })).toBeInTheDocument()
    const theme = screen.getByRole('group', { name: 'Theme' })
    expect(within(theme).getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual([
      'System',
      'Light',
      'Dark',
      'OLED Black',
    ])
    const accent = screen.getByRole('group', { name: 'Accent' })
    expect(within(accent).getAllByRole('radio')).toHaveLength(8)
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull()
  })

  it('marks options with data attributes and hides the swatches', async () => {
    const { view } = await setup()
    expect(view.container.querySelectorAll('[data-option-theme]')).toHaveLength(4)
    expect(view.container.querySelectorAll('[data-option-accent]')).toHaveLength(8)
    for (const swatch of view.container.querySelectorAll('.appearance-swatch')) {
      expect(swatch).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('starts with the radios matching <html>', async () => {
    await setup({ theme: 'oled', accent: 'teal' })
    expect(screen.getByRole('radio', { name: 'OLED Black' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Teal' })).toBeChecked()
  })

  it('applies a click to <html> inside the event and saves', async () => {
    const user = userEvent.setup()
    const { saved } = await setup({ theme: 'system', accent: 'blue' })
    const dark = screen.getByRole('radio', { name: 'Dark' })
    dark.addEventListener('change', () => {
      expect(document.documentElement.dataset.theme).toBe('dark')
    })
    await user.click(dark)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(dark).toBeChecked()
    expect(saved).toEqual([{ theme: 'dark', accent: 'blue' }])
  })

  it('moves the selection with arrow keys and applies it immediately', async () => {
    const user = userEvent.setup()
    await setup({ theme: 'system', accent: 'violet' })
    screen.getByRole('radio', { name: 'System' }).focus()
    await user.keyboard('{ArrowDown}')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked()
  })

  it('emits the selection script right after the fieldsets', async () => {
    const { view } = await setup()
    const script = view.container.querySelector('script')
    expect(script?.textContent).toContain('querySelectorAll')
    expect(script?.previousElementSibling?.tagName).toBe('FIELDSET')
    expect(view.container.querySelectorAll('fieldset')).toHaveLength(2)
  })
})
