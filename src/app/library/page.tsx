import { Library } from 'lucide-react'
import type { Metadata } from 'next'
import { PlaceholderView } from '@/presentation/components/states/PlaceholderView'
import { TestFault } from '@/presentation/testing/TestFault'

export const metadata: Metadata = { title: 'Library' }

export default function LibraryPage() {
  return (
    <>
      <h1 tabIndex={-1}>Library</h1>
      <TestFault />
      <PlaceholderView icon={Library} message="Songs, albums, artists and playlists you save will appear here." />
    </>
  )
}
