'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Moves focus to the page's h1 after every client-side route change (FR-028).
 * It adds no live region: Next's built-in route announcer reads the new title
 * (D-001-3, R7). The first render is skipped so a fresh load keeps natural focus.
 */
export function RouteFocus() {
  const pathname = usePathname()
  const previous = useRef<string | null>(null)

  useEffect(() => {
    if (previous.current !== null && previous.current !== pathname) {
      document.querySelector<HTMLElement>('main h1')?.focus()
    }
    previous.current = pathname
  }, [pathname])

  return null
}
