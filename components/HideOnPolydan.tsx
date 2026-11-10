'use client'

import { usePathname } from 'next/navigation'

/**
 * Renders its children everywhere except the stand-alone apps that bring their
 * own chrome: PolyDan (/polydan), Yeti lines (/yeti) and Sparx (/sparx).
 */
export default function HideOnPolydan({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return pathname.startsWith('/polydan') || pathname.startsWith('/yeti') || pathname.startsWith('/sparx') ? null : children
}
