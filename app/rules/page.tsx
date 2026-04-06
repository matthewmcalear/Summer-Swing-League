export default function Rules() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">League Rules</h1>

      <div className="card space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Purpose</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            The SSL was created to maximize summer golf fun by fostering camaraderie and friendly competition
            through group play. It offers a flexible, fun format with cash prizes that accommodates any skill level,
            schedule, and location — while rewarding personal improvement and participation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Season</h2>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Duration: April 15 – October 10, 2026</li>
            <li>Eligibility: Registered league members only</li>
            <li>Cost: Free (players pay their own green fees)</li>
            <li>Format: Group play required — no solo rounds</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-green-800 mb-3">Rules</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h3 className="font-semibold text-gray-800">1. Group Play Requirement</h3>
              <p>Every round must include at least one other registered league member. Rounds with non-members do not count.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">2. Handicap Tracking</h3>
              <p>
                Enter your current 18-hole handicap index each time you submit a round. Your profile handicap
                updates automatically, and your history is tracked throughout the season.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">3. Scoring Formula</h3>
              <p className="mb-2">Points reward skill, group play, and course difficulty:</p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-xs">
                <div><span className="font-semibold">9 holes:</span> Base = 75 − (Gross − Handicap ÷ 2)</div>
                <div><span className="font-semibold">18 holes:</span> Base = (150 − (Gross − Handicap)) ÷ 2</div>
                <div className="border-t pt-2">
                  <span className="font-semibold">Adjusted</span> = Base × Difficulty Multiplier
                </div>
                <div>
                  <span className="font-semibold">Total</span> = Adjusted + Group Bonus + Commissioner Bonus
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">4. Course Difficulty</h3>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[
                  { label: 'Easy',    mult: '×0.95' },
                  { label: 'Average', mult: '×1.00' },
                  { label: 'Tough',   mult: '×1.05' },
                ].map(({ label, mult }) => (
                  <div key={label} className="bg-gray-50 rounded p-2 text-center">
                    <div className="font-medium">{label}</div>
                    <div className="text-green-700 font-bold">{mult}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">5. Group Bonus</h3>
              <p>+1 point per additional verified league member in your group (not counting yourself).</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">6. Commissioner Bonus</h3>
              <p>
                The commissioner may award additional bonus points to any round at their discretion —
                for example, for winning a special one-day tournament, a closest-to-the-pin contest,
                or any other event. These points are added directly to that round's total and are
                visible on the Scores page.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Season Score</h2>
          <p className="text-sm text-gray-600 mb-2">
            Your <strong>season score</strong> is based on your top 5 rounds, multiplied by a participation factor,
            plus an improvement bonus:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs mb-4 space-y-1">
            <div>Season Score = (Top 5 Points × Participation Multiplier) + Improvement Bonus</div>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-2">Participation multiplier:</p>
          <div className="grid grid-cols-5 gap-2 text-center text-sm mb-4">
            {[
              { rounds: '1', mult: '×0.20' },
              { rounds: '2', mult: '×0.40' },
              { rounds: '3', mult: '×0.60' },
              { rounds: '4', mult: '×0.80' },
              { rounds: '5+', mult: '×1.00' },
            ].map(({ rounds, mult }) => (
              <div key={rounds} className="bg-green-50 rounded-lg p-2">
                <div className="font-semibold text-green-800">{rounds}</div>
                <div className="text-xs text-green-600">{rounds === '1' ? 'round' : 'rounds'}</div>
                <div className="font-bold text-green-700 mt-1">{mult}</div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            <h3 className="font-semibold mb-1">✨ Improvement Bonus (New for 2026)</h3>
            <p className="mb-2">
              Your handicap is tracked live throughout the season. Your <strong>first round</strong> locks
              in your starting handicap. For every stroke your handicap drops from that starting point,
              you earn <strong>+3 bonus points</strong> added directly to your season score.
            </p>
            <div className="bg-white rounded-lg p-3 font-mono text-xs">
              <div>Improvement = Starting Handicap − Current Handicap</div>
              <div>Bonus = Improvement × 3 pts &nbsp;(minimum 0)</div>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Example: You start the season at handicap 18 and finish at 15 — that's 3 strokes improved
              = +9 bonus points on your season score. There is no penalty if your handicap goes up.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Prizes</h2>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl">🥇</div>
              <div className="font-semibold mt-1">1st Place</div>
              <div className="text-yellow-700 font-bold text-lg">$250</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl">🥈</div>
              <div className="font-semibold mt-1">2nd Place</div>
              <div className="text-gray-700 font-bold text-lg">$150</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl">🥉</div>
              <div className="font-semibold mt-1">3rd Place</div>
              <div className="font-bold text-lg" style={{ color: '#cd7f32' }}>$75</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Prizes paid out after October 10, 2026.</p>
        </section>
      </div>
    </div>
  )
}
