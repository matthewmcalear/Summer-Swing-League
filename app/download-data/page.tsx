'use client';

import Link from 'next/link';

export default function DownloadData() {
  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-green-800 mb-4">
            📊 Download League Data
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Access the complete Summer Swing League 2025 dataset
          </p>
          <p className="text-lg text-gray-500">
            Perfect for analytics, research, and personal insights
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">💾</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Complete League Data Export
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Download all league data from the 2025 season in multiple formats for easy analysis and offline access.
            </p>
          </div>

          {/* Database Dump Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-green-800 mb-4">🗄️ Database Dump (PostgreSQL)</h3>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-green-700 font-medium">latest.dump</p>
                <p className="text-sm text-green-600">Complete PostgreSQL database dump (26.7 KB)</p>
              </div>
              <a
                href="/latest.dump"
                download="summer-swing-league-2025-database.dump"
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Download Database
              </a>
            </div>
          </div>

          {/* JSON Data Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-blue-800 mb-4">📄 JSON Data Files</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div>
                  <p className="font-medium text-blue-700">members.json</p>
                  <p className="text-sm text-blue-600">All league members (17.6 KB)</p>
                </div>
                <a
                  href="/members.json"
                  download="summer-swing-league-2025-members.json"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  Download
                </a>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div>
                  <p className="font-medium text-blue-700">scores.json</p>
                  <p className="text-sm text-blue-600">All golf scores (205 KB)</p>
                </div>
                <a
                  href="/scores.json"
                  download="summer-swing-league-2025-scores.json"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  Download
                </a>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div>
                  <p className="font-medium text-blue-700">player_stats.json</p>
                  <p className="text-sm text-blue-600">Player statistics (39.5 KB)</p>
                </div>
                <a
                  href="/player_stats.json"
                  download="summer-swing-league-2025-player-stats.json"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  Download
                </a>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div>
                  <p className="font-medium text-blue-700">season_summary.json</p>
                  <p className="text-sm text-blue-600">Season overview (458 bytes)</p>
                </div>
                <a
                  href="/season_summary.json"
                  download="summer-swing-league-2025-season-summary.json"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  Download
                </a>
              </div>
            </div>
          </div>

          {/* CSV Data Section */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-purple-800 mb-4">📊 CSV Data Files</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div>
                  <p className="font-medium text-purple-700">members.csv</p>
                  <p className="text-sm text-purple-600">All league members (3.1 KB)</p>
                </div>
                <a
                  href="/members.csv"
                  download="summer-swing-league-2025-members.csv"
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm"
                >
                  Download
                </a>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div>
                  <p className="font-medium text-purple-700">scores.csv</p>
                  <p className="text-sm text-purple-600">All golf scores (39.5 KB)</p>
                </div>
                <a
                  href="/scores.csv"
                  download="summer-swing-league-2025-scores.csv"
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm"
                >
                  Download
                </a>
              </div>
            </div>
          </div>

          {/* Data Index */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-yellow-800 mb-4">📋 Data Index</h3>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-yellow-700 font-medium">data-index.json</p>
                <p className="text-sm text-yellow-600">Complete index of all available data files</p>
              </div>
              <a
                href="/data-index.json"
                download="summer-swing-league-2025-data-index.json"
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
              >
                Download Index
              </a>
            </div>
          </div>

          {/* Data Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 What's Included</h3>
              <ul className="text-blue-700 space-y-2">
                <li>• All member registrations and handicaps</li>
                <li>• Complete score history for all rounds</li>
                <li>• Course information and difficulty ratings</li>
                <li>• Group play data and bonus points</li>
                <li>• Round dates and hole counts</li>
                <li>• All calculated points and adjustments</li>
                <li>• Player statistics and standings</li>
                <li>• Season summary and analytics</li>
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-800 mb-3">🔧 How to Use</h3>
              <ul className="text-purple-700 space-y-2">
                <li>• <strong>JSON:</strong> Direct import into JavaScript/Node.js</li>
                <li>• <strong>CSV:</strong> Excel, Google Sheets, Python pandas</li>
                <li>• <strong>Database:</strong> Restore to PostgreSQL</li>
                <li>• Create custom visualizations</li>
                <li>• Perform statistical analysis</li>
                <li>• Build personal dashboards</li>
                <li>• Research golf performance trends</li>
              </ul>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">⚙️ Technical Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Formats Available:</p>
                <p className="text-gray-600">PostgreSQL, JSON, CSV</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Total Data Size:</p>
                <p className="text-gray-600">~270 KB (all formats)</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Season:</p>
                <p className="text-gray-600">May 1 - August 30, 2025</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Records:</p>
                <p className="text-gray-600">31 members, 190 scores</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Export Date:</p>
                <p className="text-gray-600">September 2, 2025</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Offline Ready:</p>
                <p className="text-gray-600">✅ No database required</p>
              </div>
            </div>
          </div>

          {/* Usage Examples */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">🔄 Usage Examples</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-yellow-800 mb-2">PostgreSQL Database:</h4>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <div className="mb-2"># Create database and restore</div>
                  <div className="mb-2">createdb summer_swing_league_2025</div>
                  <div className="mb-2">pg_restore -d summer_swing_league_2025 summer-swing-league-2025-database.dump</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-yellow-800 mb-2">JavaScript/Node.js:</h4>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <div className="mb-2">// Load JSON data</div>
                  <div className="mb-2">const members = require('./members.json');</div>
                  <div className="mb-2">const scores = require('./scores.json');</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-yellow-800 mb-2">Python pandas:</h4>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <div className="mb-2">import pandas as pd</div>
                  <div className="mb-2">members = pd.read_csv('members.csv')</div>
                  <div>scores = pd.read_csv('scores.csv')</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Suggestions */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            💡 Analytics Ideas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">📈 Performance Trends</h3>
              <p className="text-blue-700 text-sm">Analyze how players improved over the season</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">🏌️ Course Analysis</h3>
              <p className="text-green-700 text-sm">Compare performance across different courses</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">👥 Group Dynamics</h3>
              <p className="text-purple-700 text-sm">Study the impact of group play on scores</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">📊 Handicap Analysis</h3>
              <p className="text-yellow-700 text-sm">Examine handicap accuracy and adjustments</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">🎯 Scoring Patterns</h3>
              <p className="text-red-700 text-sm">Identify scoring trends and consistency</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
              <h3 className="font-semibold text-indigo-800 mb-2">📅 Seasonal Analysis</h3>
              <p className="text-indigo-700 text-sm">Track performance changes throughout the season</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">
            Happy analyzing! Share your insights with the league community.
          </p>
          <div className="space-x-4">
            <Link 
              href="/" 
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Back to Home
            </Link>
            <Link 
              href="/raw-data" 
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              View Raw Data
            </Link>
            <Link 
              href="/league-complete" 
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              League Results
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
