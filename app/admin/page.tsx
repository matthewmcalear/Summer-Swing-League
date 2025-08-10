'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Member { 
  id: number; 
  full_name: string; 
  handicap: number; 
  email: string; 
}

interface Score {
  id: number;
  player: string;
  total_points: number;
  play_date: string;
  holes: number;
  gross: number;
  handicap: number;
  difficulty: number;
  course_name: string;
}

export default function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [tab, setTab] = useState<'members'|'scores'>('members');

  useEffect(() => {
    const fetchAll = () => {
      fetch('/api/members').then(r=>r.json()).then(setMembers);
      fetch('/api/scores').then(r=>r.json()).then(setScores);
    };
    fetchAll();
    const vis = () => {
      if (document.visibilityState === 'visible') fetchAll();
    };
    document.addEventListener('visibilitychange', vis);

    // Poll every 60s in case page stays open
    const id = setInterval(fetchAll, 60000);

    return () => {
      document.removeEventListener('visibilitychange', vis);
      clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-screen p-8">
      <Link href="/" className="text-green-600 hover:underline">← Back Home</Link>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="mb-4 space-x-4">
        <button onClick={()=>setTab('members')} className={`px-4 py-2 rounded ${tab==='members'?'bg-green-600 text-white':'bg-white border'}`}>Members</button>
        <button onClick={()=>setTab('scores')} className={`px-4 py-2 rounded ${tab==='scores'?'bg-green-600 text-white':'bg-white border'}`}>Scores</button>
      </div>

      {tab==='members' && (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded shadow text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Handicap</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m=> (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-2">{m.full_name}</td>
                  <td className="px-4 py-2">{m.email}</td>
                  <td className="px-4 py-2">{m.handicap}</td>
                  <td className="px-4 py-2">
                    <button className="text-red-600" onClick={async()=>{
                      await fetch(`/api/admin/members/${m.id}`,{method:'DELETE'});
                      setMembers(prev=>prev.filter(x=>x.id!==m.id));
                    }}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab==='scores' && (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded shadow text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Player(s)</th>
                <th className="px-4 py-2 text-left">Handicap</th>
                <th className="px-4 py-2 text-left">Holes</th>
                <th className="px-4 py-2 text-left">Gross</th>
                <th className="px-4 py-2 text-left">Net</th>
                <th className="px-4 py-2 text-left">Group Bonus</th>
                <th className="px-4 py-2 text-left">Course</th>
                <th className="px-4 py-2 text-left">Difficulty</th>
                <th className="px-4 py-2 text-left">Round Points</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s) => {
                const names = s.player.split(',');
                const main = names[0].trim();
                const net = s.holes === 9 ? s.gross - s.handicap / 2 : s.gross - s.handicap;
                const bonus = Math.max(names.length - 1, 0);
                return (
                  <tr key={s.id} className="border-t">
                    <td className="px-4 py-2">{main}</td>
                    <td className="px-4 py-2">{s.handicap}</td>
                    <td className="px-4 py-2">{s.holes}</td>
                    <td className="px-4 py-2">{s.gross}</td>
                    <td className="px-4 py-2">{net.toFixed(1)}</td>
                    <td className="px-4 py-2">{bonus}</td>
                    <td className="px-4 py-2">{s.course_name}</td>
                    <td className="px-4 py-2">{s.difficulty}</td>
                    <td className="px-4 py-2">{s.total_points.toFixed(1)}</td>
                    <td className="px-4 py-2">{new Date(s.play_date).toLocaleDateString(undefined,{timeZone:'UTC'})}</td>
                    <td className="px-4 py-2">
                      <button
                        className="text-red-600"
                        onClick={async () => {
                          await fetch(`/api/admin/scores/${s.id}`, { method: 'DELETE' });
                          setScores((prev) => prev.filter((x) => x.id !== s.id));
                        }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 