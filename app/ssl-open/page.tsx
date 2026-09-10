import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin, Trophy, AlertCircle } from 'lucide-react'

export const metadata = { title: 'SSL Open 2026 — Summer Swing League' }

export default function SSLOpenPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── HERO: Event Title First ── */}
      <div className="rounded-2xl bg-gradient-to-br from-green-700 via-green-800 to-green-900 text-white px-6 sm:px-8 py-8 sm:py-12 shadow-xl">
        <div className="mb-3 flex items-center gap-2 text-green-200 text-xs font-bold uppercase tracking-widest">
          <Calendar size={14} strokeWidth={2} aria-hidden="true" />
          Annual Event
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight drop-shadow-sm mb-4">
          SSL Open 2026
        </h1>
        <div className="space-y-2 mb-5">
          <p className="text-green-50 text-xl sm:text-2xl font-bold">
            Saturday, September 19, 2026
          </p>
          <p className="text-green-200 text-base sm:text-lg">
            Time & Location: Coming soon
          </p>
        </div>
        <p className="text-green-100 text-base sm:text-lg max-w-2xl leading-relaxed">
          One-day league Open with net scoring. Everyone competes on a single leaderboard. 
          Pick your difficulty on the first tee and earn season bonuses.
        </p>
      </div>

      {/* ── Quick Facts Strip ── */}
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-900 text-xs font-bold border border-green-200">
          <Calendar size={13} strokeWidth={2} aria-hidden="true" />
          Sept 19, 2026
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200">
          Net scoring
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 text-purple-900 text-xs font-bold border border-purple-200">
          One board
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-900 text-xs font-bold border border-orange-200">
          Declare tier first tee
        </span>
      </div>

      {/* ── Results (placeholder) ── */}
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

      {/* ── RULES SECTION ── */}
      <div className="space-y-6 pt-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">How It Works</h2>
          <div className="text-gray-700 space-y-2 leading-relaxed">
            <p>
              Everyone competes on <strong>one leaderboard</strong>, ranked by net score. 
              Mixed groups. On the first tee, <strong>declare your difficulty tier</strong> 
              (Normal, Hard, or God) — your choice is locked for the round.
            </p>
            <p className="text-gray-600 text-sm">
              Higher tiers unlock bigger season bonuses if you finish top 3… but come with harder rules.
            </p>
          </div>
        </div>

        {/* ── Mode Cards (compact) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Normal */}
          <div className="card border-2 border-green-600 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-green-100 shrink-0">
                <Image
                  src="/ssl-open/normal.png"
                  alt="Normal mode"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-green-900 mb-1">🏌️ Normal</h3>
                <div className="text-xs text-green-700 font-semibold">Season payout:</div>
                <div className="text-sm font-bold text-green-700">+5 / +3 / +1</div>
              </div>
            </div>
            <div className="space-y-1.5 text-sm text-gray-700">
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
                <span>None</span>
              </div>
            </div>
          </div>

          {/* Hard */}
          <div className="card border-2 border-orange-500 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-orange-100 shrink-0">
                <Image
                  src="/ssl-open/hard.png"
                  alt="Hard mode"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-orange-900 mb-1">⚡ Hard</h3>
                <div className="text-xs text-orange-700 font-semibold">Season payout:</div>
                <div className="text-sm font-bold text-orange-700">+7 / +4 / +2</div>
              </div>
            </div>
            <div className="space-y-1.5 text-sm text-gray-700">
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
                <span className="text-xs mt-0.5">1 one-club hole (announced first tee)</span>
              </div>
            </div>
          </div>

          {/* God */}
          <div className="card border-2 border-purple-600 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-purple-100 shrink-0">
                <Image
                  src="/ssl-open/god.png"
                  alt="God mode"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-purple-900 mb-1">👑 God</h3>
                <div className="text-xs text-purple-700 font-semibold">Season payout:</div>
                <div className="text-sm font-bold text-purple-700">+10 / +6 / +3</div>
              </div>
            </div>
            <div className="space-y-1.5 text-sm text-gray-700">
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
                <span className="text-xs mt-0.5">3 one-club + no driver on 1 hole</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── Double Down ── */}
        <div className="card bg-red-50 border-2 border-red-400">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle size={20} className="text-red-700 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <h3 className="text-xl font-bold text-red-900">Double Down (optional)</h3>
              <p className="text-xs text-red-700 mt-1">After hole 9, declare out loud</p>
            </div>
          </div>
          <div className="space-y-2.5 text-sm text-red-800">
            <div className="bg-white rounded-lg p-3 border border-red-300">
              <div className="font-bold text-red-900 mb-1">✅ If net back 9 &lt; net front 9:</div>
              <div className="text-xs text-red-700">Your top-3 season payout ×2 (capped at +14)</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-red-300">
              <div className="font-bold text-red-900 mb-1">❌ If back 9 worse or tied:</div>
              <div className="text-xs text-red-700">0 Open season points, even if you finish top 3. Still eligible for Incident / CTP.</div>
            </div>
          </div>
        </div>

        {/* ── Side Prizes ── */}
        <div className="card border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Side Prizes</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="text-green-700">🎯</span>
              <div>
                <div className="font-semibold">Closest-to-pin</div>
                <div className="text-xs text-gray-600">Field-wide competition</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-orange-700">💀</span>
              <div>
                <div className="font-semibold">Incident award</div>
                <div className="text-xs text-gray-600">For the most memorable moment</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
            No fairness floor bonuses. No separate tier leaderboards.
          </p>
        </div>

        {/* ── Stats Link ── */}
        <div className="text-center">
          <Link 
            href="/ssl-open/analysis"
            className="inline-block text-brass-700 hover:text-brass-900 text-sm font-semibold hover:underline"
          >
            📊 Stats: Is Normal a sucker bet? →
          </Link>
        </div>

      </div>

      {/* ── Quick Links ── */}
      <div className="flex flex-wrap gap-3 justify-center pt-4 border-t border-gray-200">
        <Link
          href="/standings"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors text-sm font-semibold text-gray-700 hover:text-green-800"
        >
          <Trophy size={16} strokeWidth={2} aria-hidden="true" />
          Standings
        </Link>
        <Link
          href="/rules"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors text-sm font-semibold text-gray-700 hover:text-green-800"
        >
          <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
          League Rules
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors text-sm font-semibold text-gray-700 hover:text-green-800"
        >
          <Calendar size={16} strokeWidth={2} aria-hidden="true" />
          Home
        </Link>
      </div>

    </div>
  )
}
