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
          📊 Is Normal a Sucker Bet?
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
              <div className="text-2xl font-bold text-green-900">0.69</div>
              <div className="text-xs text-green-700 mt-1">Expected Open finish bonus</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <div className="text-xs text-orange-700 font-semibold mb-1">HARD</div>
              <div className="text-2xl font-bold text-orange-900">0.64</div>
              <div className="text-xs text-orange-700 mt-1">Expected Open finish bonus</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="text-xs text-purple-700 font-semibold mb-1">GOD</div>
              <div className="text-2xl font-bold text-purple-900">0.42</div>
              <div className="text-xs text-purple-700 mt-1">Expected Open finish bonus</div>
            </div>
          </div>

          <p>
            <strong>Normal has the best average</strong> (0.69 expected points), but only slightly ahead of Hard (0.64). 
            God mode is <strong>negative expected value</strong> under the assumed curse penalties (+1.9/+4.8 strokes).
          </p>
          
          <p>
            <strong>Double Down is -EV in general.</strong> Your back-nine needs to be strictly better than the front, 
            but P(back&lt;front) ≈ 50% for most players. God 1st place needs ~71% success rate to break even due to the +14 cap.
          </p>

          <p className="text-xs text-gray-600 italic">
            Optional: Hard 1st place payout could be increased to +8 if we want to incentivize more Hard entries.
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
          alt="Bar chart showing expected Open season points by tier: Normal 0.69, Hard 0.64, God 0.44"
          className="w-full h-auto rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          N=10,000 sims · random ~50/35/15 Normal/Hard/God each sim · no DD · curse +1.9/+4.8 strokes
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
          alt="Bar chart showing Matthew's expected value: highest with No DD or conditional DD strategies"
          className="w-full h-auto rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          N=10,000 · others fixed mix B by standings rank · Matthew skill mean net=79.6 (n=7)
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
          alt="Chart showing DD success rates needed: ~50% baseline, but 71% for God 1st due to +14 cap"
          className="w-full h-auto rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          Place-conditional: need p ≥ base / min(2·base, 14). Cap binds God 1st (20→14). Front/back corr=0.4.
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
          alt="Bar chart: Normal gives 8.7% win / 24.9% top-3, Hard 5.1% / 17.1%, God 2.0% / 8.5%"
          className="w-full h-auto rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          Median standings player: Sophie Therien · others on mix B · N=10,000 · no DD
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
          alt="Horizontal bar chart of season standings: Matthew 235.7, Thomas 230.2, Rachel 225.5"
          className="w-full h-auto rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          From standings.json · Matthew 235.7 · Thomas 230.2 · Rachel 225.5 · Dan 223.9
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
          N=10,000 · payout Normal 5/3/1 · Hard 7/4/2 · God 10/6/3 · field=17
        </p>
      </div>

      {/* ── Key Takeaways ── */}
      <div className="card bg-blue-50 border-blue-200">
        <h2 className="text-xl font-bold text-blue-900 mb-3">Key Takeaways</h2>
        <ul className="space-y-2 text-sm text-blue-800 list-disc list-inside">
          <li>
            <strong>Normal is safe, not stupid.</strong> Highest EV for most players, best top-3 odds for median skill.
          </li>
          <li>
            <strong>Hard is close behind.</strong> Only ~8% lower EV on average, decent upside if you're confident.
          </li>
          <li>
            <strong>God is for glory.</strong> Negative EV under these curse assumptions, but 3× the payout if you win.
          </li>
          <li>
            <strong>Skip Double Down.</strong> Unless you have strong evidence your back-nine is consistently better, 
            the 50% base rate makes it -EV even without the cap.
          </li>
          <li>
            <strong>Field mix matters.</strong> If everyone picks Normal, winning gets harder. Strategic tier choice could help.
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
