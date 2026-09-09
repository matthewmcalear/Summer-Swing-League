import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin, Trophy, AlertCircle } from 'lucide-react'

export const metadata = { title: 'SSL Open 2026 — Summer Swing League' }

export default function SSLOpenPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Hero ── */}
      <div className="rounded-2xl bg-gradient-to-br from-green-700 via-green-800 to-green-900 text-white px-6 py-8 shadow-xl">
        <div className="mb-3 flex items-center gap-2 text-green-200 text-xs font-bold uppercase tracking-widest">
          <Calendar size={14} strokeWidth={2} aria-hidden="true" />
          SSL Open
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight drop-shadow-sm mb-3">
          ⛳ Choose Your Difficulty
        </h1>
        <p className="text-green-100 text-lg font-medium mb-1">
          Saturday, September 19, 2026
        </p>
        <p className="text-green-200 text-sm">
          Course / tee time / entry / RSVP: Coming soon
        </p>
      </div>

      {/* ── Format Overview ── */}
      <div className="card bg-blue-50 border-blue-200">
        <h2 className="text-xl font-bold text-blue-900 mb-3">One Board. Three Ways to Play.</h2>
        <div className="space-y-2 text-sm text-blue-800">
          <p>
            Everyone ranked together on <strong>net score</strong>. Mixed groups. 
            <strong> Declare your tier on the first tee</strong> — locked for the round.
          </p>
          <p className="text-blue-700">
            Higher tiers mean bigger season bonuses… but harder rules.
          </p>
        </div>
      </div>

      {/* ── Mode Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Normal */}
        <div className="card border-2 border-green-600 hover:shadow-lg transition-shadow">
          <div className="relative w-full aspect-video mb-3 rounded-lg overflow-hidden bg-green-100">
            <Image
              src="/ssl-open/normal.png"
              alt="Normal mode"
              fill
              className="object-contain"
            />
          </div>
          <h3 className="text-lg font-bold text-green-900 mb-2">🏌️ Normal</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span className="font-semibold">Mulligan:</span>
              <span>1</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Gimme ≤18":</span>
              <span>1</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Curses:</span>
              <span>—</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Top 3 season payout:</div>
              <div className="font-bold text-green-700">+5 / +3 / +1</div>
            </div>
          </div>
        </div>

        {/* Hard */}
        <div className="card border-2 border-orange-500 hover:shadow-lg transition-shadow">
          <div className="relative w-full aspect-video mb-3 rounded-lg overflow-hidden bg-orange-100">
            <Image
              src="/ssl-open/hard.png"
              alt="Hard mode"
              fill
              className="object-contain"
            />
          </div>
          <h3 className="text-lg font-bold text-orange-900 mb-2">⚡ Hard</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span className="font-semibold">Mulligan:</span>
              <span>0</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Gimme ≤18":</span>
              <span>0</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Curse:</span>
              <span className="text-xs mt-1">1 one-club hole (field hole, announced first tee)</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Top 3 season payout:</div>
              <div className="font-bold text-orange-700">+7 / +4 / +2</div>
            </div>
          </div>
        </div>

        {/* God */}
        <div className="card border-2 border-purple-600 hover:shadow-lg transition-shadow">
          <div className="relative w-full aspect-video mb-3 rounded-lg overflow-hidden bg-purple-100">
            <Image
              src="/ssl-open/god.png"
              alt="God mode"
              fill
              className="object-contain"
            />
          </div>
          <h3 className="text-lg font-bold text-purple-900 mb-2">👑 God</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span className="font-semibold">Mulligan:</span>
              <span>0</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Gimme ≤18":</span>
              <span>0</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Curses:</span>
              <span className="text-xs mt-1">3 one-club holes + no driver on 1 named hole</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Top 3 season payout:</div>
              <div className="font-bold text-purple-700">+10 / +6 / +3</div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Double Down ── */}
      <div className="card bg-red-50 border-2 border-red-400">
        <div className="flex items-start gap-2 mb-3">
          <AlertCircle size={20} className="text-red-700 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-bold text-red-900">Double Down (optional)</h2>
            <p className="text-xs text-red-700 mt-1">After hole 9, declare out loud</p>
          </div>
        </div>
        <div className="space-y-3 text-sm text-red-800">
          <p>
            If your <strong>net back 9 is strictly better</strong> than your net front 9:
          </p>
          <div className="bg-white rounded-lg p-3 border border-red-300">
            <div className="font-bold text-red-900">✅ Your top-3 Open season payout ×2</div>
            <div className="text-xs text-red-700 mt-1">(capped at +14)</div>
          </div>
          <p>
            If your back 9 is <strong>worse or tied</strong>:
          </p>
          <div className="bg-white rounded-lg p-3 border border-red-300">
            <div className="font-bold text-red-900">❌ 0 Open season points</div>
            <div className="text-xs text-red-700 mt-1">Even if you finish top 3. Still eligible for Incident / CTP.</div>
          </div>
        </div>
      </div>

      {/* ── Stats Link ── */}
      <Link 
        href="/ssl-open/analysis"
        className="card border-2 border-brass-400 bg-brass-50 hover:bg-brass-100 transition-colors text-center"
      >
        <div className="text-2xl mb-2">📊</div>
        <div className="font-bold text-brass-900 text-lg mb-1">See the stats</div>
        <div className="text-sm text-brass-700">Is Normal a sucker bet?</div>
      </Link>

      {/* ── Side Prizes ── */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Side Prizes (field-wide)</h2>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>Closest-to-pin</li>
          <li>Incident award</li>
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          No fairness floor bonuses. No separate tier leaderboards.
        </p>
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
          <AlertCircle size={20} strokeWidth={2} className="text-green-700 mx-auto mb-1" aria-hidden="true" />
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

    </div>
  )
}
