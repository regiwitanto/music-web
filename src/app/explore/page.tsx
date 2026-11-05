import { Compass } from 'lucide-react'
import type { Metadata } from 'next'
import { PlaceholderView } from '@/presentation/components/states/PlaceholderView'
import { TestFault } from '@/presentation/testing/TestFault'

export const metadata: Metadata = { title: 'Explore' }

export default function ExplorePage() {
  return (
    <>
      <h1 tabIndex={-1}>Explore</h1>
      <TestFault />
      <PlaceholderView icon={Compass} message="Search and browse music here." />
    </>
  )
}
