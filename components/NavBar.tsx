'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import ThemeToggle from './ThemeToggle'
import Logo from './Logo'

// League events — newest first. Add new events here and in BottomNav's More sheet.
const EVENTS = [
  { href: '/events/mt-orford', icon: '⛰️', label: 'Mt. Orford',  sub: 'Sun Aug 2 · Next up' },
  { href: '/dans-bday',        icon: '🎂', label: "Dan's Bday",  sub: 'Jul 3 · Results'     },
]

const links = [
  { href: '/',             label: 'Home'         },
  { href: '/standings',    label: 'Standings'    },
  { href: '/scores',       label: 'Scores'       },
  { href: '/submit-score', label: 'Submit Score' },
  { href: '/play',         label: 'Play Live'    },
  { href: '/analytics',    label: 'Analytics'    },
  { href: '/members',      label: 'Members'      },
  { href: '/rangefinder',  label: 'Rangefinder' },
  { href: '/my-bag',       label: 'My Bag'      },
  { href: '/rules',        label: 'Rules'        },
  { href: '/about',        label: 'About'        },
]

function EventsMenu({ isActive }: { isActive: (href: string) => boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const anyActive = EVENTS.some((e) => isActive(e.href))

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`ml-1 px-3 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
          anyActive || open
            ? 'bg-sky-500 text-white'
            : 'bg-sky-500/20 text-sky-300 hover:bg-sky-500 hover:text-white'
        }`}
      >
        🎉 Events <span className="text-xs">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden py-1">
          {EVENTS.map(({ href, icon, label, sub }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                isActive(href) ? 'bg-sky-50' : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span>
                <span className="block text-sm font-bold text-gray-900 leading-tight">{label}</span>
                <span className="block text-[11px] text-gray-400">{sub}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// Mobile navigation lives in <BottomNav /> — this top bar is logo-only on phones.
export default function NavBar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="bg-green-900 text-white shadow-lg sticky top-0 z-50">
      {/* Top accent line */}
      <div className="h-0.5 bg-gradient-to-r from-green-400 via-yellow-300 to-green-400" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-wide whitespace-nowrap">
            <Logo className="w-9 h-9 sm:w-10 sm:h-10 drop-shadow-md" />
            <span className="text-white text-lg sm:text-xl">Summer Swing League</span>
            <span className="text-green-400 font-bold text-sm sm:text-base">2026</span>
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
            <EventsMenu isActive={isActive} />
            <Link
              href="/admin"
              className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-700 hover:bg-green-600 transition-all"
            >
              Admin
            </Link>
            <div className="ml-1">
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile: theme toggle (nav lives in the bottom tab bar) */}
          <div className="md:hidden flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  )
}
