'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AnalyticsData {
  leagueOverview: {
    totalPlayers: number;
    totalRounds: number;
    total18HoleRounds: number;
    total9HoleRounds: number;
    averageHandicap: number;
    totalScoresSubmitted: number;
    activePlayers: number;
    totalPoints: number;
    averagePointsPerRound: number;
    participationRate: number;
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
    consistencyLeader: {
      player: string;
      standardDeviation: number;
      rounds: number;
    };
    courseSpecialist: {
      player: string;
      course: string;
      averageScore: number;
      rounds: number;
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
    averagePoints: number;
    mostFrequentPlayer: string;
    bestScore: number;
    bestPlayer: string;
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
    percentage: number;
  }>;
  topPerformers: Array<{
    player: string;
    seasonScore: number;
    totalRounds: number;
    averageScore: number;
    averagePoints: number;
    bestRound: number;
    consistency: number;
  }>;
  recentActivity: Array<{
    date: string;
    player: string;
    course: string;
    score: number;
    points: number;
  }>;
  playerInsights: Array<{
    player: string;
    totalRounds: number;
    averageScore: number;
    bestScore: number;
    worstScore: number;
    averagePoints: number;
    handicap: number;
    improvement: number;
    favoriteCourse: string;
    roundsThisMonth: number;
  }>;
  seasonHighlights: {
    totalTournaments: number;
    averageTournamentSize: number;
    biggestComeback: {
      player: string;
      improvement: number;
      roundType: string;
    };
    mostConsistentPlayer: {
      player: string;
      standardDeviation: number;
      rounds: number;
    };
    courseDifficultyRanking: Array<{
      course: string;
      averageScore: number;
      difficulty: number;
      rounds: number;
    }>;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/analytics');
        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
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

  if (!data) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-20">
            <p className="text-red-600">Failed to load analytics data</p>
          </div>
        </div>
      </div>
    );
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <Link href="/" className="text-green-700 hover:underline">← Back Home</Link>
        <h1 className="text-4xl font-bold text-center text-gray-900 my-8">League Analytics Dashboard</h1>
        
        {/* League Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{data.leagueOverview.totalPlayers}</div>
            <div className="text-sm text-gray-600">Total Players</div>
            <div className="text-xs text-gray-500 mt-1">{data.leagueOverview.participationRate}% Active</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{data.leagueOverview.totalRounds}</div>
            <div className="text-sm text-gray-600">Total Rounds</div>
            <div className="text-xs text-gray-500 mt-1">
              {data.leagueOverview.total18HoleRounds} 18H, {data.leagueOverview.total9HoleRounds} 9H
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-600">{data.leagueOverview.totalPoints}</div>
            <div className="text-sm text-gray-600">Total Points</div>
            <div className="text-xs text-gray-500 mt-1">
              {data.leagueOverview.averagePointsPerRound} avg/round
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-orange-600">{data.leagueOverview.averageHandicap}</div>
            <div className="text-sm text-gray-600">Avg Handicap</div>
            <div className="text-xs text-gray-500 mt-1">
              {data.leagueOverview.activePlayers} active this month
            </div>
          </div>
        </div>

        {/* Performance Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">🏆 Performance Highlights</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium text-green-800">Most Active Player</div>
                  <div className="text-sm text-green-600">{data.performanceMetrics.mostActivePlayer}</div>
                </div>
                <div className="text-2xl">🎯</div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-medium text-blue-800">Best Improvement</div>
                  <div className="text-sm text-blue-600">
                    {data.performanceMetrics.bestImprovement.player} 
                    ({data.performanceMetrics.bestImprovement.improvement} strokes, {data.performanceMetrics.bestImprovement.roundType})
                  </div>
                </div>
                <div className="text-2xl">📈</div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <div>
                  <div className="font-medium text-purple-800">Consistency Leader</div>
                  <div className="text-sm text-purple-600">
                    {data.performanceMetrics.consistencyLeader.player} 
                    (σ: {data.performanceMetrics.consistencyLeader.standardDeviation})
                  </div>
                </div>
                <div className="text-2xl">🎯</div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <div>
                  <div className="font-medium text-orange-800">Course Specialist</div>
                  <div className="text-sm text-orange-600">
                    {data.performanceMetrics.courseSpecialist.player} at {data.performanceMetrics.courseSpecialist.course}
                    (avg: {data.performanceMetrics.courseSpecialist.averageScore})
                  </div>
                </div>
                <div className="text-2xl">🏌️</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Score Statistics</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-800">18-Hole</div>
                  <div className="text-2xl font-bold text-green-600">{data.performanceMetrics.averageScore18}</div>
                  <div className="text-xs text-gray-500">Average Score</div>
                  <div className="text-xs text-gray-400">
                    Best: {data.performanceMetrics.lowestScore18} | Worst: {data.performanceMetrics.highestScore18}
                  </div>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-800">9-Hole</div>
                  <div className="text-2xl font-bold text-blue-600">{data.performanceMetrics.averageScore9}</div>
                  <div className="text-xs text-gray-500">Average Score</div>
                  <div className="text-xs text-gray-400">
                    Best: {data.performanceMetrics.lowestScore9} | Worst: {data.performanceMetrics.highestScore9}
                  </div>
                </div>
              </div>
              
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-lg font-semibold text-yellow-800">Points</div>
                <div className="text-2xl font-bold text-yellow-600">{data.performanceMetrics.averagePoints}</div>
                <div className="text-xs text-gray-500">Average Points per Round</div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Trends Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">📈 Monthly Trends</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rounds</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Players</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg 18H</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg 9H</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.monthlyTrends.map((trend, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-2 font-medium">{formatMonth(trend.month)}</td>
                    <td className="px-4 py-2">{trend.totalRounds}</td>
                    <td className="px-4 py-2">{trend.uniquePlayers}</td>
                    <td className="px-4 py-2">{trend.averageScore18}</td>
                    <td className="px-4 py-2">{trend.averageScore9}</td>
                    <td className="px-4 py-2">{trend.averagePoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Course Analytics */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">🏌️ Course Analytics</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Rounds</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">18H Rounds</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">9H Rounds</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg 18H</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg 9H</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.courseAnalytics.map((course, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-2 font-medium">{course.course}</td>
                    <td className="px-4 py-2">{course.totalRounds}</td>
                    <td className="px-4 py-2">{course.total18HoleRounds}</td>
                    <td className="px-4 py-2">{course.total9HoleRounds}</td>
                    <td className="px-4 py-2">{course.averageScore18}</td>
                    <td className="px-4 py-2">{course.averageScore9}</td>
                    <td className="px-4 py-2">{course.difficulty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">🏆 Top Performers</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Season Score</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rounds</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.topPerformers.map((player, index) => (
                  <tr key={index} className={index < 3 ? 'bg-yellow-50' : index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-2">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </td>
                    <td className="px-4 py-2 font-medium">{player.player}</td>
                    <td className="px-4 py-2 font-bold text-green-600">{player.seasonScore}</td>
                    <td className="px-4 py-2">{player.totalRounds}</td>
                    <td className="px-4 py-2">{player.averageScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Handicap Distribution */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Handicap Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.handicapDistribution.map((range, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-800">{range.range}</span>
                  <span className="text-sm text-gray-500">{range.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(range.count / data.leagueOverview.totalPlayers) * 100}%` }}
                  ></div>
                </div>
                <div className="text-center text-sm text-gray-600 mt-1">{range.count} players</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">🕒 Recent Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.recentActivity.map((activity, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-2">{new Date(activity.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 font-medium">{activity.player}</td>
                    <td className="px-4 py-2">{activity.course}</td>
                    <td className="px-4 py-2">{activity.score}</td>
                    <td className="px-4 py-2 font-bold text-green-600">{activity.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}