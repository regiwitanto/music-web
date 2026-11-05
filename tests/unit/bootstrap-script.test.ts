import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { ACCENTS, buildThemeBootstrapScript, THEMES } from '@/domain/appearance'

type Run = { attributes: Record<string, string>; setItemCalls: number; setAttributeCalls: string[] }

function run(stored: string | null | (() => string | null)): Run {
  const attributes: Record<string, string> = { 'data-theme': 'system', 'data-accent': 'violet' }
  const setAttributeCalls: string[] = []
  let setItemCalls = 0
  const sandbox = {
    localStorage: {
      getItem: (key: string) => {
        expect(key).toBe('mp.appearance')
        return typeof stored === 'function' ? stored() : stored
      },
      setItem: () => {
        setItemCalls += 1
      },
    },
    document: {
      documentElement: {
        setAttribute: (name: string, value: string) => {
          setAttributeCalls.push(name)
          attributes[name] = value
        },
        getAttribute: (name: string) => attributes[name] ?? null,
      },
    },
  }
  runInNewContext(buildThemeBootstrapScript(), sandbox)
  return { attributes, setItemCalls, setAttributeCalls }
}

const json = (theme: unknown, accent: unknown) => JSON.stringify({ v: 1, theme, accent })

describe('buildThemeBootstrapScript (theme.md §3)', () => {
  it.each(THEMES.flatMap((t) => ACCENTS.map((a) => [t, a] as const)))('applies a stored %s + %s', (theme, accent) => {
    const { attributes } = run(json(theme, accent))
    expect(attributes).toEqual({ 'data-theme': theme, 'data-accent': accent })
  })

  it('leaves an invalid theme untouched but applies a valid accent, and vice versa', () => {
    expect(run(json('neon', 'teal')).attributes).toEqual({ 'data-theme': 'system', 'data-accent': 'teal' })
    expect(run(json('dark', 'pink')).attributes).toEqual({ 'data-theme': 'dark', 'data-accent': 'violet' })
  })

  it.each([
    ['corrupt JSON', 'not json'],
    ['a missing key', null],
    ['a wrong version', JSON.stringify({ v: 2, theme: 'dark', accent: 'teal' })],
    ['a non-object', '"dark"'],
  ])('keeps the server defaults for %s', (_label, raw) => {
    expect(run(raw).attributes).toEqual({ 'data-theme': 'system', 'data-accent': 'violet' })
  })

  it('does not throw when storage throws', () => {
    const result = run(() => {
      throw new Error('blocked')
    })
    expect(result.attributes).toEqual({ 'data-theme': 'system', 'data-accent': 'violet' })
  })

  it('never writes storage and touches only data-theme and data-accent', () => {
    const { setItemCalls, setAttributeCalls } = run(json('oled', 'red'))
    expect(setItemCalls).toBe(0)
    expect(new Set(setAttributeCalls)).toEqual(new Set(['data-theme', 'data-accent']))
  })

  it('is a self-contained ES5 IIFE that embeds the allowed lists', () => {
    const script = buildThemeBootstrapScript()
    expect(script).not.toMatch(/\bimport\b|=>|\blet\b|\bconst\b/)
    expect(script.trim().startsWith('(function')).toBe(true)
    for (const value of [...THEMES, ...ACCENTS]) expect(script).toContain(`"${value}"`)
  })
})
