'use client'

import { usePathname } from 'next/navigation'

/** Renders its children everywhere except PolyDan (/polydan), which has its own chrome. */
export default function HideOnPolydan({ children }: { children: React.ReactNode }) {
  return usePathname().startsWith('/polydan') ? null : children
}
