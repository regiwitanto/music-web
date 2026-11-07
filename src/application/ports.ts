/**
 * Removes the theme and accent value that the 001 version of the app saved on the device
 * (key `mp.appearance`). The identity is static, so the value is obsolete (014 FR-019,
 * contracts/identity.md §5).
 */
export interface ObsoleteDataCleaner {
  /** Never throws, and never reads the value. Storage errors are swallowed. */
  removeObsoleteAppearance(): void
}
