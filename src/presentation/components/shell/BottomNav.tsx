'use client'

import { useEffect } from 'react'
import { DESTINATIONS } from '@/application/shell'
import { recordShellMount } from '@/presentation/testing/shell-mounts'
import { NavItem } from './NavItem'

/**
 * Bottom navigation below 768 px (FR-003; ui-shell.md §2). Fixed to the bottom
 * edge above the safe-area inset; hidden with display:none at ≥ 768 px. It comes
 * before <main> in the DOM so the tab order is skip link → navigation → content.
 */
export function BottomNav() {
  // Test-only mount counter (ui-shell.md §7.1); a no-op in normal builds.
  useEffect(() => recordShellMount('bottomNav'), [])

  return (
    <nav
      aria-label="Main"
      data-testid="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-surface pb-(--safe-bottom) md:hidden"
    >
      <ul className="flex h-(--bottom-nav-h)">
        {DESTINATIONS.map((destination) => (
          <li key={destination.id} className="flex min-w-0 flex-1">
            <NavItem destination={destination} variant="bottom" />
          </li>
        ))}
      </ul>
    </nav>
  )
}
