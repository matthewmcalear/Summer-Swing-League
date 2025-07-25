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
        const res = await fetch(`/api/members?fresh=${Date.now()}`);
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

  const rowClass = () => '';

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
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {members.map((m, index) => (
                  <tr key={m.id} className={rowClass()}>
                    <td className="px-4 py-2">{(() => {const parts=m.full_name.split(' ');return parts[0]+ ' '+(parts[1]?.charAt(0)||'')+'.';})()}</td>
                    <td className="px-4 py-2">{m.handicap}</td>
                    <td className="px-4 py-2">
                      <Link 
                        href={`/players/${m.id}`} 
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Medal highlights removed */}
      </div>
    </div>
  );
} 