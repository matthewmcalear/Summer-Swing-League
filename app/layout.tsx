import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })
const pop = Poppins({ subsets:['latin'], weight:['600','700'] })

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
        {/* optional overlay removed for clarity */}
        <div className="absolute inset-0 pointer-events-none z-0" style={{background:'transparent'}} />
        <nav className="bg-green-700 text-white">
          <div className="max-w-7xl mx-auto px-4 py-3 flex space-x-6 text-sm">
            <Link href="/" className="hover:underline">Home</Link>
            <Link href="/league-complete" className="hover:underline">2025 Results</Link>
            <Link href="/download-data" className="hover:underline">Download Data</Link>
            <Link href="/raw-data" className="hover:underline">Raw Data</Link>
            <Link href="/season-2026" className="hover:underline">2026 Season</Link>
            <Link href="/about" className="hover:underline">About</Link>
            <Link href="/admin" className="hover:underline ml-auto">Admin</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
} 