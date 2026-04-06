import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Summer Swing League 2026',
  description: 'Competitive and social golf league — April 15 to October 10, 2026',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
          {children}
        </main>
        <footer className="border-t border-gray-200 bg-white mt-12">
          <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-400">
            © 2026 Summer Swing League · Season: Apr 15 – Oct 10
          </div>
        </footer>
      </body>
    </html>
  )
}
