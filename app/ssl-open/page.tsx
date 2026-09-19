import Link from 'next/link'
import Image from 'next/image'
import OpenClient from './live/OpenClient'
import { OPEN_FIELD_PLAYERS } from '@/lib/open-types'
import { Calendar, MapPin, Trophy, AlertCircle } from 'lucide-react'

export const metadata = { title: 'SSL Open 2026 Results — Summer Swing League' }

export default function SSLOpenPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── HERO: Gold Photo-Backed Banner ── */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ minHeight: '340px' }}>
        <Image
          src="/IMG_1002.jpeg"
          alt="SSL Open 2026"
          fill
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/85 via-green-800/75 to-emerald-800/80" />
        
        <div className="relative z-10 px-6 sm:px-8 py-8 sm:py-12 text-white">
          <div className="mb-3 flex items-center gap-2 text-green-200 text-xs font-bold uppercase tracking-widest">
            <Trophy size={14} strokeWidth={2} aria-hidden="true" />
            Event Complete
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight drop-shadow-lg mb-4">
            ⛳ SSL Open 2026 Results
          </h1>
          <div className="space-y-2 mb-5">
            <p className="text-green-50 text-xl sm:text-2xl font-bold drop-shadow-md">
              🏆 Connor Peltz — Champion
            </p>
            <p className="text-green-100 text-base sm:text-lg drop-shadow">
              Saturday, September 19, 2026 · <strong>Golf Ste-Rose</strong>
            </p>
          </div>
          <p className="text-green-50 text-base sm:text-lg max-w-2xl leading-relaxed drop-shadow">
            Final results from the one-day league Open with net scoring. Everyone competed on a single leaderboard
            with their chosen difficulty mode.
          </p>
        </div>
      </div>

      {/* ── Quick Facts Strip ── */}
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-900 text-xs font-bold border border-green-200">
          <Trophy size={13} strokeWidth={2} aria-hidden="true" />
          Event Complete
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200">
          Net scoring
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 text-purple-900 text-xs font-bold border border-purple-200">
          10 players
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-900 text-xs font-bold border border-orange-200">
          Golf Ste-Rose
        </span>
      </div>

      {/* ── Who Played ── */}
      <div className="card bg-green-50 border-green-200">
        <h2 className="text-xl font-bold text-green-900 mb-3 flex items-center gap-2">
          <Trophy size={20} strokeWidth={2} className="text-green-700" aria-hidden="true" />
          The Field
        </h2>
        <p className="text-sm text-green-800 mb-3">
          Players who competed in the SSL Open 2026:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-sm">
          {OPEN_FIELD_PLAYERS.map((name) => (
            <div key={name} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-green-200">
              <span className="text-green-700">✓</span>
              <span className="font-medium text-gray-900">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tee Groups ── */}
      <div className="card bg-blue-50 border-blue-200">
        <h2 className="text-xl font-bold text-blue-900 mb-3 flex items-center gap-2">
          <Calendar size={20} strokeWidth={2} className="text-blue-700" aria-hidden="true" />
          Tee Groups
        </h2>
        <p className="text-sm text-blue-800 mb-4">
          Official tee sheet from Saturday, September 19, 2026:
        </p>
        <div className="space-y-3">
          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <div className="font-bold text-blue-900 mb-2">1:00 PM — Group 1</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div>Matthew McAlear</div>
              <div>Dan McAlear</div>
              <div>Nicholas Clarke</div>
              <div>Spence Goodwin</div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <div className="font-bold text-blue-900 mb-2">1:10 PM — Group 2</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div>Thomas McAlear</div>
              <div>Rachel Kuta</div>
              <div>Griffin Mason</div>
              <div className="text-gray-500 italic">Griffin's girlfriend (guest)</div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <div className="font-bold text-blue-900 mb-2">1:20 PM — Group 3</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div>Alex Sokaris</div>
              <div>Shaun Anderson</div>
              <div>Connor Peltz</div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-3 italic">
          Note: Griffin's girlfriend is playing as a guest. Live scoring tracks league members only, 
          so her scores won't appear on the leaderboard, but she's part of the group on the day.
        </p>
      </div>

      <OpenClient compact />

      {/* ── FINAL RESULTS ── */}
      <div className="card bg-gradient-to-br from-green-600 to-emerald-600 text-white border-2 border-green-700">
        <div className="flex items-center gap-3 mb-4">
          <Trophy size={28} strokeWidth={2.5} className="text-green-100" aria-hidden="true" />
          <h2 className="text-2xl font-bold">Final Results & Live Leaderboard</h2>
        </div>
        <p className="text-green-50 text-base mb-4 leading-relaxed">
          View the complete leaderboard with hole-by-hole scoring, final standings, and season impact. 
          All Open rounds and results are preserved in the live scoring system.
        </p>
        <Link
          href="/ssl-open/live"
          className="inline-flex items-center gap-2 px-5 py-3 bg-white text-green-900 rounded-xl font-bold hover:bg-green-50 transition-all shadow-lg"
        >
          <Trophy size={18} strokeWidth={2} aria-hidden="true" />
          View Full Leaderboard & Scorecards
        </Link>
      </div>

      {/* ── RULES SECTION ── */}
      <div className="space-y-6 pt-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Event Rules & Format</h2>
          <p className="text-sm text-gray-600 mb-4">
            How the SSL Open 2026 worked — preserved for historical reference and future events.
          </p>
          <div className="text-gray-700 space-y-4 leading-relaxed text-sm sm:text-base">
            
            {/* Season scoring first */}
            <div>
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2">Counted for SSL Season Score</h3>
              <p className="mb-2">
                The SSL Open was a <strong>regular league round</strong> on Saturday, September 19, 2026. 
                Each player's round counted toward their <strong>Summer Swing League season score</strong> under the same scoring rules 
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

            {/* Curse fairness explanation */}
            <div className="card bg-yellow-50 border-yellow-200">
              <h3 className="font-bold text-base sm:text-lg text-yellow-900 mb-2">⚡ Curse Constraints (Hard & God)</h3>
              <p className="mb-2 text-sm text-yellow-800">
                To keep curses challenging and fair:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-yellow-800">
                <li>
                  <strong>One-club holes must not be par 3s.</strong> Using one club on a short hole is too easy. 
                  Players declare which par 4 or par 5 hole(s) they'll use one club on at the first tee.
                </li>
                <li>
                  <strong>No-driver restriction (God mode) must be a par 5.</strong> Some players don't use driver on shorter holes anyway, 
                  so the restriction forces the challenge on the longest holes where driver matters most.
                </li>
              </ul>
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
                  src="/ssl-open/normal.jpg"
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
                  src="/ssl-open/hard.jpg"
                  alt="Hard mode"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-orange-900 mb-1">⚡ Hard</h3>
                <div className="text-xs text-orange-700 font-semibold">Open finish bonus:</div>
                <div className="text-sm font-bold text-orange-700">+10 / +6 / +2</div>
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
                <span className="text-xs mt-0.5">1 one-club hole per nine (not par 3s; announced first tee)</span>
              </div>
            </div>
          </div>

          {/* God */}
          <div className="card border-2 border-purple-600 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-purple-100 shrink-0">
                <Image
                  src="/ssl-open/god.jpg"
                  alt="God mode"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-purple-900 mb-1">👑 God</h3>
                <div className="text-xs text-purple-700 font-semibold">Open finish bonus:</div>
                <div className="text-sm font-bold text-purple-700">+25 / +12 / +6</div>
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
                <span className="text-xs mt-0.5">3 one-club holes (not par 3s) + no driver on 1 par 5</span>
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
                If you finish top 3 overall, your <strong>Open finish bonus is doubled</strong> with <strong>no cap</strong>.
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
          <h3 className="text-lg font-bold text-green-900 mb-3">Season Score Impact</h3>
          <p className="text-sm text-gray-700 mb-3">
            <strong>Each Open round counted toward SSL season scores exactly like any other league round.</strong> Normal SSL 
            scoring rules applied (top-5 rounds, participation points, etc.). See the{' '}
            <Link href="/rules" className="text-green-700 hover:text-green-900 font-semibold hover:underline">
              full SSL rules
            </Link>.
          </p>
          <p className="text-sm text-gray-700 mb-3">
            <strong>Open finish bonuses:</strong> Top 3 finishers earned an <strong>Open finish bonus</strong> based on 
            their mode (+5/3/1 for Normal, +10/6/2 for Hard, +25/12/6 for God), added to their season score on top of the normal 
            points earned for playing the round.
          </p>
          <p className="text-sm text-gray-700 mb-3">
            Successful Double Down declarations doubled the finish bonus with no cap. Failed Double Down 
            attempts earned 0 Open finish bonus (but kept normal round points).
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
