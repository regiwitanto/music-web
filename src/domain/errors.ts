/**
 * Storage failures (architecture §11; 002 data-model §2). Only these three failure modes are
 * storage errors. Programming errors are not wrapped in a StorageError (002 research R7).
 */

export type StorageErrorKind = 'UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'VERSION_CONFLICT'
export type StorageErrorReason = 'newer-version' | 'blocked' | 'closed-by-upgrade'

export class StorageError extends Error {
  readonly kind: StorageErrorKind
  readonly reason: StorageErrorReason | undefined

  constructor(kind: StorageErrorKind, options: { reason?: StorageErrorReason; cause?: unknown } = {}) {
    super(`Storage error: ${kind}`, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'StorageError'
    this.kind = kind
    this.reason = options.reason
  }
}
