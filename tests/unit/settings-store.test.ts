import { describe, expect, it } from 'vitest'
import type { DocumentThemeTarget } from '@/application/ports'
import { createSettingsStore } from '@/application/stores/settings'
import type { AppearancePreference } from '@/domain/appearance'
import { InMemoryAppearanceRepository } from '@/test/fakes/InMemoryAppearanceRepository'

/** A spy theme target that shares one call log with the repository. */
function setup(initialDom: AppearancePreference, stored: AppearancePreference = initialDom) {
  const log: string[] = []
  let dom = { ...initialDom }
  const themeTarget: DocumentThemeTarget = {
    read: () => ({ ...dom }),
    apply: (p) => {
      log.push(`apply:${p.theme}/${p.accent}`)
      dom = { ...p }
    },
  }
  const appearance = new InMemoryAppearanceRepository(stored, (call) => log.push(call))
  // `server: false` because the node test environment has no `document`.
  const store = createSettingsStore({ appearance, themeTarget }, { server: false })
  store.subscribe((state) => log.push(`set:${state.appearance?.theme}/${state.appearance?.accent}`))
  return { store, log, appearance, getDom: () => dom }
}

describe('createSettingsStore (contracts/modules.md; research R5, R6)', () => {
  it('holds no preference when created for the server (R15)', () => {
    const appearance = new InMemoryAppearanceRepository({ theme: 'dark', accent: 'teal' })
    const themeTarget: DocumentThemeTarget = {
      read: () => {
        throw new Error('the server must not read the document')
      },
      apply: () => {},
    }
    expect(createSettingsStore({ appearance, themeTarget }, { server: true }).getState().appearance).toBeNull()
  })

  it('starts from the theme target, not from storage', () => {
    const { store } = setup({ theme: 'dark', accent: 'teal' }, { theme: 'light', accent: 'red' })
    expect(store.getState().appearance).toEqual({ theme: 'dark', accent: 'teal' })
  })

  it('applies to the DOM, then saves, then updates the store, in that order', () => {
    const { store, log } = setup({ theme: 'system', accent: 'violet' })
    store.getState().setAppearance({ theme: 'dark' })
    expect(log).toEqual(['apply:dark/violet', 'save:dark/violet', 'set:dark/violet'])
    expect(store.getState().appearance).toEqual({ theme: 'dark', accent: 'violet' })
  })

  it('keeps working when saving fails', () => {
    const { store, appearance, getDom } = setup({ theme: 'system', accent: 'violet' })
    appearance.failOnSave = true
    expect(() => store.getState().setAppearance({ accent: 'teal' })).not.toThrow()
    expect(getDom()).toEqual({ theme: 'system', accent: 'teal' })
    expect(store.getState().appearance).toEqual({ theme: 'system', accent: 'teal' })
  })

  it('reconcile applies and sets only when the repository differs', () => {
    const same = setup({ theme: 'dark', accent: 'teal' })
    same.store.getState().reconcile()
    expect(same.log.filter((l) => !l.startsWith('load'))).toEqual([])

    const differs = setup({ theme: 'system', accent: 'violet' }, { theme: 'oled', accent: 'rose' })
    differs.store.getState().reconcile()
    expect(differs.log.filter((l) => !l.startsWith('load'))).toEqual(['apply:oled/rose', 'set:oled/rose'])
    expect(differs.getDom()).toEqual({ theme: 'oled', accent: 'rose' })
  })
})
