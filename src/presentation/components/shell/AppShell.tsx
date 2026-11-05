'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '@/presentation/hooks/useMediaQuery'
import { TooltipProvider } from '@/presentation/components/ui/tooltip'
import { cn } from '@/presentation/lib/cn'
import { TestFault } from '@/presentation/testing/TestFault'
import { recordShellMount } from '@/presentation/testing/shell-mounts'
import { BottomNav } from './BottomNav'
import { PlayerDock } from './PlayerDock'
import { RouteFocus } from './RouteFocus'
import { Sidebar } from './Sidebar'
import { SkipLink } from './SkipLink'
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

  // Breakpoint focus handoff (R3): when the form holding focus becomes hidden,
  // move focus to the current (or first) item of the form that is now visible.
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const previousDesktop = useRef(isDesktop)
  useEffect(() => {
    if (previousDesktop.current === isDesktop) return
    previousDesktop.current = isDesktop
    const hidden = document.querySelector<HTMLElement>(`[data-nav="${isDesktop ? 'bottom' : 'sidebar'}"]`)
    const visible = document.querySelector<HTMLElement>(`[data-nav="${isDesktop ? 'sidebar' : 'bottom'}"]`)
    if (!hidden || !visible || !hidden.contains(document.activeElement)) return
    const target = visible.querySelector<HTMLElement>('a[aria-current="page"]') ?? visible.querySelector<HTMLElement>('a')
    target?.focus()
  }, [isDesktop])

  return (
    <TooltipProvider>
      <div
        data-testid="app-shell"
        data-sidebar={sidebarCollapsed ? 'collapsed' : 'expanded'}
        className={cn('[--sidebar-w:72px]', !sidebarCollapsed && 'lg:[--sidebar-w:240px]')}
      >
        <ThemeSync />
        <TestFault shell />
        <SkipLink />
        <RouteFocus />
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
        <BottomNav />
        <main
          id="main"
          tabIndex={-1}
          className="pb-[calc(var(--bottom-nav-h)+var(--safe-bottom))] md:pb-[calc(var(--dock-h)+var(--safe-bottom))] md:pl-(--sidebar-w)"
        >
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">{children}</div>
        </main>
        <PlayerDock />
      </div>
    </TooltipProvider>
  )
}
