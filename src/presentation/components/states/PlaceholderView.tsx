import type { LucideIcon } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { HoldGate } from './HoldGate'

/**
 * A destination's body for this feature: always empty, since there is no data yet.
 * `loading` appears only through the test hold (R9, X3); there is no Suspense.
 * Server-compatible, because pages pass an icon component: the client part
 * (HoldGate) receives the already-rendered EmptyState element.
 */
export function PlaceholderView({ icon, message }: { icon: LucideIcon; message: string }) {
  return <HoldGate empty={<EmptyState icon={icon} message={message} />} />
}
