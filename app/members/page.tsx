'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Member {
  id: number;
  full_name: string;
  handicap: number;
  email: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch('/api/members');
        if (!res.ok) throw new Error('Failed to fetch members');
        const data = await res.json();
        setMembers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();

    const handleVis = () => {
      if (document.visibilityState === 'visible') fetchMembers();
    };
    document.addEventListener('visibilitychange', handleVis);

    const id = setInterval(fetchMembers, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      clearInterval(id);
    };
  }, []);

  const rowClass = (idx: number) =>
    idx === 0 ? 'bg-[#ffd70090]' :     // gold
    idx === 1 ? 'bg-[#c0c0c090]' :     // silver
    idx === 2 ? 'bg-[#cd7f3290]' :     // bronze
    '';

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        <Link href="/" className="text-green-700 hover:underline">← Back Home</Link>
        <h1 className="text-3xl font-bold text-center text-gray-900 my-6">League Members</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
          </div>
        ) : error ? (
          <p className="text-center text-red-600">{error}</p>
        ) : (
          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Handicap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {members.map((m, index) => (
                  <tr key={m.id} className={rowClass(index)}>
                    <td className="px-4 py-2">{(() => {const parts=m.full_name.split(' ');return parts[0]+ ' '+(parts[1]?.charAt(0)||'')+'.';})()}</td>
                    <td className="px-4 py-2">{m.handicap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p>* Top 3 players are highlighted Gold, Silver, Bronze.</p>
      </div>
    </div>
  );
} 