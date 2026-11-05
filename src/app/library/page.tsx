import { Library } from 'lucide-react'
import type { Metadata } from 'next'
import { EmptyState } from '@/presentation/components/states/EmptyState'

export const metadata: Metadata = { title: 'Library' }

export default function LibraryPage() {
  return (
    <>
      <h1 tabIndex={-1}>Library</h1>
      <EmptyState icon={Library} message="Songs, albums, artists and playlists you save will appear here." />
    </>
  )
}
