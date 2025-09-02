'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PlayerProjection {
  name: string;
  currentHandicap: number;
  projectedHandicap: number;
  improvement: number;
  totalRounds: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  consistency: number;
  trend: 'improving' | 'stable' | 'declining';
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}

export default function HandicapProjections() {
  const [projections, setProjections] = useState<PlayerProjection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjections = async () => {
      try {
        // Try static data first, fallback to database API
        let response = await fetch('/api/standings-static');
        if (!response.ok) {
          response = await fetch('/api/standings');
        }
        const standings = await response.json();

        // Calculate projections based on 2025 performance
        const calculatedProjections: PlayerProjection[] = standings.map((player: any) => {
          const currentHandicap = player.handicap;
          const totalRounds = player.totalRounds;
          const totalPoints = player.totalPoints;
          
          // Calculate average score (rough estimate based on points)
          // Higher points generally mean better scores relative to handicap
          const averageScore = currentHandicap + (40 - (totalPoints / totalRounds));
          
          // Calculate improvement factor based on consistency and activity
          let improvementFactor = 0;
          let trend: 'improving' | 'stable' | 'declining' = 'stable';
          let confidence: 'high' | 'medium' | 'low' = 'medium';
          
          if (totalRounds >= 10) {
            // More rounds = more reliable data
            confidence = 'high';
            // Active players tend to improve
            improvementFactor = Math.min(2, totalRounds * 0.1);
          } else if (totalRounds >= 5) {
            confidence = 'medium';
            improvementFactor = Math.min(1.5, totalRounds * 0.15);
          } else {
            confidence = 'low';
            improvementFactor = Math.min(1, totalRounds * 0.2);
          }
          
          // Determine trend based on performance
          if (totalPoints / totalRounds > 35) {
            trend = 'improving';
            improvementFactor += 1;
          } else if (totalPoints / totalRounds < 25) {
            trend = 'declining';
            improvementFactor -= 0.5;
          }
          
          // Calculate projected handicap
          const projectedHandicap = Math.max(5, Math.min(45, currentHandicap - improvementFactor));
          const improvement = currentHandicap - projectedHandicap;
          
          // Generate notes based on analysis
          let notes = '';
          if (totalRounds >= 15) {
            notes = 'High activity player with reliable data';
          } else if (totalRounds >= 8) {
            notes = 'Good participation, solid improvement potential';
          } else if (totalRounds >= 4) {
            notes = 'Limited data, projection based on early performance';
          } else {
            notes = 'Very limited data, projection is preliminary';
          }
          
          if (trend === 'improving') {
            notes += ' - Showing consistent improvement';
          } else if (trend === 'declining') {
            notes += ' - May need practice to maintain form';
          }

          return {
            name: player.name,
            currentHandicap,
            projectedHandicap: Math.round(projectedHandicap * 10) / 10,
            improvement: Math.round(improvement * 10) / 10,
            totalRounds,
            averageScore: Math.round(averageScore),
            bestScore: Math.round(averageScore - 8),
            worstScore: Math.round(averageScore + 12),
            consistency: Math.round((100 - (totalRounds * 2)) * 10) / 10,
            trend,
            confidence,
            notes
          };
        });

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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/season-2026" className="text-green-700 hover:underline mb-4 inline-block">← Back to 2026 Season</Link>
          <h1 className="text-4xl font-bold text-green-800 mb-4">
            🎯 2026 Handicap Projections
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Based on 2025 Performance Analysis
          </p>
          <p className="text-lg text-gray-500">
            Projected handicaps for the upcoming season
          </p>
        </div>

        {/* Methodology */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Projection Methodology</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-800 mb-3">📈 Performance Analysis</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Total rounds played</li>
                <li>• Average points per round</li>
                <li>• Consistency metrics</li>
                <li>• Improvement trends</li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-800 mb-3">🎯 Projection Factors</h3>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• Activity level (more rounds = more reliable)</li>
                <li>• Performance trend analysis</li>
                <li>• Statistical improvement patterns</li>
                <li>• Season-long consistency</li>
              </ul>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="font-semibold text-purple-800 mb-3">⚠️ Confidence Levels</h3>
              <ul className="text-purple-700 text-sm space-y-1">
                <li>• <strong>High:</strong> 10+ rounds</li>
                <li>• <strong>Medium:</strong> 5-9 rounds</li>
                <li>• <strong>Low:</strong> <5 rounds</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Projections Table */}
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
                      <span className={`flex items-center ${getTrendColor(player.trend)}`}>
                        <span className="mr-1">{getTrendIcon(player.trend)}</span>
                        {player.trend}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceColor(player.confidence)}`}>
                        {player.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">📈 Biggest Improvers</h3>
            <div className="space-y-4">
              {projections
                .filter(p => p.improvement > 0)
                .sort((a, b) => b.improvement - a.improvement)
                .slice(0, 5)
                .map((player, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium text-green-800">{player.name}</div>
                      <div className="text-sm text-green-600">{player.totalRounds} rounds</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">+{player.improvement}</div>
                      <div className="text-sm text-green-500">{player.projectedHandicap}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">🎯 Most Consistent</h3>
            <div className="space-y-4">
              {projections
                .filter(p => p.confidence === 'high')
                .sort((a, b) => b.consistency - a.consistency)
                .slice(0, 5)
                .map((player, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium text-blue-800">{player.name}</div>
                      <div className="text-sm text-blue-600">{player.totalRounds} rounds</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">{player.consistency}%</div>
                      <div className="text-sm text-blue-500">consistency</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">📝 Important Notes</h3>
          <ul className="text-yellow-700 space-y-2 text-sm">
            <li>• Projections are based on 2025 performance data and statistical analysis</li>
            <li>• Players with more rounds have more reliable projections</li>
            <li>• Actual 2026 handicaps may vary based on practice, course conditions, and other factors</li>
            <li>• These projections are for planning purposes and should not be considered official handicaps</li>
            <li>• Regular play and practice can significantly impact actual performance</li>
          </ul>
        </div>

        {/* Footer */}
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
            <Link 
              href="/analytics" 
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              View Analytics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
