'use client'

import Link from 'next/link'
import type { MouseEvent } from 'react'
import { usePathname } from 'next/navigation'
import { activeDestination, classifyPath } from '@/application/shell'
import type { Destination } from '@/domain/navigation'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/ui/tooltip'
import { cn } from '@/presentation/lib/cn'
import { NAV_ICONS } from './nav-icons'

type NavItemProps = {
  destination: Destination
  variant: 'sidebar' | 'bottom'
  /** Sidebar only: the user collapsed the desktop sidebar to icons. */
  collapsed?: boolean
}

/**
 * One navigation link (ui-shell.md §2). The current item has aria-current="page",
 * the filled icon and the accent colour (FR-008). In the sidebar the label is
 * visually hidden whenever the item is icon-only (always at 768–1023 px, and at
 * ≥ 1024 px when collapsed), and a tooltip then shows it on hover devices (FR-031).
 */
export function NavItem({ destination, variant, collapsed = false }: NavItemProps) {
  const pathname = usePathname() ?? '/'
  const classification = classifyPath(pathname)
  const current = activeDestination(classification) === destination.id

  /**
   * Re-selecting the current destination (FR-010; research R8). On its root page:
   * scroll to the top (instantly under reduced motion) and never navigate or move
   * focus; already at the top, do nothing. On a nested page under it, the link
   * navigates to the root as usual.
   */
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (classification.kind !== 'root' || classification.destination !== destination.id) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (window.scrollY <= 0) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' })
  }
  const Icon = NAV_ICONS[destination.id]

  const icon = (
    <Icon aria-hidden="true" className="size-6 shrink-0" strokeWidth={1.75} fill={current ? 'currentColor' : 'none'} />
  )
  const currentProps = current ? ({ 'aria-current': 'page' } as const) : {}
  const tone = current ? 'text-accent' : 'text-muted hover:text-text'

  if (variant === 'bottom') {
    return (
      <Link
        href={destination.href}
        {...currentProps}
        onClick={onClick}
        className={cn(
          'flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-caption',
          tone,
        )}
      >
        {icon}
        <span className="max-w-full truncate">{destination.label}</span>
      </Link>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={destination.href}
          {...currentProps}
          onClick={onClick}
          className={cn(
            'flex h-10 w-full items-center gap-3 rounded-sm px-3 text-body-strong transition-[background-color] duration-(--motion-fast) ease-(--motion-fast-ease) hover:bg-text/6',
            'max-lg:justify-center max-lg:px-0',
            collapsed && 'justify-center px-0',
            tone,
          )}
        >
          {icon}
          <span className={cn('truncate', collapsed ? 'sr-only' : 'max-lg:sr-only')}>{destination.label}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className={cn('[@media(hover:none)]:hidden', !collapsed && 'lg:hidden')}>
        {destination.label}
      </TooltipContent>
    </Tooltip>
  )
}
