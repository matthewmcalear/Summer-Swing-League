import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Oswald } from 'next/font/google'
import Link from 'next/link'
import { currentUser } from '@/lib/polydan/auth'
import { balanceCents } from '@/lib/polydan/markets'
import { prisma } from '@/lib/prisma'
import { formatMoney } from '@/lib/polydan/money'
import { NavLinks } from '@/components/polydan/NavLinks'
import { AccountMenu } from '@/components/polydan/AccountMenu'
import { LiveRefresh } from '@/components/polydan/ui'

// PolyDan: the family's Iron Man prediction market, living inside the SSL site.
// It has its own look and login; the league's nav and footer are hidden here
// (see components/NavBar, BottomNav and HideOnPolydan).

const oswald = Oswald({ subsets: ['latin'], variable: '--font-pd-oswald', weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'PolyDan',
  description: 'The family prediction market for Iron Man',
  robots: { index: false, follow: false },
}

async function Header() {
  const user = await currentUser()
  if (!user) return null
  const balance = await balanceCents(prisma, user.id)
  return (
    <>
      <header className="sticky top-0 z-20 -mx-4 -mt-6 mb-5 border-b border-pd-line bg-pd-bg/90 backdrop-blur sm:-mx-6 lg:-mx-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <Link href="/polydan" className="flex items-baseline gap-1.5">
            <span className="font-pd-display text-xl font-bold uppercase tracking-wide text-pd-gold">PolyDan</span>
            <span className="hidden text-xs text-pd-muted sm:inline">Iron Man markets</span>
          </Link>
          <NavLinks isAdmin={user.isAdmin} />
          <AccountMenu name={user.name} balance={formatMoney(balance)} />
        </div>
      </header>
      <NavLinks isAdmin={user.isAdmin} mobile />
    </>
  )
}

export default function PolydanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`polydan ${oswald.variable} min-h-[70dvh]`}>
      {/* Balances, odds and results update on their own on every page. */}
      <LiveRefresh seconds={10} />
      <Suspense fallback={<div className="-mx-4 -mt-6 mb-5 h-12 sm:-mx-6 lg:-mx-8" />}>
        <Header />
      </Suspense>
      <div className="mx-auto max-w-5xl pb-24">
        <Suspense fallback={<p className="py-16 text-center text-sm text-pd-muted">Loading…</p>}>{children}</Suspense>
      </div>
    </div>
  )
}
