'use client'

import { usePathname } from 'next/navigation'

export type TestFaultEntry = { mode: 'throw' } | { mode: 'hold' }

declare global {
  interface Window {
    __TEST_FAULTS__?: Record<string, TestFaultEntry>
  }
}

/**
 * Test-only fault injection (ui-shell.md §7; research R10). Present only in a build
 * made with NEXT_PUBLIC_TEST_HOOKS=1; otherwise it renders nothing. `shell` targets the reserved shell-level key (quickstart V20). A `throw` entry
 * throws on every render while it exists; the test clears it. `hold` is ignored here.
 */
export function TestFault({ shell = false }: { shell?: boolean }) {
  const pathname = usePathname()
  if (process.env.NEXT_PUBLIC_TEST_HOOKS === '1') {
    // The reserved shell key lives only inside this branch, so a normal build drops it.
    const key = shell ? '__shell__' : pathname
    if (typeof window !== 'undefined' && window.__TEST_FAULTS__?.[key]?.mode === 'throw') {
      throw new Error('Injected test fault')
    }
  }
  return null
}
