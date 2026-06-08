import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { auth } from '@/auth'
import { PostHogProvider } from '@/components/providers/posthog-provider'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'codeR — Code Together. Ship Faster.',
  description:
    'A real-time collaborative code editor with live execution, presence-aware cursors, and AI completions.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const phUser = session?.user?.id
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      }
    : null

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('coder-theme')==='light')document.documentElement.classList.add('light')}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <PostHogProvider user={phUser}>{children}</PostHogProvider>
        <Toaster />
      </body>
    </html>
  )
}
