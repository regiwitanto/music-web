'use client'

import { useEffect, useLayoutEffect } from 'react'
import { container } from '@/application/container'
import { useSettingsStore } from '@/application/stores/settings'

/**
 * Keeps `<html>` in step with the settings store (research R4, R6).
 * - Before paint: re-applies the store's value. React's development Strict Mode
 *   remount resets `<html>` attributes; in production this is a no-op.
 * - After mount: reconciles with the repository once.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    const appearance = useSettingsStore.getState().appearance
    if (appearance) container.themeTarget.apply(appearance)
  }, [])

  useEffect(() => {
    useSettingsStore.getState().reconcile()
  }, [])

  return null
}
