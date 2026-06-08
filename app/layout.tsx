import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { themeStyle } from '@/lib/theme'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'HelpexAI — Document Intelligence Platform',
    template: '%s | HelpexAI',
  },
  description:
    'Upload your legal documents or business contracts and get instant expert AI answers with exact source citations.',
  keywords: ['AI', 'legal documents', 'contract analysis', 'invoice analysis', 'document intelligence'],
  openGraph: {
    title: 'HelpexAI — Document Intelligence Platform',
    description: 'Upload your documents. Ask anything. Get expert answers.',
    url: 'https://helpexai.com',
    siteName: 'HelpexAI',
    type: 'website',
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
      <body className={inter.className} style={themeStyle("main")}>{children}</body>
    </html>
  )
}
