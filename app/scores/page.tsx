'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Score {
  id: number;
  player: string;
  holes: number;
  gross: number;
  total_points: number;
  play_date: string;
  course_name: string;
}

export default function AllScoresPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/scores')
      .then((r) => r.json())
      .then((data) => {
        setScores(data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <Link href="/" className="text-green-700 hover:underline">← Back Home</Link>
        <h1 className="text-3xl font-bold text-center text-gray-900 my-6">All Score Entries</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Played With</th>
                  <th className="px-4 py-2 text-left">Course</th>
                  <th className="px-4 py-2 text-left">Holes</th>
                  <th className="px-4 py-2 text-left">Gross</th>
                  <th className="px-4 py-2 text-left">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {scores.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2">{new Date(s.play_date).toLocaleDateString()}</td>
                    {(() => {const [main,...rest]=s.player.split(',');return (<><td className="px-4 py-2">{main.trim()}</td><td className="px-4 py-2">{rest.join(', ').trim()}</td></>);})()}
                    <td className="px-4 py-2">{s.course_name}</td>
                    <td className="px-4 py-2">{s.holes}</td>
                    <td className="px-4 py-2">{s.gross}</td>
                    <td className="px-4 py-2">{s.total_points.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 