import type { Clock, IdGenerator } from '@/application/ports'

/** The real clock and id source. Tests use the fakes in src/test/fakes instead. */
export class SystemClock implements Clock {
  now(): number {
    return Date.now()
  }
}

export class CryptoIdGenerator implements IdGenerator {
  uuid(): string {
    return crypto.randomUUID()
  }
}
