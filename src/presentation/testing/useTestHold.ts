'use client'

import { usePathname } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
const noopSubscribe = () => () => {}
const liveSubscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const hasHoldFor = (key: string) => window.__TEST_FAULTS__?.[key]?.mode === 'hold'

if (process.env.NEXT_PUBLIC_TEST_HOOKS === '1' && typeof window !== 'undefined') {
  window.__TEST_RELEASE__ = (key: string) => {
    if (window.__TEST_FAULTS__) delete window.__TEST_FAULTS__[key]
    listeners.forEach((l) => l())
  }
}

declare global {
  interface Window {
    __TEST_RELEASE__?: (key: string) => void
  }
}

/**
 * Test-only: true while a `hold` fault exists for the current path, on a client-side
 * mount only (never during hydration). Always false in normal builds. No timers (C1).
 */
export function useTestHold(): boolean {
  const pathname = usePathname()
  const clientRender = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const [clientMount] = useState(() => clientRender)
  const flag = process.env.NEXT_PUBLIC_TEST_HOOKS === '1'
  const held = useSyncExternalStore(
    flag ? liveSubscribe : noopSubscribe,
    flag ? () => hasHoldFor(pathname) : () => false,
    () => false,
  )
  return flag && clientMount && held
}
