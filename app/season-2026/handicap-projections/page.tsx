'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PlayerProjection {
  name: string;
  currentHandicap: number;
  projectedHandicap: number;
  improvement: number;
  totalRounds: number;
  trend: 'improving' | 'stable' | 'declining';
  confidence: 'high' | 'medium' | 'low';
}

export default function HandicapProjections() {
  const [projections, setProjections] = useState<PlayerProjection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjections = async () => {
      try {
        // Fetch individual player data to get detailed score information
        let response = await fetch('/api/members');
        if (!response.ok) {
          throw new Error('Failed to fetch members');
        }
        const members = await response.json();

        const calculatedProjections: PlayerProjection[] = [];

        for (const member of members) {
          try {
            // Get detailed player data including all scores
            const playerResponse = await fetch(`/api/players/${member.id}`);
            if (!playerResponse.ok) continue;
            
            const playerData = await playerResponse.json();
            
            if (playerData.totalRounds === 0) continue;

            const currentHandicap = playerData.handicap;
            const totalRounds = playerData.totalRounds;
            
            // Calculate handicap projection based on net scores from top rounds
            // This is the proper way to calculate handicap changes
            
            let improvementFactor = 0;
            let trend: 'improving' | 'stable' | 'declining' = 'stable';
            let confidence: 'high' | 'medium' | 'low' = 'medium';
            
            // Determine confidence based on total rounds
            if (totalRounds >= 15) {
              confidence = 'high';
            } else if (totalRounds >= 8) {
              confidence = 'medium';
            } else {
              confidence = 'low';
            }
            
            // Get all scores for this player from the scores API
            const scoresResponse = await fetch('/api/scores');
            if (!scoresResponse.ok) continue;
            const allScores = await scoresResponse.json();
            
            // Filter scores for this specific player
            const playerScores = allScores.filter((score: any) => {
              const players = score.player.split(',');
              return players[0].trim() === playerData.name;
            });
            
            if (playerScores.length === 0) continue;
            
            // Calculate net scores for each round
            const netScores = playerScores.map((score: any) => {
              const grossScore = score.gross;
              const courseHandicap = currentHandicap * score.difficulty;
              const netScore = grossScore - courseHandicap;
              return {
                netScore,
                grossScore,
                holes: score.holes,
                difficulty: score.difficulty,
                date: score.play_date
              };
            });
            
            // Debug logging for Matthew and Thomas
            if (playerData.name === 'Matthew McAlear' || playerData.name === 'Thomas McAlear') {
              console.log(`${playerData.name} - Current Handicap: ${currentHandicap}, Total Rounds: ${playerScores.length}`);
              console.log('Top 5 net scores:', netScores.slice(0, 5).map((s: any) => ({ net: s.netScore, gross: s.grossScore, holes: s.holes })));
            }
            
            // Sort by net score (best first) and take top 12 rounds
            const sortedNetScores = netScores.sort((a: any, b: any) => a.netScore - b.netScore);
            const roundsToUse = Math.min(12, sortedNetScores.length);
            const topRounds = sortedNetScores.slice(0, roundsToUse);
            
            // Calculate average net score from top rounds
            const averageNetScore = topRounds.reduce((sum: number, round: any) => sum + round.netScore, 0) / roundsToUse;
            
            // Calculate handicap differential (how much better/worse than par)
            // For 18-hole rounds, par is typically 72, for 9-hole it's 36
            const averagePar = topRounds.reduce((sum: number, round: any) => {
              return sum + (round.holes === 18 ? 72 : 36);
            }, 0) / roundsToUse;
            
            const handicapDifferential = averageNetScore - averagePar;
            
            // Calculate improvement factor based on performance vs current handicap
            // If playing better than handicap suggests, reduce handicap
            // If playing worse than handicap suggests, increase handicap
            improvementFactor = -handicapDifferential * 0.8; // 80% of differential as improvement
            
            // Cap the improvement to reasonable limits
            improvementFactor = Math.max(-5, Math.min(5, improvementFactor));
            
            // Determine trend based on net score performance
            if (handicapDifferential < -2) {
              trend = 'improving';
            } else if (handicapDifferential > 2) {
              trend = 'declining';
            } else {
              trend = 'stable';
            }
            
            const projectedHandicap = Math.max(5, Math.min(45, currentHandicap - improvementFactor));
            const improvement = currentHandicap - projectedHandicap;

            calculatedProjections.push({
              name: playerData.name,
              currentHandicap,
              projectedHandicap: Math.round(projectedHandicap * 10) / 10,
              improvement: Math.round(improvement * 10) / 10,
              totalRounds,
              trend,
              confidence
            });
          } catch (error) {
            console.error(`Error processing player ${member.id}:`, error);
            continue;
          }
        }

        // Sort by projected handicap (best first)
        calculatedProjections.sort((a, b) => a.projectedHandicap - b.projectedHandicap);
        setProjections(calculatedProjections);
      } catch (error) {
        console.error('Error fetching projections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjections();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <Link href="/season-2026" className="text-green-700 hover:underline mb-4 inline-block">← Back to 2026 Season</Link>
          <h1 className="text-4xl font-bold text-green-800 mb-4">
            🎯 2026 Handicap Projections
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Based on 2025 Performance Analysis
          </p>
        </div>

        {/* Methodology */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Projection Methodology</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-800 mb-3">📈 Net Score Analysis</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Uses top 12 rounds (or fewer if less data)</li>
                <li>• Calculates net scores (gross - course handicap)</li>
                <li>• Accounts for course difficulty and slope</li>
                <li>• Similar to official handicap calculation</li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-800 mb-3">🎯 Handicap Calculation</h3>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• Compares net scores to par (72 for 18-hole, 36 for 9-hole)</li>
                <li>• Calculates handicap differential from top rounds</li>
                <li>• 80% of differential applied as handicap change</li>
                <li>• Capped at ±5 strokes for reasonable projections</li>
              </ul>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="font-semibold text-purple-800 mb-3">⚠️ Confidence Levels</h3>
              <ul className="text-purple-700 text-sm space-y-1">
                <li>• <strong>High:</strong> 15+ rounds</li>
                <li>• <strong>Medium:</strong> 8-14 rounds</li>
                <li>• <strong>Low:</strong> &lt;8 rounds</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">🎯 Handicap Calculation Method</h4>
            <p className="text-yellow-700 text-sm">
              Projections are based on your top 12 rounds (or fewer if you have less data) using net scores. 
              We calculate net scores by subtracting your course handicap from your gross score, then compare 
              the average of your best net scores to par. This gives a true measure of your potential performance 
              and is similar to how official handicaps are calculated.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🏆 2026 Handicap Projections</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projected</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rounds</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projections.map((player, index) => (
                  <tr key={index} className={index < 3 ? 'bg-yellow-50' : index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {player.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.currentHandicap}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      {player.projectedHandicap}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                      player.improvement > 0 ? 'text-green-600' : 
                      player.improvement < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {player.improvement > 0 ? `+${player.improvement}` : player.improvement}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.totalRounds}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {player.trend}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        player.confidence === 'high' ? 'bg-green-100 text-green-800' :
                        player.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {player.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">
            Ready to see how these projections play out in 2026?
          </p>
          <div className="space-x-4">
            <Link 
              href="/season-2026" 
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Back to 2026 Season
            </Link>
            <Link 
              href="/standings" 
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View 2025 Standings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
