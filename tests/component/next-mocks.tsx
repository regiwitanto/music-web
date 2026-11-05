import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { vi } from 'vitest'

/**
 * Shared mocks for Next.js modules in component tests.
 * Usage in a test file (factories must import lazily, because vi.mock is hoisted):
 *   vi.mock('next/navigation', async () => (await import('./next-mocks')).navigationMock)
 *   vi.mock('next/link', async () => (await import('./next-mocks')).linkMock)
 *   setPathname('/library')
 */

let pathname = '/'

export function setPathname(next: string): void {
  pathname = next
}

export const navigationMock = {
  usePathname: () => pathname,
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode; prefetch?: boolean }

/** A plain anchor, so tests do not depend on the app router. */
function MockLink({ href, children, prefetch, ...rest }: LinkProps) {
  void prefetch // Next-only prop; not valid on <a>.
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}

export const linkMock = { default: MockLink }

export const resetMocks = () => {
  pathname = '/'
  vi.clearAllMocks()
}
