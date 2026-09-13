import Link from 'next/link'
import { BarChart3, ArrowLeft, AlertTriangle } from 'lucide-react'

export const metadata = { title: 'SSL Open Analysis — Summer Swing League' }

export default function SSLOpenAnalysisPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white px-6 py-8 shadow-xl">
        <div className="mb-3 flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-widest">
          <BarChart3 size={14} strokeWidth={2} aria-hidden="true" />
          Statistical Analysis
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight drop-shadow-sm mb-3">
          📊 Should You Go God Mode?
        </h1>
        <p className="text-blue-100 text-sm">
          10,000 simulations · 17 season-active players · field mix B
        </p>
      </div>

      {/* ── Model Disclaimer ── */}
      <div className="card bg-yellow-50 border-yellow-300">
        <div className="flex items-start gap-2">
          <AlertTriangle size={18} className="text-yellow-700 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="text-sm text-yellow-800">
            <strong className="text-yellow-900">Model, not prophecy.</strong> These simulations assume 
            historical skill distributions, random field mixes, and simplified curse penalties. Your actual 
            results will vary based on field composition, your skill level, and luck.
          </div>
        </div>
      </div>

      {/* ── Executive Summary ── */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Executive Summary</h2>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="text-xs text-green-700 font-semibold mb-1">NORMAL</div>
              <div className="text-2xl font-bold text-green-900">0.66</div>
              <div className="text-xs text-green-700 mt-1">Expected Open finish bonus</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <div className="text-xs text-orange-700 font-semibold mb-1">HARD</div>
              <div className="text-2xl font-bold text-orange-900">0.92</div>
              <div className="text-xs text-orange-700 mt-1">Expected Open finish bonus</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="text-xs text-purple-700 font-semibold mb-1">GOD</div>
              <div className="text-2xl font-bold text-purple-900">1.17</div>
              <div className="text-xs text-purple-700 mt-1">Expected Open finish bonus</div>
            </div>
          </div>

          <p>
            <strong>God mode has the highest expected value</strong> (1.17 points), followed by Hard (0.92), with Normal 
            trailing at 0.66. The new generous payouts (God 25/12/6, Hard 10/6/2) more than compensate for the curse 
            penalties (+1.9/+4.8 strokes).
          </p>
          
          <p>
            <strong>Double Down is now 50% breakeven across all tiers.</strong> With the +14 cap removed, DD simply 
            doubles your finish bonus on success. Your back-nine needs to be better than the front, and P(back&lt;front) 
            ≈ 50% for most players—making DD approximately break-even but high-variance.
          </p>

          <p>
            <strong>Risk-reward is clear:</strong> Normal is safe and consistent, God offers maximum upside with higher 
            variance, and Hard sits comfortably in between.
          </p>
        </div>
      </div>

      {/* ── Chart: EV by Tier ── */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Expected Value by Tier</h2>
        <p className="text-sm text-gray-600 mb-4">
          Average Open finish bonus points earned per player, assuming random field mix and no Double Down.
        </p>
        <img
          src="/ssl-open/analysis/ev_by_tier.png"
          alt="Bar chart showing expected Open season points by tier: Normal 0.66, Hard 0.92, God 1.17"
          className="w-full h-auto rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          N=10,000 · ~50/35/15 Normal/Hard/God · no DD · curse +1.9/+4.8 · NEW PAYOUTS: Normal 5/3/1, Hard 10/6/2, God 25/12/6
        </p>
      </div>

      {/* ── Chart: Matthew EV ── */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Matthew McAlear — EV by Tier × DD Strategy</h2>
        <p className="text-sm text-gray-600 mb-4">
          Comparing Double Down strategies for the current season leader across all three tiers.
        </p>
        <img
          src="/ssl-open/analysis/matthew_ev.png"
          alt="Bar chart showing Matthew's expected value across tiers and DD strategies: God highest, conditional DD best"
          className="w-full h-auto rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          N=10,000 · others mix B · Matthew skill mean net=79.6 · NEW PAYOUTS (God 25/12/6, Hard 10/6/2)
        </p>
      </div>

      {/* ── Chart: DD Breakeven ── */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Double Down Breakeven Analysis</h2>
        <p className="text-sm text-gray-600 mb-4">
          Success rate needed for Double Down to outperform no-DD strategy, by place and tier.
        </p>
        <img
          src="/ssl-open/analysis/dd_breakeven.png"
          alt="Chart showing DD success rates needed: 50% for all tiers and places (no cap)"
          className="w-full h-auto rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          Place-conditional: need p ≥ base / (2·base) = 0.5. NO CAP — all breakeven at 50% now! Front/back corr=0.4.
        </p>
      </div>

      {/* ── Chart: Win Probability ── */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Win & Top-3 Probability by Tier Choice</h2>
        <p className="text-sm text-gray-600 mb-4">
          If the median player (Sophie Therien) picks each tier, what are her chances?
        </p>
        <img
          src="/ssl-open/analysis/win_prob_by_tier_choice.png"
          alt="Bar chart: Normal gives 7.7% win / 22.2% top-3, Hard 4.8% / 15.5%, God 2.4% / 9.1%"
          className="w-full h-auto rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          Median player (avg skill) · others on mix B · N=10,000 · no DD
        </p>
      </div>

      {/* ── Chart: Standings Context ── */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Current Season Standings (Top 12)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Who benefits most from Open bonuses? Matthew leads, Thomas close behind, Rachel third.
        </p>
        <img
          src="/ssl-open/analysis/standings_context.png"
          alt="Horizontal bar chart of season standings with new payout arrows: +5 Normal 1st, +25 God 1st"
          className="w-full h-auto rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          Current standings · NEW PAYOUTS: Normal 5/3/1, Hard 10/6/2, God 25/12/6
        </p>
      </div>

      {/* ── Chart: Stroke Penalty Tornado ── */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Stroke-Penalty Tornado (Hard/God EV Sensitivity)</h2>
        <p className="text-sm text-gray-600 mb-4">
          How much do different curse penalties change the expected value for Hard and God modes?
        </p>
        <img
          src="/ssl-open/analysis/stroke_penalty_tornado.png"
          alt="Tornado chart showing EV sensitivity to curse penalties: one-club dominates the range"
          className="w-full h-auto rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          One-at-a-time sweeps · mix B random · defaults one-club=1.2, gimme=0.3, mulligan=0.4, driver=0.5
        </p>
      </div>

      {/* ── Chart: Fairness Gini ── */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Inequality of Open EV & Season-Leader Capture</h2>
        <p className="text-sm text-gray-600 mb-4">
          Does tier choice affect how evenly Open points are distributed, or how often the season leader wins?
        </p>
        <img
          src="/ssl-open/analysis/fairness_gini.png"
          alt="Two charts: Gini ~0.37-0.39 across scenarios; season-leader capture ~37% all cases"
          className="w-full h-auto rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          N=10,000 · no DD · Gini on player EVs · top-5 by current seasonScore
        </p>
      </div>

      {/* ── Chart: Points Distribution ── */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Open Finish Bonus Points Under Mix B (Fixed by Rank, No DD)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Distribution of Open finish bonus points awarded and how they spread across the top-12 players.
        </p>
        <img
          src="/ssl-open/analysis/points_distribution.png"
          alt="Histogram and box plots showing points distribution across simulations and players"
          className="w-full h-auto rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          N=10,000 · NEW PAYOUTS: Normal 5/3/1, Hard 10/6/2, God 25/12/6 · field=17
        </p>
      </div>

      {/* ── Key Takeaways ── */}
      <div className="card bg-blue-50 border-blue-200">
        <h2 className="text-xl font-bold text-blue-900 mb-3">Key Takeaways</h2>
        <ul className="space-y-2 text-sm text-blue-800 list-disc list-inside">
          <li>
            <strong>God mode is the EV winner.</strong> Highest expected value (1.17) despite curse penalties. The 25/12/6 
            payouts are very generous.
          </li>
          <li>
            <strong>Hard offers strong upside.</strong> 0.92 EV with more manageable curse penalties (+1.9 vs +4.8). 
            Good middle ground.
          </li>
          <li>
            <strong>Normal is the conservative play.</strong> Lowest variance and lowest EV (0.66), but best win probability 
            for median players.
          </li>
          <li>
            <strong>Double Down is true neutral.</strong> 50% breakeven across all tiers now that the cap is gone. 
            High-variance, zero-sum in expectation.
          </li>
          <li>
            <strong>Field mix still matters.</strong> If everyone picks God, your win odds improve. Strategic tier choice 
            remains relevant.
          </li>
        </ul>
      </div>

      {/* ── Back Link ── */}
      <Link
        href="/ssl-open"
        className="card text-center hover:bg-green-50 transition-colors border border-transparent hover:border-green-200 flex flex-col items-center"
      >
        <ArrowLeft size={20} strokeWidth={2} className="text-green-700 mb-1" aria-hidden="true" />
        <span className="font-bold text-gray-900 text-sm">Back to SSL Open</span>
      </Link>

    </div>
  )
}
