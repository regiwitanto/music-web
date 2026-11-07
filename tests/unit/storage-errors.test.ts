import { describe, expect, it } from 'vitest'
import { StorageError } from '@/domain/errors'
import { toStorageError } from '@/infrastructure/persistence/errors'

/* Oracle P-T8: one case per row of the mapping table in 002 research R7. */

const named = (name: string, extra: object = {}) => Object.assign(new Error(name), { name, ...extra })

describe('toStorageError (P-T8)', () => {
  it('maps QuotaExceededError to QUOTA_EXCEEDED', () => {
    expect(toStorageError(named('QuotaExceededError'))?.kind).toBe('QUOTA_EXCEEDED')
  })

  it('maps VersionError to VERSION_CONFLICT with the reason newer-version', () => {
    const mapped = toStorageError(named('VersionError'))
    expect(mapped?.kind).toBe('VERSION_CONFLICT')
    expect(mapped?.reason).toBe('newer-version')
  })

  it.each(['OpenFailedError', 'DatabaseClosedError', 'SecurityError', 'InvalidStateError', 'UnknownError', 'MissingAPIError'])(
    'maps %s to UNAVAILABLE',
    (name) => {
      expect(toStorageError(named(name))?.kind).toBe('UNAVAILABLE')
    },
  )

  it('looks through a Dexie wrapper to its inner error', () => {
    expect(toStorageError(named('AbortError', { inner: named('QuotaExceededError') }))?.kind).toBe('QUOTA_EXCEEDED')
  })

  it('lets the more specific kind win over a generic outer wrapper', () => {
    // Dexie may report a too-old schema as OpenFailedError wrapping the browser's VersionError:
    // that is newer data (FR-023), not "unavailable".
    const mapped = toStorageError(named('OpenFailedError', { inner: named('VersionError') }))
    expect(mapped?.kind).toBe('VERSION_CONFLICT')
    expect(mapped?.reason).toBe('newer-version')
    expect(toStorageError(named('UnknownError', { inner: named('QuotaExceededError') }))?.kind).toBe('QUOTA_EXCEEDED')
  })

  it.each([
    ['ConstraintError', named('ConstraintError')],
    ['DataError', named('DataError')],
    ['TypeError', new TypeError('bug')],
    ['a non-error value', 'oops'],
  ])('returns null for %s: a programming error is not a storage error', (_label, error) => {
    expect(toStorageError(error)).toBeNull()
  })

  it('keeps the original error as the cause', () => {
    const original = named('UnknownError')
    expect(toStorageError(original)?.cause).toBe(original)
  })

  it('returns an existing StorageError unchanged', () => {
    const existing = new StorageError('UNAVAILABLE')
    expect(toStorageError(existing)).toBe(existing)
  })
})
