import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { themeStyle } from '@/lib/theme'
import { SITE_URL } from '@/lib/seo'
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
    default: 'HelpexAI — Document Intelligence Platform',
    template: '%s | HelpexAI',
  },
  description:
    'Upload business documents and get clear AI answers with exact source citations.',
  keywords: ['AI', 'business documents', 'contract analysis', 'invoice analysis', 'document intelligence'],
  openGraph: {
    title: 'HelpexAI — Document Intelligence Platform',
    description: 'Upload your documents. Ask anything. Get expert answers.',
    url: SITE_URL,
    siteName: 'HelpexAI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HelpexAI - AI Document Intelligence Platform',
    description: 'Upload your documents. Ask anything. Get clear, cited answers.',
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
