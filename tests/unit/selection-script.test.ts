import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { ACCENTS, buildAppearanceSelectionScript, THEMES } from '@/domain/appearance'

type Input = { name: string; value: string; checked: boolean }

function run(attrs: Record<string, string | null>, opts: { throwQuery?: boolean } = {}) {
  const inputs: Input[] = [
    ...THEMES.map((value) => ({ name: 'theme', value, checked: false })),
    ...ACCENTS.map((value) => ({ name: 'accent', value, checked: false })),
  ]
  const setAttributeCalls: string[] = []
  const sandbox = {
    document: {
      documentElement: {
        getAttribute: (n: string) => attrs[n] ?? null,
        setAttribute: (n: string) => setAttributeCalls.push(n),
      },
      querySelectorAll: () => {
        if (opts.throwQuery) throw new Error('boom')
        return inputs
      },
    },
  }
  runInNewContext(buildAppearanceSelectionScript(), sandbox)
  const checked = (name: string) => inputs.filter((i) => i.name === name && i.checked).map((i) => i.value)
  return { theme: checked('theme'), accent: checked('accent'), setAttributeCalls }
}

describe('buildAppearanceSelectionScript (T12, R15)', () => {
  it.each(THEMES.flatMap((t) => ACCENTS.map((a) => [t, a] as const)))('checks %s + %s', (t, a) => {
    const r = run({ 'data-theme': t, 'data-accent': a })
    expect(r.theme).toEqual([t])
    expect(r.accent).toEqual([a])
  })

  it('falls back to System + Violet for missing or invalid attributes', () => {
    for (const attrs of [{}, { 'data-theme': 'neon', 'data-accent': 'pink' }]) {
      const r = run(attrs)
      expect(r.theme).toEqual(['system'])
      expect(r.accent).toEqual(['violet'])
    }
  })

  it('does not throw when the query throws', () => {
    expect(() => run({}, { throwQuery: true })).not.toThrow()
  })

  it('never writes attributes and is ES5', () => {
    expect(run({}).setAttributeCalls).toEqual([])
    const text = buildAppearanceSelectionScript()
    expect(text).not.toMatch(/=>|\blet\b|\bconst\b/)
  })
})
