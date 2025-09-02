'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Player {
  id: number;
  name: string;
  handicap: number;
  totalRounds: number;
  totalPoints: number;
  seasonScore: number;
  topScores: number[];
}

interface LeagueCompletionData {
  finalStandings: Player[];
  winners: {
    first: Player | null;
    second: Player | null;
    third: Player | null;
    mostRounds: Player | null;
  };
  prizes: {
    first: number;
    second: number;
    third: number;
    mostRounds: number;
  };
  seasonStats: {
    totalPlayers: number;
    totalRounds: number;
    seasonDuration: string;
  };
}

export default function LeagueComplete() {
  const [data, setData] = useState<LeagueCompletionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompletionData() {
      try {
        // Try to fetch raw data from members and scores APIs
        const [membersResponse, scoresResponse] = await Promise.all([
          fetch('/api/members'),
          fetch('/api/scores')
        ]);

        if (!membersResponse.ok || !scoresResponse.ok) {
          // Database is not available (likely removed for off-season)
          setData(null);
          setLoading(false);
          return;
        }

        const [members, scores] = await Promise.all([
          membersResponse.json(),
          scoresResponse.json()
        ]);

        // Filter out test members
        const realMembers = members.filter((member: any) => !member.is_test);
        
        // Calculate standings for each member
        const standings: Player[] = realMembers.map((member: any) => {
          // Find scores where the player field starts with the member's name
          const memberScores = scores.filter((score: any) => {
            const players = score.player.split(',');
            return players[0].trim() === member.full_name;
          });

          const totalRounds = memberScores.length;
          
          // Calculate total points
          const sortedScores = [...memberScores].sort((a: any, b: any) => Number(b.total_points ?? 0) - Number(a.total_points ?? 0));
          const bestScores = sortedScores.slice(0, 5);
          
          // Sum of best 5 (or fewer) rounds
          const totalPoints = bestScores.reduce((sum: number, score: any) => sum + Number(score.total_points ?? 0), 0);

          // Season score multiplier based on number of rounds played
          let multiplier = 1;
          if (totalRounds < 5) {
            multiplier = [0.2, 0.4, 0.6, 0.8][totalRounds - 1] || 1;
          }

          const seasonScore = totalPoints * multiplier;

          const topScores = bestScores.map((s: any) => Number(s.total_points ?? 0));

          return {
            id: member.id,
            name: member.full_name,
            handicap: member.handicap,
            totalRounds,
            totalPoints,
            seasonScore,
            topScores,
          };
        });

        // Sort by season score
        standings.sort((a, b) => b.seasonScore - a.seasonScore);
        
        // Calculate winners
        const first = standings[0] || null;
        const second = standings[1] || null;
        const third = standings[2] || null;
        
        // Find player with most rounds (tie breaker: highest total points)
        const mostRounds = standings.reduce((max: Player | null, player: Player) => {
          if (!max) return player;
          if (player.totalRounds > max.totalRounds) return player;
          if (player.totalRounds === max.totalRounds && player.totalPoints > max.totalPoints) return player;
          return max;
        }, null);

        const completionData: LeagueCompletionData = {
          finalStandings: standings,
          winners: { first, second, third, mostRounds },
          prizes: {
            first: 250,
            second: 150,
            third: 75,
            mostRounds: 75
          },
          seasonStats: {
            totalPlayers: standings.length,
            totalRounds: standings.reduce((sum: number, player: Player) => sum + player.totalRounds, 0),
            seasonDuration: 'May 1 - August 31, 2025'
          }
        };

        setData(completionData);
      } catch (error) {
        console.error('Error fetching completion data:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchCompletionData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen py-12 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-green-800 mb-4">
              🏆 League Complete! 🏆
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              Summer Swing League 2025 Season Results
            </p>
            <p className="text-lg text-gray-500">
              May 1 - August 31, 2025
            </p>
          </div>

          {/* Archive Notice */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="text-center">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                League Data Archived
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                The 2025 Summer Swing League has been completed and the database has been archived for the off-season to save costs.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">📊 Season Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {data ? data.seasonStats.totalPlayers : 'Multiple'}
                    </p>
                    <p className="text-blue-700">Players Participated</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {data ? data.seasonStats.totalRounds : 'Many'}
                    </p>
                    <p className="text-blue-700">Total Rounds Played</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">$550</p>
                    <p className="text-blue-700">Total Prize Pool</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-green-800 mb-3">🏆 Prize Winners</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🥇</div>
                    <p className="font-semibold text-green-800">1st Place</p>
                    {data && data.winners.first ? (
                      <>
                        <p className="text-green-700 font-medium">{data.winners.first.name}</p>
                        <p className="text-green-600 text-sm">Score: {data.winners.first.seasonScore.toFixed(2)}</p>
                        <p className="text-green-600">$250</p>
                      </>
                    ) : (
                      <p className="text-green-600">$250</p>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🥈</div>
                    <p className="font-semibold text-green-800">2nd Place</p>
                    {data && data.winners.second ? (
                      <>
                        <p className="text-green-700 font-medium">{data.winners.second.name}</p>
                        <p className="text-green-600 text-sm">Score: {data.winners.second.seasonScore.toFixed(2)}</p>
                        <p className="text-green-600">$150</p>
                      </>
                    ) : (
                      <p className="text-green-600">$150</p>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🥉</div>
                    <p className="font-semibold text-green-800">3rd Place</p>
                    {data && data.winners.third ? (
                      <>
                        <p className="text-green-700 font-medium">{data.winners.third.name}</p>
                        <p className="text-green-600 text-sm">Score: {data.winners.third.seasonScore.toFixed(2)}</p>
                        <p className="text-green-600">$75</p>
                      </>
                    ) : (
                      <p className="text-green-600">$75</p>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🏌️</div>
                    <p className="font-semibold text-green-800">Going the Distance</p>
                    {data && data.winners.mostRounds ? (
                      <>
                        <p className="text-green-700 font-medium">{data.winners.mostRounds.name}</p>
                        <p className="text-green-600 text-sm">{data.winners.mostRounds.totalRounds} rounds</p>
                        <p className="text-green-600">$75</p>
                      </>
                    ) : (
                      <p className="text-green-600">$75</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-3">📅 Next Season</h3>
                <p className="text-yellow-700 mb-2">
                  The Summer Swing League will return in <strong>May 2026</strong>!
                </p>
                <p className="text-sm text-yellow-600">
                  All league data has been safely backed up and will be restored when the new season begins.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-4">
              Thank you to all participants for making the Summer Swing League 2025 a success!
            </p>
            <div className="space-x-4">
              <Link 
                href="/" 
                className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Back to Home
              </Link>
              <Link 
                href="/standings" 
                className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                View Standings
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-green-800 mb-4">
            🏆 League Complete! 🏆
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Summer Swing League 2025 Season Results
          </p>
          <p className="text-lg text-gray-500">
            {data.seasonStats.seasonDuration}
          </p>
        </div>

        {/* Winners Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* 1st Place */}
          <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg p-6 text-center border-4 border-yellow-400">
            <div className="text-4xl mb-2">🥇</div>
            <h3 className="text-xl font-bold text-yellow-800 mb-2">1st Place</h3>
            {data.winners.first ? (
              <>
                <p className="text-lg font-semibold text-yellow-900">{data.winners.first.name}</p>
                <p className="text-sm text-yellow-700">Season Score: {data.winners.first.seasonScore.toFixed(2)}</p>
                <p className="text-sm text-yellow-700">{data.winners.first.totalRounds} rounds</p>
                <p className="text-lg font-bold text-yellow-800 mt-2">${data.prizes.first}</p>
              </>
            ) : (
              <p className="text-yellow-700">No winner</p>
            )}
          </div>

          {/* 2nd Place */}
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-6 text-center border-4 border-gray-400">
            <div className="text-4xl mb-2">🥈</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">2nd Place</h3>
            {data.winners.second ? (
              <>
                <p className="text-lg font-semibold text-gray-900">{data.winners.second.name}</p>
                <p className="text-sm text-gray-700">Season Score: {data.winners.second.seasonScore.toFixed(2)}</p>
                <p className="text-sm text-gray-700">{data.winners.second.totalRounds} rounds</p>
                <p className="text-lg font-bold text-gray-800 mt-2">${data.prizes.second}</p>
              </>
            ) : (
              <p className="text-gray-700">No winner</p>
            )}
          </div>

          {/* 3rd Place */}
          <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg p-6 text-center border-4 border-amber-400">
            <div className="text-4xl mb-2">🥉</div>
            <h3 className="text-xl font-bold text-amber-800 mb-2">3rd Place</h3>
            {data.winners.third ? (
              <>
                <p className="text-lg font-semibold text-amber-900">{data.winners.third.name}</p>
                <p className="text-sm text-amber-700">Season Score: {data.winners.third.seasonScore.toFixed(2)}</p>
                <p className="text-sm text-amber-700">{data.winners.third.totalRounds} rounds</p>
                <p className="text-lg font-bold text-amber-800 mt-2">${data.prizes.third}</p>
              </>
            ) : (
              <p className="text-amber-700">No winner</p>
            )}
          </div>

          {/* Most Rounds */}
          <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-6 text-center border-4 border-blue-400">
            <div className="text-4xl mb-2">🏌️</div>
            <h3 className="text-xl font-bold text-blue-800 mb-2">Going the Distance</h3>
            {data.winners.mostRounds ? (
              <>
                <p className="text-lg font-semibold text-blue-900">{data.winners.mostRounds.name}</p>
                <p className="text-sm text-blue-700">{data.winners.mostRounds.totalRounds} rounds</p>
                <p className="text-sm text-blue-700">Total Points: {data.winners.mostRounds.totalPoints.toFixed(2)}</p>
                <p className="text-lg font-bold text-blue-800 mt-2">${data.prizes.mostRounds}</p>
              </>
            ) : (
              <p className="text-blue-700">No winner</p>
            )}
          </div>
        </div>

        {/* Season Stats */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Season Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-green-600">{data.seasonStats.totalPlayers}</p>
              <p className="text-gray-600">Total Players</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">{data.seasonStats.totalRounds}</p>
              <p className="text-gray-600">Total Rounds Played</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">${data.prizes.first + data.prizes.second + data.prizes.third + data.prizes.mostRounds}</p>
              <p className="text-gray-600">Total Prize Pool</p>
            </div>
          </div>
        </div>

        {/* Final Standings */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Final Standings</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Season Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rounds
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Handicap
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.finalStandings.map((player, index) => (
                  <tr
                    key={player.id}
                    className={`hover:bg-gray-50 ${
                      index === 0 ? 'bg-yellow-50' :
                      index === 1 ? 'bg-gray-50' :
                      index === 2 ? 'bg-amber-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                      {index < 3 && (
                        <span className="ml-2">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      {player.seasonScore.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.totalRounds}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.totalPoints.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.handicap}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-lg text-gray-600 mb-4">
            Thank you to all participants for making the Summer Swing League 2025 a success!
          </p>
          <div className="space-x-4">
            <Link 
              href="/" 
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Back to Home
            </Link>
            <Link 
              href="/standings" 
              className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              View Standings
            </Link>
            <Link 
              href="/analytics" 
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Analytics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
