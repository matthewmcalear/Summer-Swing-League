'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** `pending`: player suggestions waiting for an admin (shown as a badge on Admin). */
export function NavLinks({ isAdmin, mobile, pending = 0 }: { isAdmin: boolean; mobile?: boolean; pending?: number }) {
  const path = usePathname()
  const links = [
    { href: '/polydan', label: 'Markets' },
    { href: '/polydan/portfolio', label: 'Portfolio' },
    { href: '/polydan/leaderboard', label: 'Leaders' },
    { href: '/polydan/suggest', label: mobile ? 'Suggest' : '💡 Suggest' },
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
            className={`rounded-md font-medium whitespace-nowrap ${mobile ? 'my-1.5 px-2 py-2' : 'px-2.5 py-1.5'} ${
              active ? 'bg-pd-surface-2 text-pd-ink' : 'text-pd-muted hover:text-pd-ink'
            }`}
          >
            {l.label}
            {l.href === '/polydan/admin' && pending > 0 && (
              <span
                className="ml-1 inline-block min-w-[1.25rem] rounded-full bg-pd-no px-1.5 text-center text-xs leading-5 font-bold text-white"
                aria-label={`${pending} suggestion${pending === 1 ? '' : 's'} waiting`}
              >
                {pending}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
