import { describe, expect, it } from 'vitest'
import { StorageError } from '@/domain/errors'

describe('StorageError (data-model §2)', () => {
  it('is an Error and a StorageError named StorageError', () => {
    const error = new StorageError('UNAVAILABLE')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(StorageError)
    expect(error.name).toBe('StorageError')
  })

  it('carries its kind, reason and cause', () => {
    const cause = new Error('boom')
    const error = new StorageError('VERSION_CONFLICT', { reason: 'newer-version', cause })
    expect(error.kind).toBe('VERSION_CONFLICT')
    expect(error.reason).toBe('newer-version')
    expect(error.cause).toBe(cause)
  })

  it('has no reason or cause unless given', () => {
    const error = new StorageError('QUOTA_EXCEEDED')
    expect(error.kind).toBe('QUOTA_EXCEEDED')
    expect(error.reason).toBeUndefined()
    expect(error.cause).toBeUndefined()
  })
})
