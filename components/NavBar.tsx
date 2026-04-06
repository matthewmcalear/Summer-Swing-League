'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const links = [
  { href: '/',             label: 'Home'         },
  { href: '/standings',    label: 'Standings'    },
  { href: '/scores',       label: 'Scores'       },
  { href: '/submit-score', label: 'Submit Score' },
  { href: '/analytics',    label: 'Analytics'    },
  { href: '/members',      label: 'Members'      },
  { href: '/rules',        label: 'Rules'        },
  { href: '/about',        label: 'About'        },
]

export default function NavBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="bg-green-900 text-white shadow-lg sticky top-0 z-50">
      {/* Top accent line */}
      <div className="h-0.5 bg-gradient-to-r from-green-400 via-yellow-300 to-green-400" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-extrabold tracking-wide whitespace-nowrap">
            <span className="text-2xl">⛳</span>
            <span className="hidden sm:inline text-white text-lg">Summer Swing League</span>
            <span className="sm:hidden text-white text-xl">SSL</span>
            <span className="text-green-400 font-bold text-xl sm:text-sm ml-0.5">2026</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive(href)
                    ? 'bg-green-700 text-white'
                    : 'text-green-200 hover:bg-green-800 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/admin"
              className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-700 hover:bg-green-600 transition-all border border-green-600"
            >
              Admin
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-green-800 transition-colors"
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
          <div className="md:hidden pb-3 space-y-0.5 border-t border-green-800 pt-2">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-green-700 text-white'
                    : 'text-green-200 hover:bg-green-800 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium bg-green-700 hover:bg-green-600 transition-colors mt-1"
            >
              Admin
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
