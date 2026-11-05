import Link from 'next/link'
import type { Destination } from '@/domain/navigation'
import { TestFault } from '@/presentation/testing/TestFault'

/**
 * The placeholder for a reserved nested address (FR-012; ui-shell.md §6). Its parent
 * destination stays current in the navigation; content arrives with features 004,
 * 005 and 010.
 */
export function NothingHereYet({ destination }: { destination: Destination }) {
  return (
    <div data-testid="nothing-here-yet" className="flex flex-col items-start gap-3">
      <h1 tabIndex={-1}>Nothing here yet</h1>
      <TestFault />
      <p className="text-body text-muted">This part of {destination.label} isn&apos;t available yet.</p>
      <Link
        href={destination.href}
        className="text-body-strong text-accent underline underline-offset-4 hover:no-underline"
      >
        Go to {destination.label}
      </Link>
    </div>
  )
}
