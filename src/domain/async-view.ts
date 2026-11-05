/**
 * The four-state contract for any asynchronous content area
 * (spec FR-035; data-model §5; UX-AC-22). Exactly one state is shown at a time.
 */
export type AsyncViewState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; data: T }
