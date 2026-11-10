import type { Metadata, Viewport } from 'next'
import './sparx.css'

// Sparx: a private tracker for paying off the sharpening machine. It only lives
// on this domain; the league's nav, bottom nav and footer are hidden here.

export const metadata: Metadata = {
  title: 'Sparx',
  description: 'Sharpening log and payback tracker.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#1c2026',
  viewportFit: 'cover',
}

export default function SparxLayout({ children }: { children: React.ReactNode }) {
  return <div className="sparx">{children}</div>
}
