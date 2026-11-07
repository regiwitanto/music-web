import { RingDiagnosticsLog } from '@/infrastructure/persistence/diagnostics-log'
import { MemoryStorage } from '@/infrastructure/persistence/memory-storage'
import { FixedClock } from '@/test/fakes/FixedClock'
import { defineStorageContract } from './storage-contract'

// The session-only fallback (FR-016) must behave exactly like the real store: same suite.
defineStorageContract('MemoryStorage', () => ({
  storage: new MemoryStorage(),
  diagnostics: new RingDiagnosticsLog(new FixedClock()),
  dispose: async () => {},
}))
