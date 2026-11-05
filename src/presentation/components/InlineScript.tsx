// Adapted from the Next.js guide "Preventing flash before hydration" (MIT). See THIRD_PARTY_NOTICES.md.

/**
 * Emits a script that runs during HTML parsing on a full page load. On the client
 * the type is `text/plain`, so React does not warn about rendering a script and
 * the script does not re-run on client-side navigations (research R15).
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
