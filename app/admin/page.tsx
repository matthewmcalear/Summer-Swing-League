'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Member { id:number; full_name:string; handicap:number; email:string; }
interface Score { id:number; player:string; total_points:number; play_date:string; }

export default function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [tab, setTab] = useState<'members'|'scores'>('members');

  useEffect(() => {
    fetch('/api/members').then(r=>r.json()).then(setMembers);
    fetch('/api/scores').then(r=>r.json()).then(setScores);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Link href="/" className="text-green-600 hover:underline">← Back Home</Link>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="mb-4 space-x-4">
        <button onClick={()=>setTab('members')} className={`px-4 py-2 rounded ${tab==='members'?'bg-green-600 text-white':'bg-white border'}`}>Members</button>
        <button onClick={()=>setTab('scores')} className={`px-4 py-2 rounded ${tab==='scores'?'bg-green-600 text-white':'bg-white border'}`}>Scores</button>
      </div>

      {tab==='members' && (
        <table className="min-w-full bg-white rounded shadow text-sm">
          <thead className="bg-gray-100">
            <tr><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Email</th><th className="px-4 py-2 text-left">Handicap</th><th className="px-4 py-2 text-left">Actions</th></tr>
          </thead>
          <tbody>
            {members.map(m=> (
              <tr key={m.id} className="border-t"><td className="px-4 py-2">{m.full_name}</td><td className="px-4 py-2">{m.email}</td><td className="px-4 py-2">{m.handicap}</td><td className="px-4 py-2"><button className="text-red-600" onClick={async()=>{await fetch(`/api/admin/members/${m.id}`,{method:'DELETE'});setMembers(prev=>prev.filter(x=>x.id!==m.id));}}>🗑</button></td></tr>
            ))}
          </tbody>
        </table>
      )}

      {tab==='scores' && (
        <table className="min-w-full bg-white rounded shadow text-sm">
          <thead className="bg-gray-100"><tr><th className="px-4 py-2 text-left">Player(s)</th><th className="px-4 py-2 text-left">Points</th><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Actions</th></tr></thead>
          <tbody>
            {scores.map(s=> (
              <tr key={s.id} className="border-t"><td className="px-4 py-2">{s.player}</td><td className="px-4 py-2">{s.total_points.toFixed(1)}</td><td className="px-4 py-2">{new Date(s.play_date).toLocaleDateString()}</td><td className="px-4 py-2"><button className="text-red-600" onClick={async()=>{await fetch(`/api/admin/scores/${s.id}`,{method:'DELETE'});setScores(prev=>prev.filter(x=>x.id!==s.id));}}>🗑</button></td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 