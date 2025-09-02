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
        let response = await fetch('/api/standings-static');
        if (!response.ok) {
          response = await fetch('/api/standings');
        }
        const standings = await response.json();

        const calculatedProjections: PlayerProjection[] = standings.map((player: any) => {
          const currentHandicap = player.handicap;
          const totalRounds = player.totalRounds;
          const totalPoints = player.totalPoints;
          
          let improvementFactor = 0;
          let trend: 'improving' | 'stable' | 'declining' = 'stable';
          let confidence: 'high' | 'medium' | 'low' = 'medium';
          
          if (totalRounds >= 10) {
            confidence = 'high';
            improvementFactor = Math.min(2, totalRounds * 0.1);
          } else if (totalRounds >= 5) {
            confidence = 'medium';
            improvementFactor = Math.min(1.5, totalRounds * 0.15);
          } else {
            confidence = 'low';
            improvementFactor = Math.min(1, totalRounds * 0.2);
          }
          
          if (totalPoints / totalRounds > 35) {
            trend = 'improving';
            improvementFactor += 1;
          } else if (totalPoints / totalRounds < 25) {
            trend = 'declining';
            improvementFactor -= 0.5;
          }
          
          const projectedHandicap = Math.max(5, Math.min(45, currentHandicap - improvementFactor));
          const improvement = currentHandicap - projectedHandicap;

          return {
            name: player.name,
            currentHandicap,
            projectedHandicap: Math.round(projectedHandicap * 10) / 10,
            improvement: Math.round(improvement * 10) / 10,
            totalRounds,
            trend,
            confidence
          };
        });

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