import { Compass, House, Library, type LucideIcon, Settings } from 'lucide-react'
import type { DestinationId } from '@/domain/navigation'

/**
 * Destination icons (design-system §7). The active state uses the same icon with
 * `fill="currentColor"`; the inactive state uses the outline (`fill="none"`).
 */
export const NAV_ICONS: Readonly<Record<DestinationId, LucideIcon>> = {
  home: House,
  explore: Compass,
  library: Library,
  settings: Settings,
}
