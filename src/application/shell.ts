/**
 * Runtime facade for the presentation layer (research R12). Presentation may import
 * only types from the domain, so the domain values it needs are re-exported here.
 */
export { activeDestination, classifyPath, DESTINATIONS } from '@/domain/navigation'
export { ACCENT_LABELS, ACCENTS, buildThemeBootstrapScript, THEME_LABELS, THEMES } from '@/domain/appearance'
export { APP_DISPLAY_NAME, pageTitle } from '@/domain/branding'
