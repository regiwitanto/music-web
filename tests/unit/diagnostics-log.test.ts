import { describe, expect, it } from 'vitest'
import { RingDiagnosticsLog } from '@/infrastructure/persistence/diagnostics-log'
import { FixedClock } from '@/test/fakes/FixedClock'

const entry = (n: number) => ({ kind: 'invalid-row' as const, table: 'likes', key: `k${n}`, reason: `reason ${n}` })

describe('RingDiagnosticsLog (research R6)', () => {
  it('keeps entries in insertion order and stamps them from the injected clock', () => {
    const clock = new FixedClock(100)
    const log = new RingDiagnosticsLog(clock)
    log.record(entry(1))
    clock.advance(50)
    log.record(entry(2))
    expect(log.entries().map((e) => [e.key, e.at])).toEqual([
      ['k1', 100],
      ['k2', 150],
    ])
  })

  it('drops the oldest entries beyond 200', () => {
    const log = new RingDiagnosticsLog(new FixedClock())
    for (let i = 1; i <= 205; i += 1) log.record(entry(i))
    const entries = log.entries()
    expect(entries).toHaveLength(200)
    expect(entries[0]?.key).toBe('k6')
    expect(entries.at(-1)?.key).toBe('k205')
  })

  it('honours a smaller capacity', () => {
    const log = new RingDiagnosticsLog(new FixedClock(), 2)
    for (let i = 1; i <= 3; i += 1) log.record(entry(i))
    expect(log.entries().map((e) => e.key)).toEqual(['k2', 'k3'])
  })

  it('returns a snapshot: changing it does not change the log', () => {
    const log = new RingDiagnosticsLog(new FixedClock())
    log.record(entry(1))
    const snapshot = log.entries() as unknown[]
    snapshot.length = 0
    expect(log.entries()).toHaveLength(1)
  })
})
