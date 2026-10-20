'use client'

import { usePathname } from 'next/navigation'

/**
 * Renders its children everywhere except the stand-alone apps that bring their
 * own chrome: PolyDan (/polydan) and Yeti lines (/yeti).
 */
export default function HideOnPolydan({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return pathname.startsWith('/polydan') || pathname.startsWith('/yeti') ? null : children
}
