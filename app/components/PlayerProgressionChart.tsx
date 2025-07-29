'use client';

import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PlayerScore {
  date: string;
  course: string;
  gross: number;
  net: number;
  points: number;
  handicap: number;
  roundType: '9-hole' | '18-hole';
}

interface PlayerData {
  player: string;
  scores: PlayerScore[];
  averageScore: number;
  totalRounds: number;
  improvement: number;
}

interface PlayerProgressionData {
  players: PlayerData[];
  courses: string[];
  timePeriod: number;
  totalScores: number;
}

interface PlayerProgressionChartProps {
  className?: string;
}

const COLORS = [
  'rgb(34, 197, 94)',   // Green
  'rgb(239, 68, 68)',   // Red
  'rgb(59, 130, 246)',  // Blue
  'rgb(168, 85, 247)',  // Purple
  'rgb(245, 158, 11)',  // Orange
  'rgb(16, 185, 129)',  // Emerald
  'rgb(236, 72, 153)',  // Pink
  'rgb(14, 165, 233)',  // Sky
];

export default function PlayerProgressionChart({ className = '' }: PlayerProgressionChartProps) {
  const [data, setData] = useState<PlayerProgressionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allPlayers, setAllPlayers] = useState<string[]>([]);
  
  // Filter states
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [timePeriod, setTimePeriod] = useState<number>(6);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [roundType, setRoundType] = useState<'all' | '9-hole' | '18-hole'>('all');
  const [scoreType, setScoreType] = useState<'gross' | 'net'>('gross');

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        
        if (selectedPlayers.length > 0) {
          params.append('players', selectedPlayers.join(','));
        }
        params.append('timePeriod', timePeriod.toString());
        if (selectedCourse) {
          params.append('course', selectedCourse);
        }
        params.append('roundType', roundType);

        console.log('Fetching data with params:', params.toString());
        console.log('Selected players:', selectedPlayers);
        
        const response = await fetch(`/api/player-progression?${params}`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const result = await response.json();
        console.log('Fetched data result:', result);
        console.log('Result players length:', result.players?.length || 0);
        setData(result);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData(null); // Clear data on error
      } finally {
        setLoading(false);
      }
    }

    // Always fetch when players are selected, or fetch initial data if no data exists
    if (selectedPlayers.length > 0) {
      console.log('Fetching data for selected players:', selectedPlayers);
      fetchData();
    } else if (!data && allPlayers.length > 0) {
      console.log('Fetching initial data');
      fetchData();
    }
  }, [selectedPlayers, timePeriod, selectedCourse, roundType, allPlayers.length]);

  // Fetch initial data to populate player list
  useEffect(() => {
    async function fetchInitialData() {
      try {
        console.log('Fetching initial player progression data...');
        const params = new URLSearchParams();
        params.append('timePeriod', '12'); // Get last 12 months for player list
        
        const response = await fetch(`/api/player-progression?${params}`);
        console.log('Initial fetch response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Initial fetch result:', result);
          // Set the all players list
          setAllPlayers(result.players.map((p: any) => p.player));
          // Only update data if we don't have any data yet
          if (!data) {
            setData(result);
          }
        } else {
          console.error('Initial fetch failed with status:', response.status);
        }
      } catch (err) {
        console.error('Error fetching initial data:', err);
      }
    }

    if (allPlayers.length === 0) {
      fetchInitialData();
    }
  }, [allPlayers.length]);

  // Get all available players for selection

  // Prepare chart data with proper date handling
  const { chartData, sortedDates } = (() => {
    if (!data?.players || data.players.length === 0) {
      return {
        chartData: { labels: [], datasets: [] },
        sortedDates: []
      };
    }

    // Collect all unique dates from all players
    const allDates = new Set<string>();
    data.players.forEach(player => {
      player.scores.forEach(score => {
        allDates.add(score.date);
      });
    });

    // Sort dates chronologically
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // Create labels from sorted dates
    const labels = sortedDates.map(date => {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    // Create datasets for each player
    const datasets = data.players.map((player, index) => {
      // Create a map of date -> score for this player
      const scoreMap = new Map<string, number>();
      player.scores.forEach(score => {
        scoreMap.set(score.date, scoreType === 'gross' ? score.gross : score.net);
      });

      // Create data array aligned with sorted dates
      const data = sortedDates.map(date => {
        return scoreMap.get(date) || null; // null for missing data points
      });

      return {
        label: `${player.player} (${player.averageScore.toFixed(1)} avg)`,
        data: data,
        borderColor: COLORS[index % COLORS.length],
        backgroundColor: COLORS[index % COLORS.length] + '20',
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
        spanGaps: true, // Connect points across gaps
      };
    });

    return {
      chartData: { labels, datasets },
      sortedDates
    };
  })();

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: `Player Score Progression (${scoreType === 'gross' ? 'Gross' : 'Net'} Scores)`,
        font: { size: 16, weight: 'bold' as const }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        callbacks: {
          title: function(context: any) {
            const dataIndex = context[0].dataIndex;
            const date = sortedDates[dataIndex];
            if (date) {
              const dateObj = new Date(date);
              return dateObj.toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              });
            }
            return context[0].label;
          },
          label: function(context: any) {
            const dataIndex = context.dataIndex;
            const playerIndex = context.datasetIndex;
            const date = sortedDates[dataIndex];
            const player = data?.players[playerIndex];
            
            if (date && player) {
              // Find the score for this player on this date
              const score = player.scores.find(s => s.date === date);
              if (score) {
                return [
                  `${context.dataset.label}`,
                  `${scoreType === 'gross' ? 'Gross' : 'Net'}: ${score[scoreType]}`,
                  `Course: ${score.course}`,
                  `Points: ${score.points}`,
                  `Handicap: ${score.handicap}`,
                  `Type: ${score.roundType}`,
                ];
              }
            }
            return context.parsed.y;
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
          text: 'Date',
          font: { size: 14, weight: 'bold' as const }
        }
      },
      y: {
        grid: { 
          display: true, 
          color: 'rgba(0,0,0,0.1)' 
        },
        title: {
          display: true,
          text: `${scoreType === 'gross' ? 'Gross' : 'Net'} Score`,
          font: { size: 14, weight: 'bold' as const }
        },
        reverse: true, // Lower scores are better
      },
    },
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
        <div className="text-center text-gray-500 mt-4">
          <p>Loading player progression data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>Error loading player progression data: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Player Score Progression</h3>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {/* Player Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Players
            </label>
            <select
              multiple
              value={selectedPlayers}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedPlayers(values);
              }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              size={4}
            >
              {allPlayers.map(player => (
                <option key={player} value={player}>
                  {player}
                </option>
              ))}
            </select>
          </div>

          {/* Time Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Period
            </label>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={1}>1 Month</option>
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
              <option value={24}>All Time</option>
            </select>
          </div>

          {/* Course Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Courses</option>
              {data?.courses.map(course => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>

          {/* Round Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Round Type
            </label>
            <select
              value={roundType}
              onChange={(e) => setRoundType(e.target.value as 'all' | '9-hole' | '18-hole')}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Rounds</option>
              <option value="9-hole">9-Hole Only</option>
              <option value="18-hole">18-Hole Only</option>
            </select>
          </div>

          {/* Score Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Score Type
            </label>
            <select
              value={scoreType}
              onChange={(e) => setScoreType(e.target.value as 'gross' | 'net')}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="gross">Gross Score</option>
              <option value="net">Net Score</option>
            </select>
          </div>
        </div>

        {/* Player Stats Summary */}
        {data?.players && data.players.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {data.players.map((player, index) => (
              <div key={player.player} className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-900">{player.player}</div>
                <div className="text-xs text-gray-600">
                  Avg: {player.averageScore.toFixed(1)} | Rounds: {player.totalRounds}
                </div>
                {player.improvement > 0 && (
                  <div className="text-xs text-green-600">
                    +{player.improvement.toFixed(1)} improvement
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="text-center text-gray-500 py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>Loading player data...</p>
          <p className="text-sm mt-2">Debug: Loading state active</p>
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">
          <p>Error: {error}</p>
          <p className="text-sm mt-2">Debug: Error state</p>
        </div>
      ) : data?.players && data.players.length > 0 ? (
        <Line data={chartData} options={chartOptions} />
      ) : (
        <div className="text-center text-gray-500 py-8">
          <p>Select players to view their score progression</p>
          <p className="text-sm mt-2">Available players: {allPlayers.length}</p>
          <p className="text-sm mt-2">Data players: {data?.players?.length || 0}</p>
          <p className="text-sm mt-2">Data structure: {JSON.stringify(data ? Object.keys(data) : 'null')}</p>
          {data?.players && (
            <p className="text-sm mt-2">First player: {JSON.stringify(data.players[0])}</p>
          )}
          {allPlayers.length === 0 && (
            <p className="text-sm mt-2 text-red-500">No player data available</p>
          )}
        </div>
      )}
    </div>
  );
} 