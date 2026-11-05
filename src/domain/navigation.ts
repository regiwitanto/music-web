/**
 * The four fixed destinations and address classification
 * (constitution III; spec FR-001, FR-002, FR-012; data-model §1–2).
 */

export type DestinationId = 'home' | 'explore' | 'library' | 'settings'

export interface Destination {
  readonly id: DestinationId
  readonly label: string
  readonly href: string
  readonly order: number
}

/** Closed set, fixed order. Changing it needs a constitution amendment. */
export const DESTINATIONS = [
  { id: 'home', label: 'Home', href: '/', order: 0 },
  { id: 'explore', label: 'Explore', href: '/explore', order: 1 },
  { id: 'library', label: 'Library', href: '/library', order: 2 },
  { id: 'settings', label: 'Settings', href: '/settings', order: 3 },
] as const satisfies readonly [Destination, Destination, Destination, Destination]

/** A reserved nested pattern relative to its destination; `<seg>` is exactly one non-empty segment. */
export type ReservedPattern = string

export type RouteClassification =
  | { kind: 'root'; destination: DestinationId }
  | { kind: 'reserved'; destination: DestinationId; pattern: ReservedPattern }
  | { kind: 'unknown' }

/** The approved secondary routes (PRD §4), exactly as data-model §2. */
export const RESERVED_PATTERNS: Readonly<Record<DestinationId, readonly ReservedPattern[]>> = {
  home: [],
  explore: ['search', 'genre/<seg>', 'mood/<seg>', 'artist/<seg>', 'album/<seg>'],
  library: ['liked', 'playlists', 'playlist/<seg>', 'albums', 'artists', 'recent'],
  // MVP only (D-001-2, open item O7): any single segment. Features 010 and 009
  // must restrict this to the Settings sections that actually exist.
  settings: ['<seg>'],
}

const SEGMENT = '<seg>'
const UNKNOWN: RouteClassification = { kind: 'unknown' }

function destinationForSegment(segment: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.href === `/${segment}`)
}

function matches(pattern: ReservedPattern, rest: readonly string[]): boolean {
  const parts = pattern.split('/')
  return parts.length === rest.length && parts.every((part, i) => part === SEGMENT || part === rest[i])
}

/**
 * Classifies a pathname (no query, no hash) as a destination root, a reserved
 * nested address, or unknown. One trailing slash is ignored; an empty segment
 * makes the address unknown; comparison is case-sensitive.
 */
export function classifyPath(pathname: string): RouteClassification {
  if (!pathname.startsWith('/')) return UNKNOWN
  if (pathname === '/') return { kind: 'root', destination: 'home' }

  const segments = pathname.slice(1).split('/')
  if (segments.length > 1 && segments[segments.length - 1] === '') segments.pop()
  if (segments.some((s) => s === '')) return UNKNOWN

  const [first, ...rest] = segments
  const destination = first === undefined ? undefined : destinationForSegment(first)
  if (!destination) return UNKNOWN
  if (rest.length === 0) return { kind: 'root', destination: destination.id }

  const pattern = RESERVED_PATTERNS[destination.id].find((p) => matches(p, rest))
  return pattern === undefined ? UNKNOWN : { kind: 'reserved', destination: destination.id, pattern }
}

/** The destination to mark as current; none for unknown addresses (D-001-1). */
export function activeDestination(classification: RouteClassification): DestinationId | null {
  return classification.kind === 'unknown' ? null : classification.destination
}
