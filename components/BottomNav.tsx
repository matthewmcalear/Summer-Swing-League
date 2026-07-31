'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Home, Trophy, Flag, ClipboardList, Radio, BarChart3, Users,
  LocateFixed, Backpack, BookOpen, Info, Cake, Menu, X,
  type LucideIcon,
} from 'lucide-react'
import ThemeToggle from './ThemeToggle'

type NavLink = { href: string; label: string; icon: LucideIcon }

// Four quick tabs mirror the most-used primary items; the logo/Home rounds them out.
const TABS: NavLink[] = [
  { href: '/',             label: 'Home',      icon: Home },
  { href: '/standings',    label: 'Standings', icon: Trophy },
  { href: '/submit-score', label: 'Submit',    icon: Flag },
  { href: '/scores',       label: 'Scores',    icon: ClipboardList },
]

// The More sheet groups the rest to match the desktop nav's mental model.
const MORE_GROUPS: { title: string; links: NavLink[] }[] = [
  { title: 'League', links: [
    { href: '/members', label: 'Members', icon: Users },
    { href: '/rules',   label: 'Rules',   icon: BookOpen },
  ] },
  { title: 'Tools', links: [
    { href: '/rangefinder', label: 'Rangefinder', icon: LocateFixed },
    { href: '/play',        label: 'Play Live',   icon: Radio },
    { href: '/analytics',   label: 'Analytics',   icon: BarChart3 },
    { href: '/my-bag',      label: 'My Bag',      icon: Backpack },
    { href: '/about',       label: 'About',       icon: Info },
  ] },
  { title: 'Events', links: [
    { href: '/dans-bday', label: "Dan's Bday", icon: Cake },
  ] },
]

const MORE_LINKS: NavLink[] = MORE_GROUPS.flatMap((g) => g.links)

export default function BottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  // The Dan's Birthday event pages are an immersive sub-app with their own
  // sticky bars — hide the global bottom nav there so they don't collide.
  if (pathname.startsWith('/dans-bday')) return null

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
          {MORE_GROUPS.map(({ title, links }) => (
            <div key={title} className="mb-3">
              <p className="px-1 mb-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
              <div className="grid grid-cols-4 gap-2">
                {links.map(({ href, label, icon: Icon }) => (
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
                    <Icon size={22} strokeWidth={2} aria-hidden="true" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-2">
            <ThemeToggle showLabel />
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-white/95 dark-tabbar backdrop-blur border-t border-gray-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5">
          {TABS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMoreOpen(false)}
              className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold transition-colors ${
                isActive(href) && !moreOpen ? 'text-green-700' : 'text-gray-400'
              }`}
            >
              <Icon
                size={20}
                strokeWidth={2}
                aria-hidden="true"
                className={`transition-transform ${isActive(href) && !moreOpen ? 'scale-110' : ''}`}
              />
              {label}
              <span className={`h-0.5 w-8 rounded-full ${isActive(href) && !moreOpen ? 'bg-green-600' : 'bg-transparent'}`} />
            </Link>
          ))}
          <button
            onClick={() => setMoreOpen((o) => !o)}
            aria-label={moreOpen ? 'Close menu' : 'More links'}
            aria-expanded={moreOpen}
            className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold transition-colors ${
              moreOpen || moreActive ? 'text-green-700' : 'text-gray-400'
            }`}
          >
            {moreOpen ? <X size={20} strokeWidth={2} aria-hidden="true" /> : <Menu size={20} strokeWidth={2} aria-hidden="true" />}
            More
            <span className={`h-0.5 w-8 rounded-full ${moreActive && !moreOpen ? 'bg-green-600' : 'bg-transparent'}`} />
          </button>
        </div>
      </nav>
    </>
  )
}
