import { HtmlDocumentThemeTarget } from '@/infrastructure/platform/document-theme'
import { LocalStorageAppearanceRepository } from '@/infrastructure/platform/appearance-storage'
import type { AppearanceRepository, DocumentThemeTarget } from './ports'

/**
 * Wires infrastructure to the application ports. The only application file allowed
 * to import infrastructure (research R12). Implementations are created lazily, on
 * first use, so the server never touches browser globals.
 */
export interface Container {
  readonly appearance: AppearanceRepository
  readonly themeTarget: DocumentThemeTarget
}

const overrides: Partial<{ -readonly [K in keyof Container]: Container[K] }> = {}
let appearanceInstance: AppearanceRepository | undefined
let themeTargetInstance: DocumentThemeTarget | undefined

export const container: Container = {
  get appearance() {
    return overrides.appearance ?? (appearanceInstance ??= new LocalStorageAppearanceRepository())
  },
  get themeTarget() {
    return overrides.themeTarget ?? (themeTargetInstance ??= new HtmlDocumentThemeTarget())
  },
}

/** Tests only: replace one or more implementations. */
export function configureContainer(next: Partial<Container>): void {
  if (next.appearance) overrides.appearance = next.appearance
  if (next.themeTarget) overrides.themeTarget = next.themeTarget
}
