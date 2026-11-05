import { Skeleton } from '@/presentation/components/ui/skeleton'

/**
 * Loading placeholder shaped like a destination page. The whole block, including its
 * "Loading" status text for assistive technology, stays hidden for the first 150 ms
 * (the `reveal` animation delay, R9), so fast loads never flash or announce it.
 */
export function DelayedSkeleton() {
  return (
    <div data-testid="skeleton" role="status" aria-busy="true" className="skeleton-reveal flex flex-col gap-4 py-8">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}
