'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RawData {
  members: Array<{
    id: number;
    full_name: string;
    email: string;
    handicap: number;
    created_at: string;
    updated_at: string;
    is_test: boolean;
  }>;
  scores: Array<{
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
    created_at: string;
  }>;
}

export default function RawData() {
  const [data, setData] = useState<RawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'scores'>('members');

  useEffect(() => {
    async function fetchRawData() {
      try {
        // Try to fetch from API first
        const [membersResponse, scoresResponse] = await Promise.all([
          fetch('/api/members'),
          fetch('/api/scores')
        ]);

        if (membersResponse.ok && scoresResponse.ok) {
          const [members, scores] = await Promise.all([
            membersResponse.json(),
            scoresResponse.json()
          ]);
          
          setData({ members, scores });
        } else {
          // If API fails (database offline), show sample data structure
          setData({
            members: [
              {
                id: 1,
                full_name: "Sample Player",
                email: "sample@example.com",
                handicap: 15.0,
                created_at: "2025-05-01T00:00:00.000Z",
                updated_at: "2025-08-31T00:00:00.000Z",
                is_test: false
              }
            ],
            scores: [
              {
                id: 1,
                player: "Sample Player",
                holes: 18,
                gross: 85,
                handicap: 15.0,
                difficulty: 1.0,
                group_members: "Player 2, Player 3",
                total_points: 45.5,
                play_date: "2025-05-15T00:00:00.000Z",
                course_name: "Sample Golf Course",
                created_at: "2025-05-15T00:00:00.000Z"
              }
            ]
          });
          setError("Database is currently offline. Showing sample data structure.");
        }
      } catch (err) {
        setError("Unable to load data. Database may be offline for the off-season.");
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRawData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-800 mb-4">
            📊 Raw League Data
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Complete database contents in JSON format
          </p>
          <p className="text-lg text-gray-500">
            Perfect for developers and data analysts
          </p>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-yellow-600 mr-3">⚠️</div>
              <div>
                <p className="text-yellow-800 font-medium">Database Offline</p>
                <p className="text-yellow-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Data Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-800 mb-3">📋 Data Structure</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-blue-700">Members Table:</p>
              <p className="text-blue-600">Player information, handicaps, contact details</p>
            </div>
            <div>
              <p className="font-medium text-blue-700">Scores Table:</p>
              <p className="text-blue-600">Round results, points, course information</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('members')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'members'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👥 Members ({data?.members.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('scores')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'scores'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏌️ Scores ({data?.scores.length || 0})
              </button>
            </nav>
          </div>

          {/* Data Display */}
          <div className="p-6">
            {activeTab === 'members' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Members Data</h3>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">
                    {data ? JSON.stringify(data.members, null, 2) : 'No data available'}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'scores' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Scores Data</h3>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">
                    {data ? JSON.stringify(data.scores, null, 2) : 'No data available'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Summary */}
        {data && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📈 Data Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{data.members.length}</div>
                <p className="text-gray-600">Total Members</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{data.scores.length}</div>
                <p className="text-gray-600">Total Scores</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {data.scores.length > 0 ? (data.scores.length / data.members.length).toFixed(1) : 0}
                </div>
                <p className="text-gray-600">Avg Rounds per Player</p>
              </div>
            </div>
          </div>
        )}

        {/* Technical Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">🔧 Technical Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Data Format</h3>
              <p className="text-gray-600 text-sm">JSON format with complete database schema</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Last Updated</h3>
              <p className="text-gray-600 text-sm">End of 2025 season (August 31, 2025)</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Database Type</h3>
              <p className="text-gray-600 text-sm">PostgreSQL with Prisma ORM</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Data Source</h3>
              <p className="text-gray-600 text-sm">Summer Swing League 2025 season</p>
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">💡 Usage Examples</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-2">JavaScript/Node.js</h3>
              <div className="bg-gray-900 text-green-400 p-3 rounded text-sm font-mono">
                <div>const data = await fetch('/api/members').then(r =&gt; r.json());</div>
                <div>console.log(data);</div>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-2">Python</h3>
              <div className="bg-gray-900 text-green-400 p-3 rounded text-sm font-mono">
                <div>import requests</div>
                <div>data = requests.get('/api/members').json()</div>
                <div>print(data)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">
            Use this data for analysis, visualization, or integration with other tools.
          </p>
          <div className="space-x-4">
            <Link 
              href="/" 
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Back to Home
            </Link>
            <Link 
              href="/download-data" 
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Download Database
            </Link>
            <Link 
              href="/analytics" 
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              View Analytics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
