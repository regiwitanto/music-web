import type { Metadata } from 'next'
import { TestFault } from '@/presentation/testing/TestFault'
import { AppearanceSettings } from '@/presentation/components/settings/AppearanceSettings'

export const metadata: Metadata = { title: 'Settings' }

// Appearance is the only Settings section in scope for 001 (FR-024).
export default function SettingsPage() {
  return (
    <>
      <h1 tabIndex={-1}>Settings</h1>
      <TestFault />
      <AppearanceSettings />
    </>
  )
}
