import type { Clock } from '@/application/ports'

/** A Clock that only moves when the test says so. Never imported by app code (lint-enforced). */
export class FixedClock implements Clock {
  constructor(public current = 1_000) {}

  now(): number {
    return this.current
  }

  advance(ms: number): void {
    this.current += ms
  }
}
