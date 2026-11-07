import { LocalStorageObsoleteDataCleaner } from '@/infrastructure/platform/obsolete-data'
import type { ObsoleteDataCleaner } from './ports'

/**
 * Wires infrastructure to the application ports. The only application file allowed
 * to import infrastructure (research R12). Implementations are created lazily, on
 * first use, so the server never touches browser globals.
 */
export interface Container {
  readonly obsoleteData: ObsoleteDataCleaner
}

const overrides: Partial<{ -readonly [K in keyof Container]: Container[K] }> = {}
let obsoleteDataInstance: ObsoleteDataCleaner | undefined

export const container: Container = {
  get obsoleteData() {
    return overrides.obsoleteData ?? (obsoleteDataInstance ??= new LocalStorageObsoleteDataCleaner())
  },
}

/** Tests only: replace one or more implementations. */
export function configureContainer(next: Partial<Container>): void {
  if (next.obsoleteData) overrides.obsoleteData = next.obsoleteData
}
