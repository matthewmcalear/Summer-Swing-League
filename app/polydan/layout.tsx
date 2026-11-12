import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Rajdhani, Share_Tech_Mono } from 'next/font/google'
import Link from 'next/link'
import { currentUser } from '@/lib/polydan/auth'
import { balanceCents } from '@/lib/polydan/markets'
import { pendingProposalCount } from '@/lib/polydan/queries'
import { prisma } from '@/lib/prisma'
import { formatMoney } from '@/lib/polydan/money'
import { NavLinks } from '@/components/polydan/NavLinks'
import { AccountMenu } from '@/components/polydan/AccountMenu'
import { LiveRefresh } from '@/components/polydan/ui'
import { HudBackdrop, ReactorMark } from '@/components/polydan/HudBackdrop'

// PolyDan: the family's Iron Man prediction market, living inside the SSL site.
// It has its own look and login; the league's nav and footer are hidden here
// (see components/NavBar, BottomNav and HideOnPolydan).

const display = Rajdhani({ subsets: ['latin'], variable: '--font-pd-display-face', weight: ['500', '600', '700'] })
const mono = Share_Tech_Mono({ subsets: ['latin'], variable: '--font-pd-mono-face', weight: '400' })

export const metadata: Metadata = {
  title: 'PolyDan',
  description: 'The family prediction market for Iron Man',
  robots: { index: false, follow: false },
}

async function Header() {
  const user = await currentUser()
  if (!user) return null
  const [balance, pending] = await Promise.all([
    balanceCents(prisma, user.id),
    user.isAdmin ? pendingProposalCount() : 0,
  ])
  return (
    <>
      <header className="sticky top-0 z-20 -mx-4 -mt-6 mb-5 bg-pd-bg/80 backdrop-blur-md sm:-mx-6 lg:-mx-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <Link href="/polydan" className="flex items-center gap-2">
            <ReactorMark className="size-7" />
            <span className="font-pd-display text-2xl leading-none font-bold uppercase tracking-[0.14em] text-pd-gold [text-shadow:0_0_14px_rgba(242,182,50,0.45)]">
              PolyDan
            </span>
            <span className="hidden font-pd-mono text-[0.65rem] uppercase tracking-[0.2em] text-pd-arc/70 sm:inline">
              Iron Man markets
            </span>
          </Link>
          <NavLinks isAdmin={user.isAdmin} pending={pending} />
          <AccountMenu name={user.name} balance={formatMoney(balance)} />
        </div>
        <div className="pd-edge" />
      </header>
      <NavLinks isAdmin={user.isAdmin} pending={pending} mobile />
    </>
  )
}

export default function PolydanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`polydan ${display.variable} ${mono.variable} min-h-[70dvh]`}>
      <HudBackdrop />
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
