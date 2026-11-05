/**
 * The single public display name (decision D5, ADR-010; spec FR-039, FR-040).
 * This is the only place the public name is defined.
 */
export const APP_DISPLAY_NAME = 'Music Player'

/** `{Page} · {APP_DISPLAY_NAME}`, matching the root layout's metadata title template. */
export function pageTitle(page: string): string {
  return `${page} · ${APP_DISPLAY_NAME}`
}
