import { describe, expect, it } from 'vitest'
import { type EntityId, providerIdOf } from '@/domain/ids'

describe('providerIdOf (research R13)', () => {
  it.each([
    ['mock:trk_0042', 'mock'],
    ['local:sha1-ab12', 'local'],
    ['sample:night-drive', 'sample'],
  ] as Array<[EntityId, string]>)('%s belongs to %s', (id, provider) => {
    expect(providerIdOf(id)).toBe(provider)
  })

  it('uses the part before the first colon when the local id contains more colons', () => {
    expect(providerIdOf('mock:a:b')).toBe('mock')
  })
})
