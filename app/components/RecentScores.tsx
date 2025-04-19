'use client';

import { useState, useEffect } from 'react';

interface Score {
  id: number;
  player: string;
  holes: number;
  gross: number;
  handicap: number;
  difficulty: number;
  group_members: number;
  total_points: number;
  play_date: string;
  course_name: string;
}

export default function RecentScores() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchScores() {
      try {
        const response = await fetch('/api/scores');
        if (!response.ok) {
          throw new Error('Failed to fetch scores');
        }
        const data = await response.json();
        setScores(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load scores');
      } finally {
        setLoading(false);
      }
    }

    fetchScores();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="px-6 py-4 bg-green-600">
        <h2 className="text-xl font-bold text-white">Recent Scores</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scores.map((score) => (
              <tr key={score.id} className="odd:bg-gray-50 hover:bg-green-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(score.play_date).toLocaleDateString(undefined,{timeZone:'UTC'})}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {score.player}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {score.course_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {score.holes}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {score.gross}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {score.total_points.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 