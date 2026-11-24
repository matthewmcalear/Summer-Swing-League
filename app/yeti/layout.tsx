import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed } from 'next/font/google'
import './yeti.css'

// Yeti lines: the line builder for Steven's Westmount team, living inside the
// SSL site like PolyDan. It has its own rink look and chrome; the league's
// nav, bottom nav and footer are hidden here (NavBar, BottomNav, HideOnPolydan).
// The team logo lives beside this file: logo.webp in the app, icon.png and
// apple-icon.png for tabs and home screens, opengraph-image.jpg for link previews,
// and public/yeti/ (manifest.json + icon-192/512) for installing it as an app.

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
  twitter: { card: 'summary_large_image', title: 'Yeti Lines', description },
  // Saved to a home screen: the logo (app/yeti/apple-icon.png), this name and
  // a manifest that opens /yeti — not the league's.
  manifest: '/yeti/manifest.json',
  appleWebApp: { title: 'Yeti Lines', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#0c1a2c',
  viewportFit: 'cover',
}

export default function YetiLayout({ children }: { children: React.ReactNode }) {
  return <div className={`yeti ${display.variable}`}>{children}</div>
}
