'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Score {
  id: number;
  player: string;
  holes: number;
  gross: number;
  handicap: number;
  difficulty: number;
  group_members: string;
  total_points: number;
  play_date: string;
  course_name: string;
  additional_points: number;
}

export default function AllScoresPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getScores = () => {
      fetch('/api/scores')
        .then((r) => r.json())
        .then((data) => {
          setScores(data);
        })
        .finally(() => setLoading(false));
    };
    getScores();
    const vis = () => {
      if (document.visibilityState === 'visible') getScores();
    };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, []);

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4">
        <Link href="/" className="text-green-700 hover:underline">← Back Home</Link>
        <h1 className="text-3xl font-bold text-center text-gray-900 my-6">All Score Entries</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
          </div>
        ) : (
          <div className="bg-white rounded shadow">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 text-sm">
                <thead className="sticky top-0 bg-white/90 backdrop-blur supports-backdrop-blur:bg-white/60">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Player</th>
                    <th className="px-4 py-2 text-left w-48">Played With</th>
                    <th className="px-4 py-2 text-left">Course</th>
                    <th className="px-4 py-2 text-left">Holes</th>
                    <th className="px-4 py-2 text-left">Gross</th>
                    <th className="px-4 py-2 text-left">Handicap</th>
                    <th className="px-4 py-2 text-left">Net</th>
                    <th className="px-4 py-2 text-left">Group Bonus</th>
                    <th className="px-4 py-2 text-left">Additional Points</th>
                    <th className="px-4 py-2 text-left">Difficulty</th>
                    <th className="px-4 py-2 text-left">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {scores.map((s) => (
                    <tr key={s.id} className="odd:bg-gray-50 hover:bg-green-50 transition-colors">
                      <td className="px-4 py-2">{new Date(s.play_date).toLocaleDateString(undefined,{timeZone:'UTC'})}</td>
                      {(() => {
                        const shorten=(name:string)=>{const parts=name.trim().split(' ');return parts[0]+ ' '+(parts[1]?.charAt(0)||'')+'.';};
                        const rawNames=s.player.split(',');
                        const main=shorten(rawNames[0]||'');
                        const rest=rawNames.slice(1).map(shorten).join(', ');
                        const net=s.holes===9? s.gross - s.handicap/2 : s.gross - s.handicap;
                        const groupBonus= Math.max(rawNames.length - 1, 0);
                        return (<><td className="px-4 py-2">{main}</td><td className="px-4 py-2 max-w-xs">
                          <div className="flex flex-col space-y-1">
                            {rawNames.slice(1).map((name, idx) => (
                              <div key={idx} className="text-xs text-gray-600 leading-tight">
                                {shorten(name)}
                              </div>
                            ))}
                          </div>
                        </td><td className="px-4 py-2">{s.course_name}</td><td className="px-4 py-2">{s.holes}</td><td className="px-4 py-2">{s.gross}</td><td className="px-4 py-2">{s.handicap}</td><td className="px-4 py-2">{net.toFixed(1)}</td><td className="px-4 py-2">{groupBonus}</td><td className="px-4 py-2">{s.additional_points}</td><td className="px-4 py-2">{s.difficulty}</td></>);
                      })()}
                      <td className="px-4 py-2">{s.total_points.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 