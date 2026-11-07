import type { IdGenerator } from '@/application/ports'

/** Predictable ids: `id-1`, `id-2`, ... Never imported by app code (lint-enforced). */
export class SequentialIds implements IdGenerator {
  private next = 1

  uuid(): string {
    return `id-${this.next++}`
  }
}
