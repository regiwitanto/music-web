import Dexie from 'dexie'
import { expect, it } from 'vitest'

/*
 * Environment sanity for the integration project (002 plan R9): fake-indexeddb provides
 * the global `indexedDB`, and Dexie can open, write, read and delete a database under it.
 */

it('opens, writes, reads and deletes a Dexie database under fake-indexeddb', async () => {
  const db = new Dexie('env-check')
  db.version(1).stores({ rows: 'id' })
  await db.table('rows').put({ id: 1, value: 'x' })
  expect(await db.table('rows').get(1)).toEqual({ id: 1, value: 'x' })
  db.close()
  await Dexie.delete('env-check')
  expect(await Dexie.exists('env-check')).toBe(false)
})
