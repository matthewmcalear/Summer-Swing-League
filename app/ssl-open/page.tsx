import Link from 'next/link'
import { Calendar, MapPin, Clock, DollarSign, Users, Trophy, Info } from 'lucide-react'

export const metadata = { title: 'SSL Open 2026 — Summer Swing League' }

export default function SSLOpenPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Event Hero ── */}
      <div className="rounded-2xl bg-gradient-to-br from-green-700 via-green-800 to-green-900 text-white px-6 py-8 shadow-xl">
        <div className="mb-3 flex items-center gap-2 text-green-200 text-xs font-bold uppercase tracking-widest">
          <Calendar size={14} strokeWidth={2} aria-hidden="true" />
          Upcoming Event
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight drop-shadow-sm mb-2">
          ⛳ SSL Open 2026
        </h1>
        <p className="text-green-100 text-lg font-medium mb-2">
          Saturday, September 19, 2026
        </p>
        <p className="text-green-200 text-sm">
          Event details and results live here
        </p>
      </div>

      {/* ── Event Details Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={18} strokeWidth={2} className="text-green-700" aria-hidden="true" />
            <h3 className="font-bold text-gray-900">Date</h3>
          </div>
          <p className="text-gray-600 text-sm">Saturday, September 19, 2026</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} strokeWidth={2} className="text-green-700" aria-hidden="true" />
            <h3 className="font-bold text-gray-900">Tee Time</h3>
          </div>
          <p className="text-gray-500 text-sm italic">Coming soon</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={18} strokeWidth={2} className="text-green-700" aria-hidden="true" />
            <h3 className="font-bold text-gray-900">Course</h3>
          </div>
          <p className="text-gray-500 text-sm italic">Coming soon</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={18} strokeWidth={2} className="text-green-700" aria-hidden="true" />
            <h3 className="font-bold text-gray-900">Format</h3>
          </div>
          <p className="text-gray-600 text-sm">
            <strong>Standard SSL rules game</strong> — play your individual round under regular league scoring
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} strokeWidth={2} className="text-green-700" aria-hidden="true" />
            <h3 className="font-bold text-gray-900">Entry Cost</h3>
          </div>
          <p className="text-gray-500 text-sm italic">Coming soon</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} strokeWidth={2} className="text-green-700" aria-hidden="true" />
            <h3 className="font-bold text-gray-900">RSVP</h3>
          </div>
          <p className="text-gray-500 text-sm italic">Coming soon</p>
        </div>
      </div>

      {/* ── About the Open ── */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Info size={20} strokeWidth={2} className="text-green-700" aria-hidden="true" />
          About the Open
        </h2>
        <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
          <p>
            The <strong>SSL Open</strong> is the league's premier competitive event — a chance to 
            test your game against the full field in one day under standard SSL rules.
          </p>
          <p>
            Play your individual round just like any league game, with your regular handicap and the 
            standard scoring formula. The top three finishers earn bonus points added directly to 
            their season standings.
          </p>
          <p>
            Remaining details — course, tee times, entry cost, and how to RSVP — will be announced 
            in the coming weeks.
          </p>
        </div>
      </div>

      {/* ── SSL Season Bonuses ── */}
      <div className="card bg-brass-50 border-brass-200">
        <h2 className="text-xl font-bold text-brass-900 mb-3 flex items-center gap-2">
          <Trophy size={20} strokeWidth={2} className="text-brass-700" aria-hidden="true" />
          Season Points Bonuses
        </h2>
        <div className="space-y-3 text-sm text-brass-800 leading-relaxed">
          <p>
            The top three finishers in the SSL Open will earn <strong>bonus points</strong> added 
            directly to their season score — separate from the points they earn from the round itself.
          </p>
          
          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="bg-white rounded-lg p-3 text-center border border-brass-300">
              <div className="text-2xl mb-1">🥇</div>
              <div className="font-semibold text-brass-900">1st Place</div>
              <div className="text-brass-700 font-bold text-xl mt-1">+5 pts</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center border border-brass-300">
              <div className="text-2xl mb-1">🥈</div>
              <div className="font-semibold text-brass-900">2nd Place</div>
              <div className="text-brass-700 font-bold text-xl mt-1">+3 pts</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center border border-brass-300">
              <div className="text-2xl mb-1">🥉</div>
              <div className="font-semibold text-brass-900">3rd Place</div>
              <div className="text-brass-700 font-bold text-xl mt-1">+1 pt</div>
            </div>
          </div>

          <p className="text-xs text-brass-600">
            These bonuses are awarded based on your net score for the Open round and appear 
            transparently on the Standings and Scores pages.
          </p>
          
          <p className="text-xs text-brass-600 pt-2 border-t border-brass-300">
            For more on how tournament bonuses work, see the{' '}
            <Link href="/rules" className="underline font-semibold hover:text-brass-900">
              League Rules
            </Link>.
          </p>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Trophy size={20} strokeWidth={2} className="text-green-700" aria-hidden="true" />
          Results
        </h2>
        <div className="text-center py-8 text-gray-500">
          <Trophy size={48} strokeWidth={1.5} className="text-gray-300 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm font-medium">Results will appear here after the Open</p>
          <p className="text-xs mt-1">Net scores, rankings, and bonus points awarded</p>
        </div>
      </div>

      {/* ── Links ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/standings"
          className="card text-center hover:bg-green-50 transition-colors border border-transparent hover:border-green-200"
        >
          <Trophy size={20} strokeWidth={2} className="text-green-700 mx-auto mb-1" aria-hidden="true" />
          <span className="block font-bold text-gray-900 text-sm">Standings</span>
        </Link>
        <Link
          href="/rules"
          className="card text-center hover:bg-green-50 transition-colors border border-transparent hover:border-green-200"
        >
          <Info size={20} strokeWidth={2} className="text-green-700 mx-auto mb-1" aria-hidden="true" />
          <span className="block font-bold text-gray-900 text-sm">Rules</span>
        </Link>
        <Link
          href="/"
          className="card text-center hover:bg-green-50 transition-colors border border-transparent hover:border-green-200"
        >
          <Calendar size={20} strokeWidth={2} className="text-green-700 mx-auto mb-1" aria-hidden="true" />
          <span className="block font-bold text-gray-900 text-sm">Home</span>
        </Link>
      </div>

      {/* ── Footer Note ── */}
      <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800 text-center">
        <p className="font-bold text-green-900">⛳ Mark your calendar — September 19th.</p>
        <p className="mt-1 text-green-700">
          Full event details coming soon. Check back or watch for announcements.
        </p>
      </div>

    </div>
  )
}
