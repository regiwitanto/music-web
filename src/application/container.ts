import { MpDatabase } from '@/infrastructure/persistence/database'
import { DexieStorage } from '@/infrastructure/persistence/dexie-storage'
import { RingDiagnosticsLog } from '@/infrastructure/persistence/diagnostics-log'
import { MemoryStorage } from '@/infrastructure/persistence/memory-storage'
import { ResilientStorage } from '@/infrastructure/persistence/resilient-storage'
import { LocalStorageObsoleteDataCleaner } from '@/infrastructure/platform/obsolete-data'
import { CryptoIdGenerator, SystemClock } from '@/infrastructure/persistence/system'
import type { Clock, DiagnosticsLog, IdGenerator, ObsoleteDataCleaner, Storage, StorageLifecycle } from './ports'

/**
 * Wires infrastructure to the application ports. The only application file allowed
 * to import infrastructure (research R12). Implementations are created lazily, on
 * first use, so the server never touches browser globals.
 */
export interface Container {
  readonly obsoleteData: ObsoleteDataCleaner
  readonly clock: Clock
  readonly ids: IdGenerator
  readonly diagnostics: DiagnosticsLog
  /** The one Storage for the whole session (the resilience facade). */
  readonly storage: Storage
  /** The same object as `storage`, seen through the lifecycle port. */
  readonly storageLifecycle: StorageLifecycle
}

const overrides: Partial<{ -readonly [K in keyof Container]: Container[K] }> = {}
let obsoleteDataInstance: ObsoleteDataCleaner | undefined
let clockInstance: Clock | undefined
let idsInstance: IdGenerator | undefined
let diagnosticsInstance: DiagnosticsLog | undefined
let resilientInstance: ResilientStorage | undefined

/** The real store with its session-only fallback; created on first use, on the client. */
function resilient(): ResilientStorage {
  return (resilientInstance ??= new ResilientStorage({
    primary: new DexieStorage(new MpDatabase(), { diagnostics: container.diagnostics, clock: container.clock }),
    fallback: () => new MemoryStorage(),
    diagnostics: container.diagnostics,
  }))
}

export const container: Container = {
  get obsoleteData() {
    return overrides.obsoleteData ?? (obsoleteDataInstance ??= new LocalStorageObsoleteDataCleaner())
  },
  get clock() {
    return overrides.clock ?? (clockInstance ??= new SystemClock())
  },
  get ids() {
    return overrides.ids ?? (idsInstance ??= new CryptoIdGenerator())
  },
  get diagnostics() {
    return overrides.diagnostics ?? (diagnosticsInstance ??= new RingDiagnosticsLog(container.clock))
  },
  get storage() {
    return overrides.storage ?? resilient()
  },
  get storageLifecycle() {
    return overrides.storageLifecycle ?? resilient()
  },
}

/** Tests only: replace one or more implementations. */
export function configureContainer(next: Partial<Container>): void {
  if (next.obsoleteData) overrides.obsoleteData = next.obsoleteData
  if (next.clock) overrides.clock = next.clock
  if (next.ids) overrides.ids = next.ids
  if (next.diagnostics) overrides.diagnostics = next.diagnostics
  if (next.storage) overrides.storage = next.storage
  if (next.storageLifecycle) overrides.storageLifecycle = next.storageLifecycle
}
