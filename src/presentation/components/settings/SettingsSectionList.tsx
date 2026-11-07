/**
 * The Settings sections that are still to come (014 D-014-1, FR-017). Each row is plain,
 * non-interactive text: no link, button or tabindex, and no affordance suggesting it opens.
 * The order is fixed by the owner decision. Each section arrives with its own feature
 * (Playback, Library & Data and About: 010; Storage: 009; Accessibility: 012).
 */
const SECTIONS = ['Playback', 'Storage', 'Library & Data', 'Accessibility', 'About'] as const

export function SettingsSectionList() {
  return (
    <ul aria-label="Settings sections" className="mt-6 flex flex-col gap-2">
      {SECTIONS.map((label) => (
        <li
          key={label}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border border-divider bg-surface px-4 py-3"
        >
          <span className="text-body-strong text-text">{label}</span>
          <span className="text-caption text-muted">Coming soon</span>
        </li>
      ))}
    </ul>
  )
}
