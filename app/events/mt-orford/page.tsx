import Link from 'next/link'

export const metadata = { title: 'Mt. Orford League Event — Sunday, August 2' }

const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=Golf+Mont-Orford%2C+3074+Chemin+du+Parc%2C+Orford%2C+QC+J1X+7A9'

export default function MtOrfordEventPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* ── Hero ── */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-800 text-white px-6 py-8 shadow-xl">
        <p className="text-sky-200 text-xs font-bold uppercase tracking-widest mb-1">
          Next League-Sanctioned Event
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight drop-shadow-sm">
          ⛰️ Golf at Mt. Orford
        </h1>
        <p className="text-sky-100 text-lg font-semibold mt-2">Sunday, August 2, 2026</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="rounded-xl bg-white/15 backdrop-blur px-3 py-2 text-sm font-bold">🕦 Tee time 1 — 11:16 AM</span>
          <span className="rounded-xl bg-white/15 backdrop-blur px-3 py-2 text-sm font-bold">🕦 Tee time 2 — 11:25 AM</span>
          <span className="rounded-xl bg-white/15 backdrop-blur px-3 py-2 text-sm font-bold">🕦 Tee time 3 — 11:34 AM</span>
        </div>
        <p className="text-sky-200 text-xs mt-3">3 slots currently booked — back-to-back groups.</p>
      </div>

      {/* ── Points on offer ── */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">🏆 Points on Offer</h2>
        <div className="space-y-3">
          <div className="flex gap-3 items-start rounded-xl bg-green-50 border border-green-200 p-4">
            <span className="text-2xl shrink-0">✅</span>
            <div>
              <p className="font-bold text-gray-900 text-sm">Attendance — +3 points</p>
              <p className="text-sm text-gray-600 mt-0.5">
                Every member who plays earns a <strong>+3 bonus on their Mt. Orford round</strong>, counting
                toward the season score. When you submit your score, enter <strong>3</strong> in the{' '}
                <em>Commissioner Bonus</em> field.
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start rounded-xl bg-yellow-50 border border-yellow-200 p-4">
            <span className="text-2xl shrink-0">🥇</span>
            <div>
              <p className="font-bold text-gray-900 text-sm">Best SSL score of the day — +2 season points</p>
              <p className="text-sm text-gray-600 mt-0.5">
                The player with the best SSL score at Mt. Orford earns <strong>+2 bonus points added
                directly to their season score</strong> (not the round score), awarded after the event.
                It will show transparently on the standings.
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Your round also earns normal SSL points like any other league round — the event bonuses are on top.
        </p>
      </div>

      {/* ── Course info ── */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">📍 Golf Mont-Orford</h2>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="text-green-700 font-semibold hover:underline">
              3074 Chem. du Parc, Orford, QC J1X 7A9 ↗
            </a>
          </p>
          <p>
            <a href="https://montorford.com" target="_blank" rel="noopener noreferrer" className="text-green-700 font-semibold hover:underline">
              montorford.com ↗
            </a>
          </p>
          <p>
            <a href="tel:+18198435688" className="text-green-700 font-semibold hover:underline">
              (819) 843-5688
            </a>
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm transition-colors"
          >
            🗺️ Directions
          </a>
          <a
            href="https://montorford.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-3 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-bold text-sm transition-colors"
          >
            🌐 Course Website
          </a>
        </div>
      </div>

      {/* ── Contacts ── */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900">
        <p className="font-bold">Want in, or need details?</p>
        <p className="mt-1 text-sky-800">
          Contact <strong>Matt McAlear</strong> or <strong>Eviatar Fields</strong> for details and assistance
          — spots in the two booked tee times are limited.
        </p>
      </div>

      {/* ── CTA ── */}
      <div className="flex gap-2">
        <Link
          href="/submit-score"
          className="flex-1 text-center py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-sm transition-colors"
        >
          ⛳ Submit a Round
        </Link>
        <Link
          href="/standings"
          className="flex-1 text-center py-3 rounded-xl bg-white border border-gray-200 hover:border-green-400 text-gray-800 font-bold text-sm transition-colors"
        >
          📊 Standings
        </Link>
      </div>

    </div>
  )
}
