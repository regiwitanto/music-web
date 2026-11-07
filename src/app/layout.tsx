import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { APP_DISPLAY_NAME } from '@/application/shell'
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

// One permanent dark identity (ADR-011): the browser's canvas and native controls are dark
// before the stylesheet arrives. The same declaration is in globals.css (014 research R1).
export const viewport: Viewport = {
  colorScheme: 'dark',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
