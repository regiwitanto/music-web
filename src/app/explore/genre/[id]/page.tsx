import type { Metadata } from 'next'
import { DESTINATIONS } from '@/application/shell'
import { NothingHereYet } from '@/presentation/components/states/NothingHereYet'

// Reserved nested address (FR-012; routes.md §2). It reads no params and does no data
// access; content for this route arrives with a later feature.
export const metadata: Metadata = { title: 'Nothing here yet — Explore' }

export default function ReservedPage() {
  return <NothingHereYet destination={DESTINATIONS[1]} />
}
