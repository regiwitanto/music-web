import { Compass } from 'lucide-react'
import type { Metadata } from 'next'
import { EmptyState } from '@/presentation/components/states/EmptyState'

export const metadata: Metadata = { title: 'Explore' }

export default function ExplorePage() {
  return (
    <>
      <h1 tabIndex={-1}>Explore</h1>
      <EmptyState icon={Compass} message="Search and browse music here." />
    </>
  )
}
