import type { LucideIcon } from 'lucide-react'

/** A placeholder body: decorative icon plus one line of copy (ui-shell.md §6, FR-034). */
export function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div data-testid="empty-state" className="flex flex-col items-start gap-3 py-8 text-muted">
      <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
      <p className="text-body">{message}</p>
    </div>
  )
}
