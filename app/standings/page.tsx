import Link from 'next/link'
import { getStandings, participationMultiplier } from '@/lib/standings'

export const dynamic = 'force-dynamic'

const medalFor = (i: number) =>
  i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`

const rowBg = (i: number) =>
  i === 0 ? 'bg-yellow-50' : i === 1 ? 'bg-gray-50' : i === 2 ? 'bg-orange-50' : ''

export default async function Standings() {
  const standings = await getStandings()

  // Mark tied players (same season score as adjacent entry)
  const tiedIds = new Set<string>()
  for (let i = 0; i < standings.length - 1; i++) {
    if (standings[i].seasonScore === standings[i + 1].seasonScore) {
      tiedIds.add(standings[i].id)
      tiedIds.add(standings[i + 1].id)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">League Standings</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Season score = sum of best 5 rounds × participation multiplier + improvement bonus + tournament bonuses
        </p>
      </div>

      {standings.length === 0 ? (
        <div className="card text-center text-gray-500 py-16">No scores submitted yet.</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-green-50 text-xs font-semibold text-green-800 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 text-left w-10">Rank</th>
                <th className="px-3 py-3 text-left">Player</th>
                <th className="px-3 py-3 text-left hidden sm:table-cell">Hdcp</th>
                <th className="px-3 py-3 text-left hidden sm:table-cell">Rnds</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Top Pts</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Improve ✨</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Bonuses 🏆</th>
                <th className="px-3 py-3 text-left">Score</th>
                <th className="px-3 py-3 text-left hidden lg:table-cell">Best Rounds</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((p, i) => (
                <tr key={p.id} className={`border-t border-gray-100 ${rowBg(i)}`}>
                  <td className="px-3 py-3 font-bold text-base">{medalFor(i)}</td>
                  <td className="px-3 py-3">
                    <div className="font-semibold flex items-center gap-1.5">
                      <Link href={`/analytics?tab=player&id=${p.id}`} className="hover:text-green-700 hover:underline">
                        {p.name}
                      </Link>
                      {tiedIds.has(p.id) && (
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded px-1 py-0.5 leading-none">TIE</span>
                      )}
                    </div>
                    {p.totalRounds > 0 && p.totalRounds < 5 && (
                      <div className="text-xs text-amber-600 font-medium mt-0.5">
                        ⏳ {5 - p.totalRounds} more round{5 - p.totalRounds !== 1 ? 's' : ''} to unlock 100% (now {Math.round(participationMultiplier(p.totalRounds) * 100)}%)
                      </div>
                    )}
                    <div className="sm:hidden mt-1 space-y-0.5">
                      <div className="text-xs text-gray-400 flex flex-wrap gap-x-2">
                        <span>Hdcp {p.currentHandicap}</span>
                        <span>· {p.totalRounds} {p.totalRounds === 1 ? 'round' : 'rounds'}</span>
                      </div>
                      {p.topScores.length > 0 && (
                        <div className="text-xs text-gray-300">
                          Top: {p.topScores.map((s) => s.toFixed(1)).join(' · ')}
                        </div>
                      )}
                      {p.handicapImprovement > 0 && (
                        <div className="text-xs text-blue-600 font-medium">✨ −{p.handicapImprovement} hdcp improvement</div>
                      )}
                      {p.seasonBonusPoints > 0 && (
                        <div className="text-xs text-amber-600 font-medium">🏆 +{p.seasonBonusPoints.toFixed(1)} tournament bonus</div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell text-gray-600">{p.currentHandicap}</td>
                  <td className="px-3 py-3 hidden sm:table-cell text-gray-600">{p.totalRounds}</td>
                  <td className="px-3 py-3 hidden md:table-cell text-gray-600">{p.totalPoints.toFixed(1)}</td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    {p.handicapImprovement > 0 ? (
                      <span className="text-blue-700 font-semibold">
                        −{p.handicapImprovement} (+{p.improvementBonus.toFixed(1)} pts)
                      </span>
                    ) : p.startingHandicap == null ? (
                      <span className="text-gray-300 text-xs">no rounds yet</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    {p.seasonBonuses.length > 0 ? (
                      <div className="space-y-0.5">
                        {p.seasonBonuses.map((b) => (
                          <div key={b.id} className="text-amber-700 font-semibold text-xs">
                            +{b.points} <span className="font-normal text-gray-500">{b.reason}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-bold text-green-700 text-base">{p.seasonScore.toFixed(1)}</td>
                  <td className="px-3 py-3 hidden lg:table-cell text-xs text-gray-500">
                    {p.topScores.map((s) => s.toFixed(1)).join(' · ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card bg-green-50 border-green-200 text-sm text-green-800">
          <strong>Participation multiplier</strong><br />
          1 round = 20% · 2 = 40% · 3 = 60% · 4 = 80% · 5+ = 100%
          of your top-5 total.
        </div>
        <div className="card bg-blue-50 border-blue-200 text-sm text-blue-800">
          <strong>Improvement bonus ✨</strong><br />
          Every stroke your handicap drops from your first round earns
          +3 bonus points to your season score.
        </div>
        <div className="card bg-amber-50 border-amber-200 text-sm text-amber-800 sm:col-span-2">
          <strong>Tournament bonuses 🏆</strong><br />
          Special events (scrambles, invitationals, etc.) may award direct season bonus points
          decided by the commissioner — shown individually on the standings for full transparency.
        </div>
      </div>
    </div>
  )
}
