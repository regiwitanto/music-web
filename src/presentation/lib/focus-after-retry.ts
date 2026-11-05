/**
 * After Retry, the control that held focus is removed with the error content, and
 * RouteFocus does not fire (the pathname is unchanged). Watch <main> and focus the
 * recovered page's h1 as soon as it appears; stop when focus lands, or after a timeout
 * if the page fails again (the error state then focuses its own h1).
 */
export function focusHeadingAfterRetry(timeoutMs = 3000): void {
  const main = document.querySelector('main')
  if (!main) return
  const observer = new MutationObserver(() => {
    const heading = main.querySelector<HTMLElement>('h1')
    if (!heading || heading.closest('[data-testid="error-state"]')) return
    heading.focus()
    observer.disconnect()
    window.clearTimeout(timer)
  })
  const timer = window.setTimeout(() => observer.disconnect(), timeoutMs)
  observer.observe(main, { childList: true, subtree: true })
}
