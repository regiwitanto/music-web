import { afterEach, describe, expect, it, vi } from 'vitest'
import { APPEARANCE_STORAGE_KEY, DEFAULT_APPEARANCE, serializeAppearance } from '@/domain/appearance'
import { LocalStorageAppearanceRepository } from '@/infrastructure/platform/appearance-storage'

/*
 * Repository-level suite for the 001 appearance adapter (G8; contracts/theme.md §1;
 * spec edge cases "theme storage unavailable" and "unknown or corrupt stored value").
 */

/** A minimal Storage stand-in. `fail` makes every call throw, as blocked storage does. */
function fakeStorage(initial: Record<string, string> = {}, fail: { get?: boolean; set?: boolean } = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key: string) => {
      if (fail.get) throw new DOMException('blocked', 'SecurityError')
      return data.get(key) ?? null
    },
    setItem: (key: string, value: string) => {
      if (fail.set) throw new DOMException('full', 'QuotaExceededError')
      data.set(key, value)
    },
  }
}

function useStorage(storage: ReturnType<typeof fakeStorage>) {
  vi.stubGlobal('window', { localStorage: storage })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LocalStorageAppearanceRepository', () => {
  it('returns the defaults when nothing is stored', () => {
    useStorage(fakeStorage())
    expect(new LocalStorageAppearanceRepository().load()).toEqual(DEFAULT_APPEARANCE)
  })

  it('round-trips a saved preference under the documented key', () => {
    const storage = fakeStorage()
    useStorage(storage)
    const repo = new LocalStorageAppearanceRepository()
    repo.save({ theme: 'oled', accent: 'teal' })
    expect(storage.data.has(APPEARANCE_STORAGE_KEY)).toBe(true)
    expect(repo.load()).toEqual({ theme: 'oled', accent: 'teal' })
  })

  it('falls back to the defaults for a corrupt stored value', () => {
    useStorage(fakeStorage({ [APPEARANCE_STORAGE_KEY]: '{not json' }))
    expect(new LocalStorageAppearanceRepository().load()).toEqual(DEFAULT_APPEARANCE)
  })

  it('ignores an unknown theme or accent field but keeps the valid one', () => {
    // Start from a correctly versioned record so only the field validation is exercised.
    const valid = JSON.parse(serializeAppearance({ theme: 'dark', accent: 'amber' }))
    useStorage(fakeStorage({ [APPEARANCE_STORAGE_KEY]: JSON.stringify({ ...valid, accent: 'pink' }) }))
    expect(new LocalStorageAppearanceRepository().load()).toEqual({ theme: 'dark', accent: DEFAULT_APPEARANCE.accent })
    useStorage(fakeStorage({ [APPEARANCE_STORAGE_KEY]: JSON.stringify({ ...valid, theme: 'neon' }) }))
    expect(new LocalStorageAppearanceRepository().load()).toEqual({ theme: DEFAULT_APPEARANCE.theme, accent: 'amber' })
  })

  it('falls back to the defaults for a record with another storage version', () => {
    const valid = JSON.parse(serializeAppearance({ theme: 'dark', accent: 'amber' }))
    useStorage(fakeStorage({ [APPEARANCE_STORAGE_KEY]: JSON.stringify({ ...valid, v: -1 }) }))
    expect(new LocalStorageAppearanceRepository().load()).toEqual(DEFAULT_APPEARANCE)
  })

  it('returns the defaults, without throwing, when reading storage throws', () => {
    useStorage(fakeStorage({}, { get: true }))
    expect(new LocalStorageAppearanceRepository().load()).toEqual(DEFAULT_APPEARANCE)
  })

  it('does not throw when writing storage throws', () => {
    useStorage(fakeStorage({}, { set: true }))
    expect(() => new LocalStorageAppearanceRepository().save({ theme: 'dark', accent: 'red' })).not.toThrow()
  })

  it('returns a fresh object, so callers cannot mutate the frozen defaults', () => {
    useStorage(fakeStorage({}, { get: true }))
    const loaded = new LocalStorageAppearanceRepository().load()
    expect(loaded).not.toBe(DEFAULT_APPEARANCE)
    expect(Object.isFrozen(loaded)).toBe(false)
  })
})
