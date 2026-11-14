import { Suspense } from 'react'
import Link from 'next/link'
import Loading from '@/app/polydan/loading'
import { requireUser } from '@/lib/polydan/auth'
import { getSuggestPage } from '@/lib/polydan/queries'
import { SuggestForm } from '@/components/polydan/SuggestForm'

export const metadata = { title: 'PolyDan · Suggest a market' }

// Sync shell + boundary (the SSL pattern for Cache Components): the page itself
// touches no request data, so navigation can show the placeholder instantly.
export default function SuggestPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SuggestPageContent />
    </Suspense>
  )
}

async function SuggestPageContent() {
  const user = await requireUser()
  const { edition, open, ready, competitors, mine, adminName } = await getSuggestPage(user.id)

  return (
    <div className="space-y-6">
      <header>
        <p className="pd-eyebrow">Suggest a market</p>
        <h1 className="font-pd-display text-3xl font-bold uppercase tracking-wide">Got a bet in mind?</h1>
        <p className="mt-1 max-w-prose text-sm text-pd-ink-2">
          Suggest it here. {adminName} checks every suggestion, and once it’s approved it opens for everyone to bet on.
        </p>
      </header>

      {!ready ? (
        <p className="pd-card p-4 text-sm text-pd-muted">Suggestions are switching on shortly. Check back soon!</p>
      ) : open ? (
        <section className="pd-card max-w-xl p-4">
          <SuggestForm competitors={competitors} adminName={adminName} />
        </section>
      ) : (
        <p className="pd-card p-4 text-sm text-pd-muted">
          {edition
            ? `Iron Man ${edition.number} is finished, so suggestions are closed.`
            : 'No Iron Man is set up yet.'}
        </p>
      )}

      {mine.length > 0 && (
        <section>
          <h2 className="pd-eyebrow mb-2">Your suggestions</h2>
          <ul className="pd-card divide-y divide-pd-line">
            {mine.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 font-medium">{p.title}</span>
                {p.status === 'PENDING' && <span className="font-semibold text-pd-gold">Waiting for approval</span>}
                {p.status === 'APPROVED' &&
                  (p.market ? (
                    <Link
                      href={`/polydan/market?id=${p.market.id}`}
                      className="font-semibold text-pd-yes hover:underline"
                    >
                      ✓ Open — bet on it →
                    </Link>
                  ) : (
                    <span className="font-semibold text-pd-yes">✓ Approved</span>
                  ))}
                {p.status === 'REJECTED' && (
                  <span className="w-full text-pd-muted sm:w-auto">
                    <span className="font-semibold text-pd-no">Not approved</span>
                    {p.reply && <> · “{p.reply}”</>}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
