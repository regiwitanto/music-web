'use client'

import { useEffect, useLayoutEffect } from 'react'
import { container } from '@/application/container'
import { buildThemeBootstrapScript, pageTitle } from '@/application/shell'
import { Button } from '@/presentation/components/ui/button'
import './globals.css'

/** Whole-app recovery screen (FR-037, FR-038). No error details are rendered. */
export default function GlobalError({ error }: { error: unknown }) {
  // React's client render of this document resets the <html> attributes that the
  // bootstrap script set, so re-apply the stored appearance before paint.
  useEffect(() => {
    console.error(error)
  }, [error])

  useLayoutEffect(() => {
    container.themeTarget.apply(container.appearance.load())
  }, [])

  return (
    <html lang="en" data-theme="system" data-accent="violet" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: buildThemeBootstrapScript() }} />
        <title>{pageTitle('Something went wrong')}</title>
      </head>
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1>Something went wrong</h1>
          <p className="text-body text-muted">The app ran into a problem.</p>
          <Button type="button" onClick={() => location.reload()}>
            Reload
          </Button>
        </main>
      </body>
    </html>
  )
}
