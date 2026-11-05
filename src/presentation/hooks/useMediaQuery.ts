'use client'

import { useCallback, useSyncExternalStore } from 'react'

const lists = new Map<string, MediaQueryList>()
function listFor(query: string): MediaQueryList {
  let list = lists.get(query)
  if (!list) {
    list = window.matchMedia(query)
    lists.set(query, list)
  }
  return list
}

/** Tracks a CSS media query. The server snapshot is `false`. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = listFor(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => listFor(query).matches,
    () => false,
  )
}
