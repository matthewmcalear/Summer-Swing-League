'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import PlayerProgressionChart from '@/app/components/PlayerProgressionChart';
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

interface AnalyticsData {
  leagueOverview: {
    totalPlayers: number;
    totalRounds: number;
    total18HoleRounds: number;
    total9HoleRounds: number;
    averageHandicap: number;
    totalScoresSubmitted: number;
    activePlayers: number;
  };
  performanceMetrics: {
    averageScore18: number;
    averageScore9: number;
    lowestScore18: number;
    lowestScore9: number;
    highestScore18: number;
    highestScore9: number;
    averagePoints: number;
    mostActivePlayer: string;
    bestImprovement: {
      player: string;
      improvement: number;
      roundType: string;
    };
  };
  courseAnalytics: Array<{
    course: string;
    totalRounds: number;
    total18HoleRounds: number;
    total9HoleRounds: number;
    averageScore18: number;
    averageScore9: number;
    difficulty: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    totalRounds: number;
    total18HoleRounds: number;
    total9HoleRounds: number;
    averageScore18: number;
    averageScore9: number;
    averagePoints: number;
    uniquePlayers: number;
  }>;
  handicapDistribution: Array<{
    range: string;
    count: number;
  }>;
  topPerformers: Array<{
    player: string;
    seasonScore: number;
    totalRounds: number;
    averageScore: number;
  }>;
  recentActivity: Array<{
    date: string;
    player: string;
    course: string;
    score: number;
    points: number;
  }>;
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<number>(6); // Default to 6 months

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch(`/api/analytics?fresh=${Date.now()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAnalytics, 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600">{error || 'Failed to load analytics'}</p>
            <Link href="/" className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Chart configurations
  const monthlyTrendsChart = {
    labels: analytics.monthlyTrends.slice(0, timePeriod).reverse().map(trend => {
      const [year, month] = trend.month.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }),
    datasets: [
      {
        label: '18-Hole Rounds',
        data: analytics.monthlyTrends.slice(0, timePeriod).reverse().map(trend => trend.total18HoleRounds),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        yAxisID: 'y',
        fill: false,
      },
      {
        label: '9-Hole Rounds',
        data: analytics.monthlyTrends.slice(0, timePeriod).reverse().map(trend => trend.total9HoleRounds),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        yAxisID: 'y',
        fill: false,
      },
      {
        label: 'Avg 18-Hole Score',
        data: analytics.monthlyTrends.slice(0, timePeriod).reverse().map(trend => trend.averageScore18),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        yAxisID: 'y1',
        fill: false,
      },
      {
        label: 'Avg 9-Hole Score',
        data: analytics.monthlyTrends.slice(0, timePeriod).reverse().map(trend => trend.averageScore9),
        borderColor: 'rgb(245, 101, 101)',
        backgroundColor: 'rgba(245, 101, 101, 0.2)',
        yAxisID: 'y1',
        fill: false,
      },
      {
        label: 'Unique Players',
        data: analytics.monthlyTrends.slice(0, timePeriod).reverse().map(trend => trend.uniquePlayers),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        yAxisID: 'y',
        fill: false,
        borderDash: [5, 5],
      },
    ],
  };

  const monthlyTrendsOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: 'Monthly League Trends',
        font: { size: 16, weight: 'bold' as const }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label.includes('Score')) {
              return `${label}: ${value.toFixed(1)} strokes`;
            } else {
              return `${label}: ${value} rounds`;
            }
          }
        }
      },
      legend: {
        position: 'top' as const,
        labels: { 
          usePointStyle: true,
          padding: 20,
          font: { size: 12 }
        }
      }
    },
    scales: {
      x: {
        grid: { 
          display: true, 
          color: 'rgba(0,0,0,0.1)' 
        },
        title: { 
          display: true, 
          text: 'Month',
          font: { size: 14, weight: 'bold' as const }
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: { 
          display: true, 
          color: 'rgba(0,0,0,0.1)' 
        },
        title: {
          display: true,
          text: 'Number of Rounds',
          font: { size: 14, weight: 'bold' as const }
        },
        beginAtZero: true
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Average Score',
          font: { size: 14, weight: 'bold' as const }
        },
        beginAtZero: true
      },
    },
    elements: {
      line: { 
        tension: 0.4, 
        borderWidth: 3 
      },
      point: { 
        radius: 4, 
        hoverRadius: 6,
        hoverBorderWidth: 2
      }
    }
  };

  const courseAnalyticsChart = {
    labels: analytics.courseAnalytics.slice(0, 8).map(course => course.course),
    datasets: [
      {
        label: 'Total Rounds',
        data: analytics.courseAnalytics.slice(0, 8).map(course => course.totalRounds),
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
      },
    ],
  };

  const courseAnalyticsOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Rounds Played by Course',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Total Rounds',
        },
      },
    },
  };

  const handicapDistributionChart = {
    labels: analytics.handicapDistribution.map(dist => dist.range),
    datasets: [
      {
        data: analytics.handicapDistribution.map(dist => dist.count),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
      },
    ],
  };

  const handicapDistributionOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Handicap Distribution',
      },
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const topPerformersChart = {
    labels: analytics.topPerformers.slice(0, 10).map(player => {
      const parts = player.player.split(' ');
      return parts[0] + ' ' + (parts[1]?.charAt(0) || '') + '.';
    }),
    datasets: [
      {
        label: 'Season Score',
        data: analytics.topPerformers.slice(0, 10).map(player => player.seasonScore),
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
      },
    ],
  };

  const topPerformersOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Top 10 Players (Season Score)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Season Score',
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
            <Link href="/" className="text-green-600 hover:text-green-800">
              ← Back to Home
            </Link>
            <h1 className="text-2xl font-bold text-green-800">League Analytics Dashboard</h1>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* League Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{analytics.leagueOverview.totalPlayers}</div>
              <div className="text-sm text-gray-600">Total Players</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{analytics.leagueOverview.totalRounds}</div>
              <div className="text-sm text-gray-600">Total Rounds</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{analytics.leagueOverview.total18HoleRounds}</div>
              <div className="text-sm text-gray-600">18-Hole Rounds</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">{analytics.leagueOverview.total9HoleRounds}</div>
              <div className="text-sm text-gray-600">9-Hole Rounds</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{analytics.leagueOverview.activePlayers}</div>
              <div className="text-sm text-gray-600">Active Players (30d)</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{analytics.leagueOverview.averageHandicap}</div>
              <div className="text-sm text-gray-600">Avg Handicap</div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-800">{analytics.performanceMetrics.lowestScore18}</div>
              <div className="text-sm text-green-600">Best 18-Hole</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-800">{analytics.performanceMetrics.lowestScore9}</div>
              <div className="text-sm text-emerald-600">Best 9-Hole</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-800">{analytics.performanceMetrics.averageScore18}</div>
              <div className="text-sm text-blue-600">Avg 18-Hole</div>
            </div>
            <div className="text-center p-4 bg-cyan-50 rounded-lg">
              <div className="text-xl font-bold text-cyan-800">{analytics.performanceMetrics.averageScore9}</div>
              <div className="text-sm text-cyan-600">Avg 9-Hole</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-800">{analytics.performanceMetrics.mostActivePlayer.split(' ')[0]} {analytics.performanceMetrics.mostActivePlayer.split(' ')[1]?.charAt(0)}.</div>
              <div className="text-sm text-purple-600">Most Active</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-lg font-bold text-orange-800">
                {analytics.performanceMetrics.bestImprovement.player === 'N/A' ? 
                  'N/A' : 
                  `${analytics.performanceMetrics.bestImprovement.player.split(' ')[0]} ${analytics.performanceMetrics.bestImprovement.player.split(' ')[1]?.charAt(0)}.`
                }
              </div>
              <div className="text-sm text-orange-600">Best Improvement</div>
              {analytics.performanceMetrics.bestImprovement.player !== 'N/A' ? (
                <>
                  <div className="text-xs text-orange-500">+{analytics.performanceMetrics.bestImprovement.improvement} strokes</div>
                  <div className="text-xs text-orange-400">({analytics.performanceMetrics.bestImprovement.roundType})</div>
                </>
              ) : (
                <div className="text-xs text-orange-400">No data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Player Progression Chart - Full Width */}
        <div className="mb-8">
          <PlayerProgressionChart />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Trends */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Monthly League Trends</h3>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Time Period:</label>
                <select 
                  value={timePeriod} 
                  onChange={(e) => setTimePeriod(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months</option>
                  <option value={24}>All Time</option>
                </select>
              </div>
            </div>
            <Line data={monthlyTrendsChart} options={monthlyTrendsOptions} />
          </div>

          {/* Course Analytics */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <Bar data={courseAnalyticsChart} options={courseAnalyticsOptions} />
          </div>

          {/* Handicap Distribution */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <Doughnut data={handicapDistributionChart} options={handicapDistributionOptions} />
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <Bar data={topPerformersChart} options={topPerformersOptions} />
          </div>
        </div>

        {/* Data Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Course Statistics Table */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Course Statistics</h3>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      Course
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      Total Rounds
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      18-Hole Rounds
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      9-Hole Rounds
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      Avg 18-Hole
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      Avg 9-Hole
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      Difficulty
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.courseAnalytics.slice(0, 8).map((course, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {course.course}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {course.totalRounds}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {course.total18HoleRounds}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {course.total9HoleRounds}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {course.averageScore18 > 0 ? course.averageScore18 : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {course.averageScore9 > 0 ? course.averageScore9 : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {course.difficulty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {analytics.recentActivity.slice(0, 15).map((activity, index) => (
                <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {activity.player.split(' ')[0]} {activity.player.split(' ')[1]?.charAt(0)}.
                      </div>
                      <div className="text-sm text-gray-600">
                        {activity.course} • {new Date(activity.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{activity.score}</div>
                      <div className="text-sm text-green-600">{activity.points} pts</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers Table */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Top Performers</h3>
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      Player
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Season Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Total Rounds
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Avg Score
                    </th>
                  </tr>
                </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.topPerformers.map((player, index) => (
                  <tr key={index} className={index < 3 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                      {index === 0 && ' 🥇'}
                      {index === 1 && ' 🥈'}
                      {index === 2 && ' 🥉'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {player.player.split(' ')[0]} {player.player.split(' ')[1]?.charAt(0)}.
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.seasonScore}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.totalRounds}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.averageScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}