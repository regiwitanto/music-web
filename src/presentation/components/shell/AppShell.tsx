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

  // Some engines (seen in Chromium) drop focus to <body> as soon as CSS hides the
  // focused nav item, before the breakpoint change reaches the effect below. Record
  // that case: a focusout with no new target from an element that has no layout box
  // any more. Any later focusin clears it, so a deliberate click elsewhere never
  // triggers a handoff.
  const focusLostToHiddenNav = useRef<string | null>(null)
  useEffect(() => {
    const onFocusOut = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || event.relatedTarget !== null) return
      const nav = target.closest<HTMLElement>('[data-nav]')
      if (nav && target.getClientRects().length === 0) focusLostToHiddenNav.current = nav.dataset.nav ?? null
    }
    const onFocusIn = () => {
      focusLostToHiddenNav.current = null
    }
    document.addEventListener('focusout', onFocusOut, true)
    document.addEventListener('focusin', onFocusIn, true)
    return () => {
      document.removeEventListener('focusout', onFocusOut, true)
      document.removeEventListener('focusin', onFocusIn, true)
    }
  }, [])

  useEffect(() => {
    if (previousDesktop.current === isDesktop) return
    previousDesktop.current = isDesktop
    const hiddenKind = isDesktop ? 'bottom' : 'sidebar'
    const hidden = document.querySelector<HTMLElement>(`[data-nav="${hiddenKind}"]`)
    const visible = document.querySelector<HTMLElement>(`[data-nav="${isDesktop ? 'sidebar' : 'bottom'}"]`)
    const lostToHiding = focusLostToHiddenNav.current === hiddenKind
      && (document.activeElement === null || document.activeElement === document.body)
    focusLostToHiddenNav.current = null
    if (!hidden || !visible || !(hidden.contains(document.activeElement) || lostToHiding)) return
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
