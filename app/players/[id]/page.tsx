'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface PlayerProfile {
  id: number;
  name: string;
  email: string;
  handicap: number;
  totalRounds: number;
  total18HoleRounds: number;
  total9HoleRounds: number;
  averageScore18: number;
  averageScore9: number;
  bestScore18: number;
  bestScore9: number;
  worstScore18: number;
  worstScore9: number;
  totalPoints: number;
  averagePoints: number;
  seasonScore: number;
  handicapProgression: Array<{ date: string; handicap: number }>;
  recentScores: Array<{
    id: number;
    date: string;
    course: string;
    holes: number;
    gross: number;
    points: number;
    difficulty: number;
    groupMembers: string;
  }>;
  monthlyStats: Array<{
    month: string;
    rounds: number;
    rounds18: number;
    rounds9: number;
    averageScore18: number;
    averageScore9: number;
    averagePoints: number;
  }>;
  courseStats: Array<{
    course: string;
    rounds: number;
    rounds18: number;
    rounds9: number;
    averageScore18: number;
    averageScore9: number;
    bestScore18: number;
    bestScore9: number;
  }>;
}

export default function PlayerProfile() {
  const params = useParams();
  const playerId = params.id as string;
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch(`/api/players/${playerId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch player profile');
        }
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (playerId) {
      fetchProfile();
    }
  }, [playerId]);

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

  if (error || !profile) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600">{error || 'Player not found'}</p>
            <Link href="/members" className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Back to Members
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Chart data for monthly performance
  const monthlyChartData = {
    labels: profile.monthlyStats.slice(0, 6).reverse().map(stat => {
      const [year, month] = stat.month.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Avg 18-Hole Score',
        data: profile.monthlyStats.slice(0, 6).reverse().map(stat => stat.averageScore18),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        yAxisID: 'y',
      },
      {
        label: 'Avg 9-Hole Score',
        data: profile.monthlyStats.slice(0, 6).reverse().map(stat => stat.averageScore9),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        yAxisID: 'y',
      },
      {
        label: 'Average Points',
        data: profile.monthlyStats.slice(0, 6).reverse().map(stat => stat.averagePoints),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        yAxisID: 'y1',
      },
    ],
  };

  const monthlyChartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: 'Monthly Performance Trends',
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Month',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Average Score',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Average Points',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  // Course performance chart
  const courseChartData = {
    labels: profile.courseStats.slice(0, 5).map(stat => stat.course),
    datasets: [
      {
        label: 'Avg 18-Hole Score',
        data: profile.courseStats.slice(0, 5).map(stat => stat.averageScore18),
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
      },
      {
        label: 'Avg 9-Hole Score',
        data: profile.courseStats.slice(0, 5).map(stat => stat.averageScore9),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
      },
    ],
  };

  const courseChartOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Performance by Course',
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Average Score',
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/members" className="text-green-600 hover:text-green-800">
              ← Back to Members
            </Link>
            <h1 className="text-2xl font-bold text-green-800">Player Profile</h1>
            <div></div>
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Player Info Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{profile.name}</h2>
              <p className="text-gray-600 mt-1">{profile.email}</p>
              <div className="flex items-center mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Handicap: {profile.handicap}
                </span>
              </div>
            </div>
            <div className="mt-4 md:mt-0 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-800">{profile.totalRounds}</div>
                <div className="text-sm text-green-600">Total Rounds</div>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-indigo-800">{profile.total18HoleRounds}</div>
                <div className="text-sm text-indigo-600">18-Hole Rounds</div>
              </div>
              <div className="bg-teal-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-teal-800">{profile.total9HoleRounds}</div>
                <div className="text-sm text-teal-600">9-Hole Rounds</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-800">{profile.seasonScore}</div>
                <div className="text-sm text-blue-600">Season Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{profile.averageScore18}</div>
              <div className="text-sm text-gray-600">Avg 18-Hole</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-600">{profile.averageScore9}</div>
              <div className="text-sm text-gray-600">Avg 9-Hole</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{profile.bestScore18}</div>
              <div className="text-sm text-gray-600">Best 18-Hole</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{profile.bestScore9}</div>
              <div className="text-sm text-gray-600">Best 9-Hole</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{profile.averagePoints}</div>
              <div className="text-sm text-gray-600">Avg Points</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{profile.totalPoints}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        {profile.monthlyStats.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <Line data={monthlyChartData} options={monthlyChartOptions} />
            </div>
            {profile.courseStats.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <Bar data={courseChartData} options={courseChartOptions} />
              </div>
            )}
          </div>
        )}

        {/* Recent Scores and Course Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Scores */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Scores</h3>
            {profile.recentScores.length > 0 ? (
              <div className="space-y-3">
                {profile.recentScores.map((score) => (
                  <div key={score.id} className="border-l-4 border-green-500 pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{score.course}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(score.date).toLocaleDateString()} • {score.holes} holes
                        </div>
                        {score.groupMembers !== score.groupMembers.split(',')[0] && (
                          <div className="text-xs text-gray-500 mt-1">
                            Played with: {score.groupMembers.split(',').slice(1).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{score.gross}</div>
                        <div className="text-sm text-green-600">{score.points.toFixed(1)} pts</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No scores recorded yet.</p>
            )}
          </div>

          {/* Course Statistics */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Course Statistics</h3>
            {profile.courseStats.length > 0 ? (
              <div className="space-y-3">
                {profile.courseStats.map((stat, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">{stat.course}</div>
                      <div className="text-sm text-gray-600">{stat.rounds} rounds total</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">18-Hole ({stat.rounds18} rounds)</div>
                        <div className="font-bold">{stat.averageScore18 > 0 ? stat.averageScore18.toFixed(1) : '-'}</div>
                        <div className="text-xs text-green-600">Best: {stat.bestScore18 > 0 ? stat.bestScore18 : '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">9-Hole ({stat.rounds9} rounds)</div>
                        <div className="font-bold">{stat.averageScore9 > 0 ? stat.averageScore9.toFixed(1) : '-'}</div>
                        <div className="text-xs text-emerald-600">Best: {stat.bestScore9 > 0 ? stat.bestScore9 : '-'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No course data available.</p>
            )}
          </div>
        </div>

        {/* Monthly Performance Table */}
        {profile.monthlyStats.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Monthly Performance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rounds
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Points
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {profile.monthlyStats.map((stat, index) => {
                    const [year, month] = stat.month.split('-');
                    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    });
                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {monthName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stat.rounds}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stat.averageScore.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stat.averagePoints.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}