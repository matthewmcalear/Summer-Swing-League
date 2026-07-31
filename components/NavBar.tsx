'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Trophy, ClipboardList, Flag, Users, BookOpen,
  Wrench, LocateFixed, Radio, BarChart3, Backpack, Info,
  CalendarDays, Cake, ChevronDown, type LucideIcon,
} from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import Logo from './Logo'

type NavItem = { href: string; label: string; sub?: string; icon: LucideIcon }

// Primary navigation — the five things members reach for. The logo is Home.
const PRIMARY: NavItem[] = [
  { href: '/standings',    label: 'Standings',    icon: Trophy },
  { href: '/scores',       label: 'Scores',       icon: ClipboardList },
  { href: '/submit-score', label: 'Submit Score', icon: Flag },
  { href: '/members',      label: 'Members',      icon: Users },
  { href: '/rules',        label: 'Rules',        icon: BookOpen },
]

// Everything secondary lives under one Tools grouping.
const TOOLS: NavItem[] = [
  { href: '/rangefinder', label: 'Rangefinder', icon: LocateFixed, sub: 'Distance to the pin' },
  { href: '/play',        label: 'Play Live',   icon: Radio,       sub: 'Live scoring' },
  { href: '/analytics',   label: 'Analytics',   icon: BarChart3,   sub: 'Season trends' },
  { href: '/my-bag',      label: 'My Bag',      icon: Backpack,    sub: 'Your clubs' },
  { href: '/about',       label: 'About',       icon: Info,        sub: 'The league' },
]

// League events — newest first. Mirror any change in BottomNav's More sheet.
const EVENTS: NavItem[] = [
  { href: '/dans-bday', label: "Dan's Bday", icon: Cake, sub: 'Jul 3 · Results' },
]

function NavDropdown({
  label,
  triggerIcon: TriggerIcon,
  items,
  isActive,
}: {
  label: string
  triggerIcon: LucideIcon
  items: NavItem[]
  isActive: (href: string) => boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const anyActive = items.some((e) => isActive(e.href))

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
          anyActive || open
            ? 'bg-green-700 text-white'
            : 'text-green-200 hover:bg-green-800 hover:text-white'
        }`}
      >
        <TriggerIcon size={15} strokeWidth={2} aria-hidden="true" />
        {label}
        <ChevronDown size={14} strokeWidth={2.5} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden py-1">
          {items.map(({ href, icon: Icon, label, sub }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                isActive(href) ? 'bg-green-50' : 'hover:bg-gray-50'
              }`}
            >
              <Icon size={18} strokeWidth={2} aria-hidden="true" className="text-green-700 shrink-0" />
              <span>
                <span className="block text-sm font-bold text-gray-900 leading-tight">{label}</span>
                {sub && <span className="block text-[11px] text-gray-400">{sub}</span>}
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
      {/* Top accent line — green disc to brass ring */}
      <div className="h-0.5 bg-gradient-to-r from-green-500 via-brass-400 to-green-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo (Home) */}
          <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-wide whitespace-nowrap">
            <Logo className="w-9 h-9 sm:w-10 sm:h-10 drop-shadow-md" />
            <span className="text-white text-lg sm:text-xl font-display">Summer Swing League</span>
            <span className="text-brass-300 font-bold text-sm sm:text-base">2026</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {PRIMARY.map(({ href, label }) => (
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
            <NavDropdown label="Tools"  triggerIcon={Wrench}       items={TOOLS}  isActive={isActive} />
            <NavDropdown label="Events" triggerIcon={CalendarDays} items={EVENTS} isActive={isActive} />
            <div className="ml-1">
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile: navigation lives in the bottom tab bar; theme toggle lives there too */}
        </div>
      </div>
    </nav>
  )
}
