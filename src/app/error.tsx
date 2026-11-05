'use client'

import { useEffect } from 'react'
import { focusHeadingAfterRetry } from '@/presentation/lib/focus-after-retry'
import { ErrorState } from '@/presentation/components/states/ErrorState'

/**
 * Page-level boundary (FR-036): the shell stays. Details are logged to the console
 * for developers and never shown in the UI (FR-038).
 */
export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  const onRetry = () => {
    focusHeadingAfterRetry()
    retry()
  }
  return <ErrorState onRetry={onRetry} />
}
