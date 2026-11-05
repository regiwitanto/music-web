'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { TooltipProvider } from '@/presentation/components/ui/tooltip'
import { cn } from '@/presentation/lib/cn'
import { recordShellMount } from '@/presentation/testing/shell-mounts'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { ThemeSync } from './ThemeSync'

/**
 * The persistent application shell, owned by the root layout so it never
 * unmounts on navigation (research R2; constitution IV). DOM order is fixed:
 * skip link → navigation → main → player dock (ui-shell.md §1).
 *
 * `--sidebar-w` is 72 px at 768–1023 px, and 240 px or 72 px at ≥ 1024 px
 * depending on the (non-persisted) collapse state (ui-shell.md §3).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Test-only mount counter (ui-shell.md §7.1); a no-op in normal builds.
  useEffect(() => recordShellMount('shell'), [])

  return (
    <TooltipProvider>
      <div
        data-testid="app-shell"
        data-sidebar={sidebarCollapsed ? 'collapsed' : 'expanded'}
        className={cn('[--sidebar-w:72px]', !sidebarCollapsed && 'lg:[--sidebar-w:240px]')}
      >
        <ThemeSync />
        {/* Skip link: added in US3 (T071, T074). */}
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
        <BottomNav />
        <main
          id="main"
          tabIndex={-1}
          className="pb-[calc(var(--bottom-nav-h)+var(--safe-bottom))] md:pb-0 md:pl-(--sidebar-w)"
        >
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">{children}</div>
        </main>
        {/* PlayerDock: added in US5 (T088, T089). */}
      </div>
    </TooltipProvider>
  )
}
