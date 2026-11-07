import type { Clock, DiagnosticsEntry, DiagnosticsLog } from '@/application/ports'

/**
 * The local record of storage problems (FR-013): the last `capacity` entries, in memory only
 * (002 research R6). Writing it into the store that is misbehaving would hide the failures it
 * reports, and an unbounded log would grow forever. Exporting it is feature 013.
 */
export class RingDiagnosticsLog implements DiagnosticsLog {
  private readonly items: DiagnosticsEntry[] = []

  constructor(
    private readonly clock: Clock,
    private readonly capacity = 200,
  ) {}

  record(entry: Omit<DiagnosticsEntry, 'at'>): void {
    this.items.push({ ...entry, at: this.clock.now() })
    if (this.items.length > this.capacity) this.items.splice(0, this.items.length - this.capacity)
  }

  entries(): readonly DiagnosticsEntry[] {
    return [...this.items]
  }
}
