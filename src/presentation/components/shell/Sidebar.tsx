'use client'

import { Disc3, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useEffect } from 'react'
import { APP_DISPLAY_NAME, DESTINATIONS } from '@/application/shell'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/ui/tooltip'
import { cn } from '@/presentation/lib/cn'
import { recordShellMount } from '@/presentation/testing/shell-mounts'
import { NavItem } from './NavItem'

type SidebarProps = {
  /** Desktop (≥ 1024 px) collapse state, owned by AppShell. Not persisted. */
  collapsed: boolean
  onToggle: () => void
}

/**
 * Sidebar navigation for ≥ 768 px (FR-004, FR-005, FR-007; ui-shell.md §2).
 * Hidden with display:none below 768 px, so only one navigation landmark is
 * exposed at any width. Contains only the public name and the four destinations.
 */
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const toggleLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar'

  // Test-only mount counter (ui-shell.md §7.1); a no-op in normal builds.
  useEffect(() => recordShellMount('sidebar'), [])

  return (
    <nav
      aria-label="Main"
      data-testid="sidebar"
      data-nav="sidebar"
      className="fixed inset-y-0 left-0 z-30 hidden w-(--sidebar-w) flex-col gap-4 border-r border-divider bg-surface px-3 py-4 md:flex"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex h-10 min-w-0 items-center gap-3 px-3 text-text',
              'max-lg:justify-center max-lg:px-0',
              collapsed && 'justify-center px-0',
            )}
          >
            <Disc3 aria-hidden="true" className="size-6 shrink-0" strokeWidth={1.75} />
            <span className={cn('truncate text-title-3', collapsed ? 'sr-only' : 'max-lg:sr-only')}>
              {APP_DISPLAY_NAME}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className={cn('[@media(hover:none)]:hidden', !collapsed && 'lg:hidden')}>
          {APP_DISPLAY_NAME}
        </TooltipContent>
      </Tooltip>

      <ul className="flex flex-col gap-1">
        {DESTINATIONS.map((destination) => (
          <li key={destination.id}>
            <NavItem destination={destination} variant="sidebar" collapsed={collapsed} />
          </li>
        ))}
      </ul>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={toggleLabel}
            className={cn(
              'mt-auto hidden size-10 items-center justify-center rounded-sm text-muted transition-colors duration-(--motion-fast) hover:bg-text/6 hover:text-text lg:inline-flex',
              collapsed ? 'self-center' : 'self-start',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-5" strokeWidth={1.75} />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-5" strokeWidth={1.75} />
            )}
          </button>
        </TooltipTrigger>
        {/* Icon-only in both states, so the tooltip shows in both (FR-031). */}
        <TooltipContent side="right" className="[@media(hover:none)]:hidden">
          {toggleLabel}
        </TooltipContent>
      </Tooltip>
    </nav>
  )
}
