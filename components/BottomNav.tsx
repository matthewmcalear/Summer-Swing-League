'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const TABS = [
  { href: '/',             label: 'Home',      icon: '🏠' },
  { href: '/standings',    label: 'Standings', icon: '🏆' },
  { href: '/submit-score', label: 'Submit',    icon: '⛳' },
  { href: '/scores',       label: 'Scores',    icon: '📋' },
]

const MORE_LINKS = [
  { href: '/analytics',   label: 'Analytics',   icon: '📊' },
  { href: '/members',     label: 'Members',     icon: '👥' },
  { href: '/rangefinder', label: 'Rangefinder', icon: '📍' },
  { href: '/my-bag',      label: 'My Bag',      icon: '🎒' },
  { href: '/rules',       label: 'Rules',       icon: '📖' },
  { href: '/about',       label: 'About',       icon: 'ℹ️' },
  { href: '/dans-bday',   label: "Dan's Bday",  icon: '🎂' },
  { href: '/admin',       label: 'Admin',       icon: '⚙️' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const moreActive = MORE_LINKS.some((l) => isActive(l.href))

  return (
    <>
      {/* Backdrop for the More sheet */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* Slide-up More sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 md:hidden transition-transform duration-300 ease-out ${
          moreOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white dark-sheet rounded-t-3xl shadow-2xl border-t border-gray-100 px-4 pt-3 pb-24">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
          <div className="grid grid-cols-4 gap-2">
            {MORE_LINKS.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={`flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-green-50 text-green-800'
                    : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <span className="text-2xl leading-none">{icon}</span>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-white/95 dark-tabbar backdrop-blur border-t border-gray-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5">
          {TABS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMoreOpen(false)}
              className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold transition-colors ${
                isActive(href) && !moreOpen ? 'text-green-700' : 'text-gray-400'
              }`}
            >
              <span className={`text-xl leading-none transition-transform ${isActive(href) && !moreOpen ? 'scale-110' : ''}`}>
                {icon}
              </span>
              {label}
              <span className={`h-0.5 w-8 rounded-full ${isActive(href) && !moreOpen ? 'bg-green-600' : 'bg-transparent'}`} />
            </Link>
          ))}
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold transition-colors ${
              moreOpen || moreActive ? 'text-green-700' : 'text-gray-400'
            }`}
          >
            <span className="text-xl leading-none">{moreOpen ? '✕' : '☰'}</span>
            More
            <span className={`h-0.5 w-8 rounded-full ${moreActive && !moreOpen ? 'bg-green-600' : 'bg-transparent'}`} />
          </button>
        </div>
      </nav>
    </>
  )
}
