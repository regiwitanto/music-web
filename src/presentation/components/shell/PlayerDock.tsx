'use client'

import { useEffect } from 'react'
import { recordShellMount } from '@/presentation/testing/shell-mounts'

/**
 * The idle player dock (FR-016, FR-017; ui-shell.md §4). Fixed along the bottom,
 * offset past the sidebar, hidden below 768 px while idle, and with no focusable
 * descendants. Feature 008 replaces the content, not the mount point.
 */
export function PlayerDock() {
  // Test-only mount counter (ui-shell.md §7.1); a no-op in normal builds.
  useEffect(() => recordShellMount('dock'), [])

  return (
    <section
      aria-label="Player"
      data-testid="player-dock"
      className="fixed right-0 bottom-0 left-(--sidebar-w) z-20 hidden h-[calc(var(--dock-h)+var(--safe-bottom))] items-center border-t border-divider bg-surface px-6 pb-(--safe-bottom) md:flex"
    >
      <p className="text-body text-muted">Nothing playing</p>
    </section>
  )
}
