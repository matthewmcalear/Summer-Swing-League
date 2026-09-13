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
            <strong>Golf Boucherville</strong> · Tee times: 11:20 & 11:28
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

      {/* ── Who's In ── */}
      <div className="card bg-green-50 border-green-200">
        <h2 className="text-xl font-bold text-green-900 mb-3 flex items-center gap-2">
          <Trophy size={20} strokeWidth={2} className="text-green-700" aria-hidden="true" />
          Who's In
        </h2>
        <p className="text-sm text-green-800 mb-3">
          Confirmed players for the SSL Open 2026:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-sm">
          {[
            'Matthew McAlear',
            'Thomas McAlear',
            'Dan McAlear',
            'Connor Peltz',
            'Alex Sokaris',
            'Tibi Mitran',
            'Shaun Anderson',
          ].map((name) => (
            <div key={name} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-green-200">
              <span className="text-green-700">✓</span>
              <span className="font-medium text-gray-900">{name}</span>
            </div>
          ))}
        </div>
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
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
          <div className="text-gray-700 space-y-4 leading-relaxed text-sm sm:text-base">
            
            {/* Season scoring first */}
            <div>
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2">This Counts for Your SSL Season Score</h3>
              <p className="mb-2">
                The SSL Open is a <strong>regular league round</strong> on Saturday, September 19, 2026. 
                Your round counts toward your <strong>Summer Swing League season score</strong> under the same scoring rules 
                as any other league event (top-5 rounds, participation points, etc.).
              </p>
              <p>
                <Link href="/rules" className="text-green-700 hover:text-green-900 font-semibold hover:underline">
                  → See full SSL season scoring rules
                </Link>
              </p>
            </div>

            {/* Open-specific twists */}
            <div className="card bg-blue-50 border-blue-200">
              <h3 className="font-bold text-base sm:text-lg text-blue-900 mb-2">The Only Open-Specific Twists</h3>
              <p>
                Everything else is standard SSL. The <strong>only</strong> special rules for the Open are:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2 text-blue-800">
                <li><strong>Modes</strong> (Normal / Hard / God) — pick your difficulty and earn bonus points for top-3 finishes</li>
                <li><strong>Double Down</strong> (optional gamble) — risk your Open bonus to double it</li>
              </ul>
            </div>

            {/* One leaderboard */}
            <div>
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2">One Leaderboard for Everyone</h3>
              <p className="mb-2">
                All players are ranked together on a <strong>single leaderboard by net score</strong> (your gross score minus your handicap). 
                It doesn't matter if you picked Normal, Hard, or God — everyone competes on the same board.
              </p>
              <p>
                Groups will be mixed on purpose. You'll be playing alongside people who chose different modes.
              </p>
            </div>

            {/* Pick a tier */}
            <div>
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2">Pick Your Mode on the First Tee (Locked In)</h3>
              <p className="mb-2">
                Before you tee off, you must <strong>declare your mode out loud</strong> to your group: Normal, Hard, or God. 
                Once you declare, that choice is <strong>locked for the entire round</strong> — no switching.
              </p>
              <p>
                Each mode has its own personal rules (mulligans, gimmes, curses). If you finish in the top 3 overall on the 
                leaderboard, you earn an <strong>Open finish bonus</strong> added to your season score — higher modes pay bigger bonuses.
              </p>
            </div>

            {/* What each tier means - intro to the cards below */}
            <div>
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2">The Three Modes</h3>
              <p>
                Each mode has different personal rules and different <strong>Open finish bonuses</strong> for the top 3 finishers. 
                Here's what you're signing up for:
              </p>
            </div>
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
                <div className="text-xs text-green-700 font-semibold">Open finish bonus:</div>
                <div className="text-sm font-bold text-green-700">+5 / +3 / +1</div>
              </div>
            </div>
            <div className="space-y-1.5 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="font-semibold">Mulligan:</span>
                <span>1 per 9 holes</span>
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
                <div className="text-xs text-orange-700 font-semibold">Open finish bonus:</div>
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
                <div className="text-xs text-purple-700 font-semibold">Open finish bonus:</div>
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
              <h3 className="text-xl font-bold text-red-900">Double Down (Optional Gamble)</h3>
              <p className="text-xs text-red-700 mt-1">Declare at the turn — after hole 9</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-red-800">
            <p>
              At the turn (after you finish hole 9), you can optionally <strong>declare "Double Down" out loud</strong> to your group. 
              This is a gamble on your back 9 performance:
            </p>
            
            <div className="bg-white rounded-lg p-3 border border-red-300">
              <div className="font-bold text-red-900 mb-2">✅ If you succeed:</div>
              <p className="text-sm mb-1">
                Your <strong>net back 9</strong> must be <strong>strictly better</strong> (lower score) than your <strong>net front 9</strong>.
              </p>
              <p className="text-sm">
                If you finish top 3 overall, your <strong>Open finish bonus is doubled</strong>.
              </p>
            </div>

            <div className="bg-red-900 text-white rounded-lg p-3 border-2 border-red-700 font-bold">
              <div className="text-lg mb-1">⚠️ DOUBLE DOWN CAP: +14 POINTS MAXIMUM</div>
              <p className="text-sm font-normal">
                Even if your doubled bonus would be higher (e.g., God 1st = 10×2 = 20), you get a maximum of <strong>+14 total Open finish bonus</strong>.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-red-300">
              <div className="font-bold text-red-900 mb-2">❌ If you fail:</div>
              <p className="text-sm mb-1">
                Your net back 9 is <strong>worse or tied</strong> with your net front 9.
              </p>
              <p className="text-sm">
                You get <strong>0 Open finish bonus</strong>, even if you finish top 3. 
                You're still eligible for Closest-to-Pin and Incident awards.
              </p>
            </div>

            <p className="text-xs text-red-700 italic">
              Double Down is all-or-nothing. Bet wisely.
            </p>
          </div>
        </div>

        {/* ── Side Prizes ── */}
        <div className="card border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Side Prizes</h3>
          <p className="text-sm text-gray-700 mb-3">
            These awards are <strong>field-wide</strong> — everyone is eligible regardless of tier:
          </p>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="text-green-700">🎯</span>
              <div>
                <div className="font-semibold">Closest-to-Pin</div>
                <div className="text-xs text-gray-600">Best shot on a designated par 3</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-orange-700">💀</span>
              <div>
                <div className="font-semibold">Incident Award</div>
                <div className="text-xs text-gray-600">For the most memorable on-course moment</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
            Note: No fairness floor bonuses. No separate tier leaderboards.
          </p>
        </div>

        {/* ── Season Points ── */}
        <div className="card bg-green-50 border-green-200">
          <h3 className="text-lg font-bold text-green-900 mb-3">How This Affects Your Season Score</h3>
          <p className="text-sm text-gray-700 mb-3">
            <strong>Your Open round counts toward your SSL season score exactly like any other league round.</strong> Normal SSL 
            scoring rules apply (top-5 rounds, participation points, etc.). See the{' '}
            <Link href="/rules" className="text-green-700 hover:text-green-900 font-semibold hover:underline">
              full SSL rules
            </Link>.
          </p>
          <p className="text-sm text-gray-700 mb-3">
            <strong>The only extra:</strong> If you finish in the top 3 on the Open leaderboard, you earn an <strong>Open finish bonus</strong> for 
            your mode (+5/3/1 for Normal, +7/4/2 for Hard, +10/6/3 for God). This bonus is added to your season score on top of the normal 
            points you already earned for playing the round.
          </p>
          <p className="text-sm text-gray-700 mb-3">
            If you successfully Double Down, your Open finish bonus is doubled (hard capped at +14 points maximum). If you fail Double Down, 
            you get 0 Open finish bonus (but still keep your normal round points).
          </p>
          <div className="flex flex-col sm:flex-row gap-2 text-sm">
            <Link 
              href="/rules" 
              className="text-green-700 hover:text-green-900 font-semibold hover:underline"
            >
              → See full SSL scoring rules
            </Link>
            <Link 
              href="/ssl-open/analysis" 
              className="text-green-700 hover:text-green-900 font-semibold hover:underline"
            >
              → Check the mode stats
            </Link>
          </div>
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
