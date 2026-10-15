'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLinks({ isAdmin, mobile }: { isAdmin: boolean; mobile?: boolean }) {
  const path = usePathname()
  const links = [
    { href: '/polydan', label: 'Markets' },
    { href: '/polydan/portfolio', label: 'Portfolio' },
    { href: '/polydan/leaderboard', label: 'Leaders' },
    // The TV view is for a laptop on the big screen, so it's a desktop-only tab.
    ...(mobile ? [] : [{ href: '/polydan/tv', label: '📺 TV' }]),
    ...(isAdmin ? [{ href: '/polydan/admin', label: 'Admin' }] : []),
  ]
  return (
    <nav
      className={
        mobile
          ? 'fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-pd-line bg-pd-bg/95 px-2 pb-[env(safe-area-inset-bottom)] text-sm backdrop-blur sm:hidden'
          : 'hidden gap-0.5 text-sm sm:flex'
      }
    >
      {links.map((l) => {
        const active = l.href === '/polydan' ? path === '/polydan' || path.startsWith('/polydan/market') : path.startsWith(l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md font-medium whitespace-nowrap ${mobile ? 'my-1.5 px-3 py-2' : 'px-2.5 py-1.5'} ${
              active ? 'bg-pd-surface-2 text-pd-ink' : 'text-pd-muted hover:text-pd-ink'
            }`}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
