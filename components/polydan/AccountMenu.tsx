'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/polydan/actions'

/** "Matt · $40" chip in the header: who's logged in, plus switch / log out. */
export function AccountMenu({ name, balance }: { name: string; balance: string }) {
  // Keyed by path so the menu closes itself after navigating.
  const path = usePathname()
  return (
    <details key={path} className="relative ml-auto">
      <summary
        className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-full border-[1.5px] border-pd-line-strong px-3 text-sm [&::-webkit-details-marker]:hidden"
        aria-label={`Logged in as ${name}. Account menu`}
      >
        <span className="max-w-28 truncate font-semibold">{name}</span>
        <span className="text-pd-muted">·</span>
        <span className="pd-num font-semibold">{balance}</span>
        <span aria-hidden className="text-xs text-pd-muted">▾</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-pd-line-strong bg-pd-surface shadow-xl">
        <p className="border-b border-pd-line px-4 py-2.5 text-xs text-pd-muted">
          Logged in as <span className="font-semibold text-pd-ink">{name}</span>
        </p>
        <Link href="/polydan/portfolio" className="block px-4 py-3 text-sm font-medium hover:bg-pd-surface-2">
          My bets &amp; money
        </Link>
        <Link href="/polydan/tv" className="block px-4 py-3 text-sm font-medium hover:bg-pd-surface-2">
          📺 TV dashboard
          <span className="block text-xs font-normal text-pd-muted">Full-screen view for the big screen</span>
        </Link>
        <Link href="/polydan/login?switch=1" className="block px-4 py-3 text-sm font-medium hover:bg-pd-surface-2">
          Switch player
          <span className="block text-xs font-normal text-pd-muted">Someone else using this phone</span>
        </Link>
        <form action={logout} className="border-t border-pd-line">
          <button className="w-full px-4 py-3 text-left text-sm font-medium text-pd-no hover:bg-pd-surface-2">Log out</button>
        </form>
      </div>
    </details>
  )
}
