import type { Metadata, Viewport } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'
import BottomNav from '@/components/BottomNav'

export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'] })

// Display face for headings — warm, characterful, a little wonky.
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Summer Swing League 2026',
  description: 'Competitive and social golf league — April 15 to October 10, 2026',
  metadataBase: new URL('https://sslgolf.com'),
  openGraph: {
    title: 'Summer Swing League 2026',
    description: 'Competitive group golf all summer long. Any course. Any skill level. Play more, earn more, win cash.',
    url: 'https://sslgolf.com',
    siteName: 'Summer Swing League',
    images: [
      {
        url: 'https://sslgolf.com/IMG_1002.jpeg',
        width: 1200,
        height: 630,
        alt: 'Carling Lake Golf Course',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Summer Swing League 2026',
    description: 'Competitive group golf all summer long. Any course. Any skill level.',
    images: ['https://sslgolf.com/IMG_1002.jpeg'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#14532d',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply theme before paint to avoid a light flash. auto = follow system. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='auto')&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SSL 2026" />
      </head>
      <body className={`${inter.className} ${fraunces.variable}`}>
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-20">
          {children}
        </main>
        <BottomNav />
        <footer className="border-t border-green-800 bg-green-900 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              {/* Brand */}
              <div className="col-span-2 sm:col-span-1">
                <p className="font-display text-lg text-white leading-tight">Summer Swing League</p>
                <p className="text-brass-300 text-sm font-bold">2026</p>
                <p className="text-green-400 text-xs mt-2">Season: Apr 15 – Oct 10</p>
              </div>

              {[
                { title: 'Play', links: [
                  ['Submit Score', '/submit-score'],
                  ['Play Live', '/play'],
                  ['Rangefinder', '/rangefinder'],
                ] },
                { title: 'League', links: [
                  ['Standings', '/standings'],
                  ['Scores', '/scores'],
                  ['Members', '/members'],
                  ['Rules', '/rules'],
                ] },
                { title: 'More', links: [
                  ['Analytics', '/analytics'],
                  ['My Bag', '/my-bag'],
                  ['About', '/about'],
                ] },
              ].map(({ title, links }) => (
                <div key={title}>
                  <p className="text-green-400 text-[11px] font-bold uppercase tracking-widest mb-3">{title}</p>
                  <ul className="space-y-2">
                    {links.map(([label, href]) => (
                      <li key={href}>
                        <a href={href} className="text-green-200 text-sm hover:text-white transition-colors">{label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border-t border-green-800 mt-8 pt-4">
              <p className="text-green-400 text-xs">sslgolf.com · Season 2</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
