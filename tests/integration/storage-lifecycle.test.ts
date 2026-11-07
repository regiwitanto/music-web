import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStorageLifecycle } from '@/application/storage-lifecycle'
import { createStorageStatusStore } from '@/application/stores/storage-status'
import type { EntityId } from '@/domain/ids'
import { StorageError } from '@/domain/errors'
import { MpDatabase } from '@/infrastructure/persistence/database'
import { DexieStorage } from '@/infrastructure/persistence/dexie-storage'
import { RingDiagnosticsLog } from '@/infrastructure/persistence/diagnostics-log'
import type { Migration } from '@/infrastructure/persistence/migrations'
import { MemoryStorage } from '@/infrastructure/persistence/memory-storage'
import { type DatabaseEvent, type OpenableStorage, ResilientStorage } from '@/infrastructure/persistence/resilient-storage'
import { FixedClock } from '@/test/fakes/FixedClock'

/*
 * Lifecycle: opening the store, falling back to memory, and the status the listener sees
 * (002 contracts/storage-ports.md §4–§5; research R7; FR-016, FR-017, FR-019). Every test builds
 * fresh instances; none shares module state. The US3 cases (blocked, upgraded or deleted
 * elsewhere, newer data) are added by T037.
 */

const trk = (n: number) => `mock:trk_${n}` as EntityId
const named = (name: string) => Object.assign(new Error(name), { name })

/**
 * A primary store that behaves like MemoryStorage but fails on demand: errors queued in
 * `failures` are thrown, one per repository call, then it works again. `open` is a spy.
 */
function flakyPrimary(openError?: Error) {
  const base = new MemoryStorage()
  const failures: Error[] = []
  const open = vi.fn(async () => {
    if (openError) throw openError
  })
  // A call held until the test releases it, then failing: an operation in flight during a switch.
  const holds: Array<{ error: Error; gate: Promise<void> }> = []
  const listeners = new Set<(event: DatabaseEvent) => void>()
  const wrap = <T extends object>(target: T): T =>
    new Proxy(target, {
      get(object, property) {
        const value = Reflect.get(object, property)
        if (typeof value !== 'function' || String(property).startsWith('watch')) return value
        return (...args: unknown[]) => {
          const held = holds.shift()
          if (held) return held.gate.then(() => Promise.reject(held.error))
          const failure = failures.shift()
          return failure ? Promise.reject(failure) : (value as (...a: unknown[]) => unknown).apply(object, args)
        }
      },
    })
  const primary: OpenableStorage = {
    likes: wrap(base.likes),
    playlists: wrap(base.playlists),
    libraryItems: wrap(base.libraryItems),
    snapshots: wrap(base.snapshots),
    recentSearches: wrap(base.recentSearches),
    unitOfWork: wrap(base.unitOfWork),
    open,
    onDatabaseEvent: (listener) => {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
  const emitDatabaseEvent = (event: DatabaseEvent) => listeners.forEach((listener) => listener(event))
  /** Holds the next primary call; releasing it makes that call fail with `error`. */
  const hold = (error: Error) => {
    let release: () => void = () => {}
    holds.push({ error, gate: new Promise<void>((resolve) => (release = resolve)) })
    return () => release()
  }
  /** How many held calls have not yet reached the primary. */
  const pendingHolds = () => holds.length
  return { primary, base, failures, open, emitDatabaseEvent, hold, pendingHolds }
}

function build(openError?: Error) {
  const flaky = flakyPrimary(openError)
  const diagnostics = new RingDiagnosticsLog(new FixedClock())
  const resilient = new ResilientStorage({ primary: flaky.primary, fallback: () => new MemoryStorage(), diagnostics })
  const status = createStorageStatusStore()
  const lifecycle = createStorageLifecycle({ lifecycle: resilient, status })
  return { ...flaky, resilient, diagnostics, status, lifecycle }
}

describe('opening the store', () => {
  it('reports ready when the primary opens', async () => {
    const { lifecycle, status, open } = build()
    await lifecycle.start()
    expect(open).toHaveBeenCalledTimes(1)
    expect(status.getState()).toMatchObject({ phase: 'ready', notice: null })
  })

  it('starts normally and shows the unavailable notice when the primary cannot be opened', async () => {
    const { lifecycle, status, resilient, diagnostics } = build(named('MissingAPIError'))
    await expect(lifecycle.start()).resolves.toBeUndefined()
    expect(status.getState()).toMatchObject({ phase: 'unavailable', notice: 'unavailable' })
    // It works in memory: a like saved now is readable, and it is not in the primary.
    await resilient.likes.add(trk(1), 10)
    expect(await resilient.likes.list()).toEqual([{ trackId: 'mock:trk_1', likedAt: 10 }])
    expect(diagnostics.entries().some((e) => e.kind === 'storage-error')).toBe(true)
  })

  it('treats any failure to open as unavailable, even one that is not a storage error', async () => {
    const { lifecycle, status } = build(new TypeError('bug while opening'))
    await expect(lifecycle.start()).resolves.toBeUndefined()
    expect(status.getState()).toMatchObject({ phase: 'unavailable', notice: 'unavailable' })
  })

  it('opens once when start is called twice on one lifecycle instance (StrictMode)', async () => {
    const { lifecycle, open } = build()
    await Promise.all([lifecycle.start(), lifecycle.start()])
    await lifecycle.start()
    expect(open).toHaveBeenCalledTimes(1)
  })
})

describe('losing the store mid-session', () => {
  it('switches to memory, sets the unavailable notice, and retries the call against memory', async () => {
    const { lifecycle, status, resilient, failures, base } = build()
    await lifecycle.start()
    await resilient.likes.add(trk(1), 10) // on the primary
    failures.push(named('DatabaseClosedError'))

    await resilient.likes.add(trk(2), 20) // fails on the primary, succeeds on memory
    expect(status.getState()).toMatchObject({ phase: 'unavailable', notice: 'unavailable' })
    // Data already on the device is not copied into memory (session-only data).
    expect((await resilient.likes.list()).map((l) => l.trackId)).toEqual(['mock:trk_2'])
    // The primary was never written again.
    expect((await base.likes.list()).map((l) => l.trackId)).toEqual(['mock:trk_1'])
  })

  it('re-attaches an existing subscription to the memory backend', async () => {
    const { lifecycle, resilient, failures } = build()
    await lifecycle.start()
    await resilient.likes.add(trk(1), 10)
    const seen: string[][] = []
    resilient.likes.watchList().subscribe((likes) => seen.push(likes.map((l) => l.trackId)))
    await vi.waitFor(() => expect(seen.at(-1)).toEqual(['mock:trk_1']))

    failures.push(named('InvalidStateError'))
    await resilient.likes.add(trk(2), 20)
    await vi.waitFor(() => expect(seen.at(-1)).toEqual(['mock:trk_2']))
    expect(seen.flat()).not.toContain('mock:trk_3')
  })

  it('switches at most once: a later failure is retried on the same memory backend and keeps its writes', async () => {
    const { lifecycle, status, resilient, failures } = build()
    await lifecycle.start()
    failures.push(named('DatabaseClosedError'))
    await resilient.likes.add(trk(1), 10) // first switch
    await resilient.likes.add(trk(2), 20)
    failures.push(named('DatabaseClosedError'))
    // The fallback has no failure queue of its own, so this call must simply succeed and keep earlier writes.
    await resilient.likes.add(trk(3), 30)
    expect((await resilient.likes.list()).map((l) => l.trackId).sort()).toEqual(['mock:trk_1', 'mock:trk_2', 'mock:trk_3'])
    expect(status.getState()).toMatchObject({ phase: 'unavailable', notice: 'unavailable' })
  })
})

describe('failures that are not "unavailable"', () => {
  it('reports a full store to the caller as QUOTA_EXCEEDED, without switching and without partial data', async () => {
    const { lifecycle, status, resilient, failures } = build()
    await lifecycle.start()
    failures.push(named('QuotaExceededError'))
    await expect(resilient.likes.add(trk(1), 10)).rejects.toMatchObject({ name: 'StorageError', kind: 'QUOTA_EXCEEDED' })
    expect(status.getState()).toMatchObject({ phase: 'ready', notice: null })
    expect(await resilient.likes.list()).toEqual([]) // nothing half-written, and it still uses the primary
  })

  it('rethrows a programming error unchanged and does not switch', async () => {
    const { lifecycle, status, resilient, failures } = build()
    await lifecycle.start()
    const bug = named('ConstraintError')
    failures.push(bug)
    await expect(resilient.likes.add(trk(1), 10)).rejects.toBe(bug)
    expect(status.getState()).toMatchObject({ phase: 'ready', notice: null })
  })

  it('exposes StorageError as the error type of a reported failure', async () => {
    const { lifecycle, resilient, failures } = build()
    await lifecycle.start()
    failures.push(named('QuotaExceededError'))
    await expect(resilient.snapshots.putTracks([])).rejects.toBeInstanceOf(StorageError)
  })
})


/* ---------- US3: other tabs, deletion and newer data (B-T8; FR-022, FR-023) ---------- */

const V2: Migration[] = [{ version: 2, destructive: false, stores: { tags: 'id' }, upgrade: () => {} }]
const dbNames: string[] = []
let dbCounter = 0
const nextDbName = () => {
  dbCounter += 1
  const name = `lifecycle-test-${dbCounter}`
  dbNames.push(name)
  return name
}

afterEach(async () => {
  for (const name of dbNames.splice(0)) await MpDatabase.delete(name)
})

/** The real stack over fake-indexeddb: Dexie, the facade, a fresh status store and lifecycle. */
function realStack(name: string, migrations?: readonly Migration[]) {
  const clock = new FixedClock()
  const diagnostics = new RingDiagnosticsLog(clock)
  const db = new MpDatabase(name, migrations)
  const primary = new DexieStorage(db, { diagnostics, clock })
  const resilient = new ResilientStorage({ primary, fallback: () => new MemoryStorage(), diagnostics })
  const status = createStorageStatusStore()
  const lifecycle = createStorageLifecycle({ lifecycle: resilient, status })
  const events: string[] = []
  resilient.onEvent((event) => events.push(event.type))
  return { db, resilient, status, lifecycle, events, diagnostics }
}

const rawVersion = (name: string) =>
  new Promise<number>((resolve, reject) => {
    const request = indexedDB.open(name)
    request.onsuccess = () => {
      const version = request.result.version
      request.result.close()
      resolve(version)
    }
    request.onerror = () => reject(request.error)
  })

describe('another tab blocks an upgrade (FR-022)', () => {
  it('shows blocked-upgrade while the open waits, and clears it once the other tab lets go', async () => {
    const name = nextDbName()
    // "Another tab" holds version 1 open and refuses to close when asked.
    const holder = new MpDatabase(name)
    holder.on('versionchange', () => false)
    await holder.open()

    const { status, lifecycle } = realStack(name, V2)
    const started = lifecycle.start()
    await vi.waitFor(() => expect(status.getState()).toMatchObject({ phase: 'opening', notice: 'blocked-upgrade' }))

    holder.close()
    await started
    expect(status.getState()).toMatchObject({ phase: 'ready', notice: null })
  })
})

describe('an older tab is told to stop (FR-022)', () => {
  it('closes, shows stale-tab, and writes only to memory afterwards', async () => {
    const name = nextDbName()
    const older = realStack(name)
    await older.lifecycle.start()
    await older.resilient.likes.add(trk(1), 10)

    // A newer tab upgrades the database.
    const newer = new MpDatabase(name, V2)
    await newer.open()
    await vi.waitFor(() => expect(older.status.getState()).toMatchObject({ phase: 'unavailable', notice: 'stale-tab' }))
    expect(older.events).toEqual(['upgraded-elsewhere'])

    await older.resilient.likes.add(trk(2), 20) // memory only
    expect((await older.resilient.likes.list()).map((l) => l.trackId)).toEqual(['mock:trk_2'])
    expect((await newer.table('likes').toArray()).map((row) => row.trackId)).toEqual(['mock:trk_1'])
    newer.close()
  })
})

describe('the database is deleted elsewhere', () => {
  it('shows the unavailable notice, not stale-tab, and writes only to memory', async () => {
    const name = nextDbName()
    const tab = realStack(name)
    await tab.lifecycle.start()
    await tab.resilient.likes.add(trk(1), 10)

    await Dexie.delete(name) // for example a future "reset all data" in another tab
    await vi.waitFor(() => expect(tab.status.getState()).toMatchObject({ phase: 'unavailable', notice: 'unavailable' }))
    expect(tab.events).toEqual(['deleted-elsewhere'])

    await tab.resilient.likes.add(trk(2), 20)
    expect((await tab.resilient.likes.list()).map((l) => l.trackId)).toEqual(['mock:trk_2'])
    expect(await Dexie.exists(name)).toBe(false) // nothing was written back
  })
})

describe('an operation in flight during a switch', () => {
  it('keeps the first notice, does not switch again, and keeps the memory writes', async () => {
    const { primary, hold, emitDatabaseEvent, pendingHolds } = flakyPrimary()
    const diagnostics = new RingDiagnosticsLog(new FixedClock())
    const resilient = new ResilientStorage({ primary, fallback: () => new MemoryStorage(), diagnostics })
    const status = createStorageStatusStore()
    const lifecycle = createStorageLifecycle({ lifecycle: resilient, status })
    const events: string[] = []
    resilient.onEvent((event) => events.push(event.type))
    await lifecycle.start()

    const release = hold(named('DatabaseClosedError'))
    const inFlight = resilient.likes.list() // started on the primary, waiting
    await vi.waitFor(() => expect(pendingHolds()).toBe(0)) // it has really reached the primary
    emitDatabaseEvent('upgraded-elsewhere') // another tab upgraded: switch to memory
    await resilient.likes.add(trk(1), 10) // written to memory
    release() // the in-flight call now fails on the closed primary

    expect((await inFlight).map((l) => l.trackId)).toEqual(['mock:trk_1']) // retried on memory
    expect(status.getState()).toMatchObject({ phase: 'unavailable', notice: 'stale-tab' })
    expect(events).toEqual(['upgraded-elsewhere']) // no 'lost': there was no second switch
    expect(diagnostics.entries().filter((e) => e.kind === 'storage-error')).toHaveLength(1)
  })
})

describe('data written by a newer version (FR-023)', () => {
  it('leaves the database untouched, works in memory, and shows the newer-version notice', async () => {
    const name = nextDbName()
    const future = new Dexie(name)
    future.version(5).stores({ likes: 'trackId, likedAt' })
    await future.open()
    await future.table('likes').put({ trackId: 'mock:trk_9', likedAt: 1 })
    future.close()
    const before = await rawVersion(name)

    const { status, lifecycle, resilient } = realStack(name)
    await lifecycle.start()
    expect(status.getState()).toMatchObject({ phase: 'unavailable', notice: 'newer-version' })

    await resilient.likes.add(trk(1), 10)
    expect((await resilient.likes.list()).map((l) => l.trackId)).toEqual(['mock:trk_1'])

    expect(await rawVersion(name)).toBe(before) // not downgraded and not upgraded
    const reopened = new Dexie(name)
    await reopened.open()
    expect((await reopened.table('likes').toArray()).map((row) => row.trackId)).toEqual(['mock:trk_9'])
    reopened.close()
  })
})

/* ---------- review findings: use before the store has opened, and watcher hand-over ---------- */

describe('using the store before it has finished opening (review: the newer-data guard must not be bypassable)', () => {
  it('never lets Dexie auto-open a newer database: an early call works in memory and leaves the database untouched', async () => {
    const name = nextDbName()
    const future = new Dexie(name)
    future.version(5).stores({ likes: 'trackId, likedAt' })
    await future.open()
    await future.table('likes').put({ trackId: 'mock:trk_9', likedAt: 1 })
    future.close()
    const before = await rawVersion(name)

    const { resilient, status, lifecycle } = realStack(name)
    // A child component's effect can run before the shell's effect that starts the store.
    await resilient.likes.add(trk(1), 10)
    expect((await resilient.likes.list()).map((l) => l.trackId)).toEqual(['mock:trk_1'])
    expect(await rawVersion(name)).toBe(before)

    await lifecycle.start()
    expect(status.getState()).toMatchObject({ phase: 'unavailable', notice: 'newer-version' })
    expect(await rawVersion(name)).toBe(before)
  })

  it('opens once however many early calls and starts there are', async () => {
    const { resilient, lifecycle, open } = build()
    await Promise.all([resilient.likes.list(), resilient.likes.list(), lifecycle.start()])
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('a subscription made before the store opens delivers once it has, and can be cancelled before that', async () => {
    const { resilient, lifecycle } = build()
    const delivered: number[] = []
    const cancelled: number[] = []
    resilient.likes.watchList().subscribe((likes) => delivered.push(likes.length))
    resilient.likes.watchList().subscribe((likes) => cancelled.push(likes.length))()
    await lifecycle.start()
    await vi.waitFor(() => expect(delivered).toEqual([0]))
    expect(cancelled).toEqual([])
  })
})

describe('a watcher around a switch to memory', () => {
  /** A primary whose likes watch reports UNAVAILABLE synchronously while subscribing. */
  function erroringWatchPrimary() {
    const base = new MemoryStorage()
    const unsubscribed = vi.fn()
    const primary: OpenableStorage = {
      likes: {
        ...base.likes,
        watchList: () => ({
          subscribe: (_next, error) => {
            error?.(new StorageError('UNAVAILABLE'))
            return unsubscribed
          },
        }),
      },
      playlists: base.playlists,
      libraryItems: base.libraryItems,
      snapshots: base.snapshots,
      recentSearches: base.recentSearches,
      unitOfWork: base.unitOfWork,
      open: async () => {},
    }
    return { primary, unsubscribed }
  }

  it('drops the failed subscription, keeps the memory one, and cancels the memory one when the caller does', async () => {
    const { primary, unsubscribed } = erroringWatchPrimary()
    const resilient = new ResilientStorage({
      primary,
      fallback: () => new MemoryStorage(),
      diagnostics: new RingDiagnosticsLog(new FixedClock()),
    })
    await resilient.start()
    const seen: number[] = []
    const stop = resilient.likes.watchList().subscribe((likes) => seen.push(likes.length))
    await vi.waitFor(() => expect(seen.at(-1)).toBe(0))
    expect(unsubscribed).toHaveBeenCalled() // the failed primary subscription was dropped

    await resilient.likes.add(trk(1), 10)
    await vi.waitFor(() => expect(seen.at(-1)).toBe(1))
    stop()
    const count = seen.length
    await resilient.likes.add(trk(2), 20)
    expect(await resilient.likes.list()).toHaveLength(2)
    expect(seen.length).toBe(count) // nothing is delivered after the caller cancelled
  })
})
