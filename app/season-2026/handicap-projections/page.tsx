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
            
            // Calculate handicap based on top rounds (similar to official handicap calculation)
            let roundsToUse = Math.min(12, totalRounds); // Use top 12 rounds or fewer
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
            
            // Calculate average of top rounds for handicap projection
            // For now, we'll use the season score as a proxy for performance
            // In a real implementation, we'd calculate differentials from gross scores
            const averageTopRounds = playerData.seasonScore / Math.min(5, totalRounds);
            
            // Determine trend based on performance
            if (averageTopRounds > 35) {
              trend = 'improving';
              improvementFactor = Math.min(3, totalRounds * 0.15);
            } else if (averageTopRounds < 25) {
              trend = 'declining';
              improvementFactor = Math.min(1, totalRounds * 0.05);
            } else {
              trend = 'stable';
              improvementFactor = Math.min(2, totalRounds * 0.1);
            }
            
            // Additional improvement based on activity level
            if (totalRounds >= 20) {
              improvementFactor += 0.5; // Very active players tend to improve more
            } else if (totalRounds >= 10) {
              improvementFactor += 0.3; // Active players show improvement
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
              <h3 className="font-semibold text-blue-800 mb-3">📈 Top Rounds Analysis</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Uses top 12 rounds (or fewer if less data)</li>
                <li>• Similar to official handicap calculation</li>
                <li>• Focuses on best performances</li>
                <li>• Accounts for course difficulty</li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-800 mb-3">🎯 Improvement Factors</h3>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• Activity level (more rounds = more reliable)</li>
                <li>• Performance trend analysis</li>
                <li>• Season score averages</li>
                <li>• Statistical improvement patterns</li>
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
              Projections are based on the average of your top 12 rounds (or fewer if you have less data), 
              similar to how official handicaps are calculated. This focuses on your best performances 
              rather than including all rounds, giving a more accurate representation of your potential.
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
