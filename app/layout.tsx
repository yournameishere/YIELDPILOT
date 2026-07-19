import React from "react"
import type { Metadata, Viewport } from 'next'
import { GeistMono, GeistSans } from 'geist/font'
import './globals.css'

export const metadata: Metadata = {
  title: 'YieldPilot AI - Autonomous DeFi Yield Manager',
  description: 'A Wave 3 simulation app that scans live DeFi yields, SoSoValue market intelligence, macro events, indexes, and SoDEX data to simulate safer AI-driven allocation strategies.',
  keywords: ['DeFi yield', 'AI yield manager', 'SoSoValue', 'SoDEX', 'DefiLlama', 'crypto portfolio'],
  applicationName: 'YieldPilot AI',
  authors: [{ name: 'YieldPilot AI' }],
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'YieldPilot AI - Autonomous DeFi Yield Manager',
    description: 'Live DeFi yield discovery, SoSoValue intelligence, macro calendar risk, SoDEX market pulse, and OpenAI strategy reasoning.',
    type: 'website',
    siteName: 'YieldPilot AI',
  },
  twitter: {
    card: 'summary',
    title: 'YieldPilot AI',
    description: 'Autonomous DeFi yield manager for safer simulated rebalancing.',
  },
}

export const viewport: Viewport = {
  themeColor: '#050505',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
