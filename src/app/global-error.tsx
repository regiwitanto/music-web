'use client'

import { useEffect } from 'react'
import { pageTitle } from '@/application/shell'
import { Button } from '@/presentation/components/ui/button'
import './globals.css'

/** Whole-app recovery screen (FR-037, FR-038). No error details are rendered. */
export default function GlobalError({ error }: { error: unknown }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <head>
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
