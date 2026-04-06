'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const links = [
  { href: '/',              label: 'Home' },
  { href: '/standings',     label: 'Standings' },
  { href: '/scores',        label: 'Scores' },
  { href: '/submit-score',  label: 'Submit Score' },
  { href: '/members',       label: 'Members' },
  { href: '/rules',         label: 'Rules' },
  { href: '/about',         label: 'About' },
]

export default function NavBar() {
  const pathname  = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <nav className="bg-green-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-wide whitespace-nowrap">
            ⛳ SSL 2026
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'bg-green-700 text-white'
                    : 'text-green-100 hover:bg-green-700 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/admin"
              className="ml-3 px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 hover:bg-green-500 transition-colors"
            >
              Admin
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-green-700 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-3 space-y-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'bg-green-700 text-white'
                    : 'text-green-100 hover:bg-green-700 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium bg-green-600 hover:bg-green-500 transition-colors"
            >
              Admin
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
