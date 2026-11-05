'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/presentation/components/ui/button'

/**
 * Contained page failure (FR-036, FR-038): plain copy and a Retry action. It never
 * renders error details. It moves focus to its h1 on mount, because the content that
 * held focus was just replaced and RouteFocus only reacts to pathname changes (FR-028).
 */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])

  return (
    <div data-testid="error-state" className="flex flex-col items-start gap-3">
      <h1 ref={heading} tabIndex={-1}>
        Something went wrong
      </h1>
      <p className="text-body text-muted">This page couldn&apos;t be shown.</p>
      <Button type="button" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}
