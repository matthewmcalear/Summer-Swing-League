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
        const response = await fetch('/api/standings');
        const standings = await response.json();
        
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
      <div className="min-h-screen py-12">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
            League Completion
          </h1>
          <p className="text-center text-gray-600">Unable to load completion data.</p>
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
