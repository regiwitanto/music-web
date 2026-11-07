import { describe, expect, it } from 'vitest'
import { findDestructive, MIGRATIONS, type Migration } from '@/infrastructure/persistence/migrations'

/*
 * The upgrade guard (FR-020, FR-021; 002 research R8): no destructive upgrade may ship until
 * export exists (feature 010), and the registry is well formed.
 */

const migration = (version: number, destructive: boolean): Migration => ({
  version,
  destructive,
  stores: {},
  upgrade: () => {},
})

describe('findDestructive', () => {
  it('returns only the entries marked destructive', () => {
    const entries = [migration(2, false), migration(3, true), migration(4, false)]
    expect(findDestructive(entries).map((m) => m.version)).toEqual([3])
  })

  it('returns nothing for an empty registry', () => {
    expect(findDestructive([])).toEqual([])
  })
})

describe('the real registry', () => {
  it('has no destructive migration (FR-021: not allowed until export exists in feature 010)', () => {
    expect(findDestructive(MIGRATIONS)).toEqual([])
  })

  it('starts at version 2 and increases strictly (version 1 is the first schema)', () => {
    MIGRATIONS.forEach((entry, index) => {
      expect(entry.version).toBe(index + 2)
    })
  })
})
