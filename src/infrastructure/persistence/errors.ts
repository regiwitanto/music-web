import { StorageError } from '@/domain/errors'

/**
 * Maps what Dexie or the browser raises to the three storage failure modes (architecture §11;
 * 002 research R7). Anything else is a programming error: it returns null, and the caller
 * rethrows the original error unchanged so a bug is never mistaken for "storage unavailable".
 */

const UNAVAILABLE_NAMES = new Set([
  'OpenFailedError',
  'DatabaseClosedError',
  'SecurityError',
  'InvalidStateError',
  'UnknownError',
  'MissingAPIError',
])

function nameOf(value: unknown): string | null {
  return typeof value === 'object' && value !== null && typeof (value as { name?: unknown }).name === 'string'
    ? (value as { name: string }).name
    : null
}

/** The error and the errors it wraps (Dexie keeps the browser's error in `inner`). */
function* chain(error: unknown): Generator<unknown> {
  let current: unknown = error
  for (let depth = 0; depth < 4 && current !== undefined && current !== null; depth += 1) {
    yield current
    current = typeof current === 'object' ? (current as { inner?: unknown }).inner : undefined
  }
}

export function toStorageError(error: unknown): StorageError | null {
  if (error instanceof StorageError) return error
  const names = [...chain(error)].map(nameOf)
  // The specific kinds win over a generic wrapper: Dexie may wrap the browser's VersionError
  // in an OpenFailedError, and that is newer data (FR-023), not "unavailable".
  if (names.includes('VersionError')) return new StorageError('VERSION_CONFLICT', { reason: 'newer-version', cause: error })
  if (names.includes('QuotaExceededError')) return new StorageError('QUOTA_EXCEEDED', { cause: error })
  if (names.some((name) => name !== null && UNAVAILABLE_NAMES.has(name))) return new StorageError('UNAVAILABLE', { cause: error })
  return null
}
