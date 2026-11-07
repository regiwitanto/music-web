import type { ObsoleteDataCleaner } from '@/application/ports'

/** Test fake for ObsoleteDataCleaner. Never imported by app code (lint-enforced). */
export class RecordingObsoleteDataCleaner implements ObsoleteDataCleaner {
  /** How many times removeObsoleteAppearance() was called. */
  calls = 0

  removeObsoleteAppearance(): void {
    this.calls += 1
  }
}
