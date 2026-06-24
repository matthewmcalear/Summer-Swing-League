'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import Logo from './Logo'

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
            <Link
              href="/dans-bday"
              className={`ml-1 px-3 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                isActive('/dans-bday')
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-white'
              }`}
            >
              🎂 Dan's Bday
            </Link>
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
