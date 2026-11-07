import type { Metadata } from 'next'
import { TestFault } from '@/presentation/testing/TestFault'
import { SettingsSectionList } from '@/presentation/components/settings/SettingsSectionList'

export const metadata: Metadata = { title: 'Settings' }

// Five non-interactive "Coming soon" rows until each section's feature ships (014 D-014-1, FR-017).
export default function SettingsPage() {
  return (
    <>
      <h1 tabIndex={-1}>Settings</h1>
      <TestFault />
      <SettingsSectionList />
    </>
  )
}
