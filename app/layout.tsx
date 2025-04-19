import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Summer Swing League 2025',
  description: 'Join the Summer Swing League for competitive and social golf from May 1 to August 31, 2025',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className + " relative bg-[url('/golf-bg.jpg')] bg-cover bg-center bg-fixed"}>
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-white/10 pointer-events-none z-0" />
        <nav className="bg-green-700 text-white">
          <div className="max-w-7xl mx-auto px-4 py-3 flex space-x-6 text-sm">
            <Link href="/" className="hover:underline">Home</Link>
            <Link href="/scores" className="hover:underline">Scores</Link>
            <Link href="/standings" className="hover:underline">Standings</Link>
            <Link href="/admin" className="hover:underline ml-auto">Admin</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
} 