import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed } from 'next/font/google'
import './yeti.css'

// Yeti lines: the line builder for Steven's Westmount team, living inside the
// SSL site like PolyDan. It has its own rink look and chrome; the league's
// nav, bottom nav and footer are hidden here (NavBar, BottomNav, HideOnPolydan).

const display = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-yt-display',
  display: 'swap',
})

const description = 'Build the Yeti lines for each game — attendance, skill, positions and balanced lines, shared live.'

export const metadata: Metadata = {
  title: 'Yeti Lines',
  description,
  robots: { index: false, follow: false },
  openGraph: { title: 'Yeti Lines', description, url: 'https://sslgolf.com/yeti', siteName: 'Yeti Lines', type: 'website' },
  twitter: { card: 'summary', title: 'Yeti Lines', description },
}

export const viewport: Viewport = {
  themeColor: '#0c1a2c',
  viewportFit: 'cover',
}

export default function YetiLayout({ children }: { children: React.ReactNode }) {
  return <div className={`yeti ${display.variable}`}>{children}</div>
}
