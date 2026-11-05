'use client'

import type { MouseEvent } from 'react'

/**
 * The only skip link (FR-026): first focusable element, hidden until focused.
 * Moves focus to main#main explicitly, because the hash jump alone does not
 * reliably move focus in every browser.
 */
export function SkipLink() {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const main = document.getElementById('main')
    if (!main) return
    event.preventDefault()
    main.focus()
  }
  return (
    <a className="skip-link" href="#main" onClick={onClick}>
      Skip to content
    </a>
  )
}
