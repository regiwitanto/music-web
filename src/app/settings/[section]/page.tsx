import type { Metadata } from 'next'
import { DESTINATIONS } from '@/application/shell'
import { NothingHereYet } from '@/presentation/components/states/NothingHereYet'

// MVP only (decision D-001-2, open item O7): any single segment is reserved and
// shows this placeholder. Features 010 and 009 must restrict it to the Settings
// sections that actually exist; every other segment must then show Not Found.

// Reserved nested address (FR-012; routes.md §2). It reads no params and does no data
// access; content for this route arrives with a later feature.
export const metadata: Metadata = { title: 'Nothing here yet — Settings' }

export default function ReservedPage() {
  return <NothingHereYet destination={DESTINATIONS[3]} />
}
