/**
 * Entity identity (architecture §5; provider-contract §3). Every entity ID is namespaced by
 * its provider. IDs are opaque everywhere except the provider registry, which is why the one
 * helper here only reads the prefix, for the derived `providerId` column of stored tracks.
 */

export type ProviderId = 'mock' | 'local' | 'sample' | (string & {})
export type EntityId = `${ProviderId}:${string}`

/** The part of an id before its first colon. */
export function providerIdOf(id: EntityId): string {
  return id.slice(0, id.indexOf(':'))
}
