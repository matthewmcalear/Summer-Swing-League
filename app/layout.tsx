import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'
import BottomNav from '@/components/BottomNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Summer Swing League 2026',
  description: 'Competitive and social golf league — April 15 to October 10, 2026',
  openGraph: {
    title: 'Summer Swing League 2026',
    description: 'Competitive group golf all summer long. Any course. Any skill level. Play more, earn more, win cash.',
    url: 'https://www.sslgolf.com',
    siteName: 'Summer Swing League',
    images: [
      {
        url: 'https://www.sslgolf.com/IMG_1002.jpeg',
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
    images: ['https://www.sslgolf.com/IMG_1002.jpeg'],
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
      <body className={inter.className}>
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-20">
          {children}
        </main>
        <BottomNav />
        <footer className="border-t border-green-200 bg-green-900 mt-12">
          <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-green-300 text-sm font-semibold tracking-wide">⛳ Summer Swing League 2026</span>
            <span className="text-green-400 text-xs">Season: Apr 15 – Oct 10 · sslgolf.com</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
