import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

// The Appearance section is added in US4 (T082–T083). No other Settings sections
// are in scope for 001 (FR-024).
export default function SettingsPage() {
  return <h1 tabIndex={-1}>Settings</h1>
}
