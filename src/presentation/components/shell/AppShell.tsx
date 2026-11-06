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

type NavKind = 'sidebar' | 'bottom'

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

  // Breakpoint focus handoff (R3): when the element holding focus becomes hidden by a
  // breakpoint, move focus to the current (or first) item of the navigation that is still
  // visible. Two breakpoints hide things: 768 px swaps the sidebar and the bottom nav, and
  // 1024 px hides the sidebar's collapse toggle (the sidebar itself stays).
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const isLarge = useMediaQuery('(min-width: 1024px)')
  const previousLayout = useRef({ isDesktop, isLarge })

  // Some engines (seen in Chromium, Firefox and WebKit) drop focus to <body> as soon as CSS
  // hides the focused element, before the breakpoint change reaches the effect below. Record
  // that case: a focusout with no new target from a nav element that has no layout box any
  // more. Any later focusin clears it, so a deliberate click elsewhere never triggers a
  // handoff, and the effect below clears it on every layout change.
  const focusLostToHiddenNav = useRef<NavKind | null>(null)
  useEffect(() => {
    const onFocusOut = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || event.relatedTarget !== null) return
      const kind = target.closest<HTMLElement>('[data-nav]')?.dataset.nav
      if ((kind === 'sidebar' || kind === 'bottom') && target.getClientRects().length === 0) {
        focusLostToHiddenNav.current = kind
      }
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
    const previous = previousLayout.current
    if (previous.isDesktop === isDesktop && previous.isLarge === isLarge) return
    previousLayout.current = { isDesktop, isLarge }
    const lostTo = focusLostToHiddenNav.current
    focusLostToHiddenNav.current = null

    let hiddenKind: NavKind
    let visibleKind: NavKind
    if (previous.isDesktop !== isDesktop) {
      hiddenKind = isDesktop ? 'bottom' : 'sidebar'
      visibleKind = isDesktop ? 'sidebar' : 'bottom'
    } else if (!isLarge) {
      // Below 1024 px only the sidebar's collapse toggle goes away; the sidebar stays.
      hiddenKind = 'sidebar'
      visibleKind = 'sidebar'
    } else {
      return
    }
    const hidden = document.querySelector<HTMLElement>(`[data-nav="${hiddenKind}"]`)
    const visible = document.querySelector<HTMLElement>(`[data-nav="${visibleKind}"]`)
    const active = document.activeElement
    const onBody = active === null || active === document.body
    // Focus stayed on an element CSS has hidden, or the engine already moved it to <body>.
    const focusHidden = !onBody && !!hidden?.contains(active) && active.getClientRects().length === 0
    if (!hidden || !visible || !(focusHidden || (lostTo === hiddenKind && onBody))) return
    const target = visible.querySelector<HTMLElement>('a[aria-current="page"]') ?? visible.querySelector<HTMLElement>('a')
    target?.focus()
  }, [isDesktop, isLarge])

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
