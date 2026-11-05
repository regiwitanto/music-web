import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { APP_DISPLAY_NAME, buildThemeBootstrapScript } from '@/application/shell'
import { AppShell } from '@/presentation/components/shell/AppShell'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    template: `%s · ${APP_DISPLAY_NAME}`,
    default: APP_DISPLAY_NAME,
  },
  description: 'Play and organise your music.',
}

// Built once per server start from domain constants (research R4).
const themeBootstrap = buildThemeBootstrapScript()

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      data-theme="system"
      data-accent="violet"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        {/* First child of <head>: applies the persisted theme before first paint (ADR-009). */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
