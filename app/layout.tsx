import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { themeStyle } from '@/lib/theme'
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from '@/lib/seo'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  manifest: '/manifest.webmanifest',
  title: {
    default: DEFAULT_TITLE,
    template: '%s | HelpexAI',
  },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
    images: [
      {
        url: absoluteUrl(DEFAULT_OG_IMAGE),
        width: 1200,
        height: 630,
        alt: DEFAULT_OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('helpex-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}",
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`} style={themeStyle("main")}>{children}</body>
    </html>
  )
}
