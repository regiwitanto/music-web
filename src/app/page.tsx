import { House } from 'lucide-react'
import type { Metadata } from 'next'
import { pageTitle } from '@/application/shell'
import { EmptyState } from '@/presentation/components/states/EmptyState'

// The root page shares the root layout's segment, where `title.template` does not
// apply, so the full title is set explicitly (data-model §4).
export const metadata: Metadata = { title: { absolute: pageTitle('Home') } }

export default function HomePage() {
  return (
    <>
      <h1 tabIndex={-1}>Home</h1>
      <EmptyState icon={House} message="Your personal mixes and recent music will appear here." />
    </>
  )
}
