import type { AppearancePreference } from '@/domain/appearance'

/**
 * Where the appearance preference is persisted. Implemented by localStorage in
 * 001; feature 002 adds a Dexie implementation (ADR-009, open item O3).
 */
export interface AppearanceRepository {
  /** Never throws; returns the defaults on any failure. */
  load(): AppearancePreference
  /** Never throws; storage errors are swallowed so the change still applies for the session. */
  save(preference: AppearancePreference): void
}

/** The `<html>` element seam that carries `data-theme` / `data-accent`. */
export interface DocumentThemeTarget {
  /** Parses the attributes; field-wise defaults when absent or invalid. */
  read(): AppearancePreference
  apply(preference: AppearancePreference): void
}
