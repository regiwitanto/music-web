import type { ReactNode } from 'react'
import type { AsyncViewState } from '@/domain/async-view'
import { DelayedSkeleton } from './DelayedSkeleton'
import { ErrorState } from './ErrorState'

type AsyncViewProps<T> = {
  state: AsyncViewState<T>
  /** Rendered for `empty` (an `EmptyState`). */
  empty: ReactNode
  /** Rendered for `ready`. */
  children: (data: T) => ReactNode
}

/** Exactly one of skeleton, empty, error or ready content is output (FR-035). */
export function AsyncView<T>({ state, empty, children }: AsyncViewProps<T>) {
  switch (state.status) {
    case 'loading':
      return <DelayedSkeleton />
    case 'empty':
      return <>{empty}</>
    case 'error':
      return <ErrorState onRetry={state.retry} />
    case 'ready':
      return <>{children(state.data)}</>
  }
}
