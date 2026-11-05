import type { Metadata } from 'next'
import Link from 'next/link'
import { pageTitle } from '@/application/shell'

// The root not-found page shares the root layout's segment, where `title.template`
// does not apply, so the full title is set explicitly (data-model §4).
export const metadata: Metadata = { title: { absolute: pageTitle('Page not found') } }

/**
 * In-shell Not Found (FR-012; routes.md §3). It renders inside the root layout, so
 * the shell stays usable. classifyPath returns `unknown`, so no navigation item is
 * marked current (D-001-1).
 */
export default function NotFound() {
  return (
    <div data-testid="not-found" className="flex flex-col items-start gap-3">
      <h1 tabIndex={-1}>Page not found</h1>
      <p className="text-body text-muted">We couldn&apos;t find that page.</p>
      <Link href="/" className="text-body-strong text-accent underline underline-offset-4 hover:no-underline">
        Go to Home
      </Link>
    </div>
  )
}
