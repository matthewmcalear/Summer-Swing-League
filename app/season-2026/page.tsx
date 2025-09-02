'use client';

import Link from 'next/link';

export default function Season2026() {
  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-green-800 mb-4">
            🏌️ Summer Swing League 2026 🏌️
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Get Ready for Another Amazing Season!
          </p>
          <p className="text-lg text-gray-500">
            May 1 - August 31, 2026
          </p>
        </div>

        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-8 mb-8 text-white text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h2 className="text-3xl font-bold mb-4">Registration Opens Soon!</h2>
          <p className="text-lg mb-4">
            Stay tuned for registration details and early bird opportunities.
          </p>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 inline-block">
            <p className="text-sm">
              <strong>Registration Opens:</strong> March 2026<br/>
              <strong>Season Starts:</strong> May 1, 2026
            </p>
          </div>
        </div>

        {/* What to Expect */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">What to Expect in 2026</h2>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">🏆</div>
                <div>
                  <h3 className="font-semibold text-green-800 mb-2">Enhanced Prize Structure</h3>
                  <p className="text-gray-600">Building on the success of 2025, we're planning even better prizes and recognition for top performers.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="text-3xl">📊</div>
                <div>
                  <h3 className="font-semibold text-green-800 mb-2">Improved Analytics</h3>
                  <p className="text-gray-600">Enhanced tracking and analytics to help you monitor your progress throughout the season.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="text-3xl">👥</div>
                <div>
                  <h3 className="font-semibold text-green-800 mb-2">Growing Community</h3>
                  <p className="text-gray-600">More players, more courses, and more opportunities for group play and friendly competition.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="text-3xl">🎯</div>
                <div>
                  <h3 className="font-semibold text-green-800 mb-2">Refined Rules</h3>
                  <p className="text-gray-600">Based on 2025 feedback, we'll have even better rules and scoring systems.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">2025 Season Highlights</h2>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">📈 Participation</h3>
                <p className="text-green-700 text-sm">Multiple players competed throughout the season with great engagement and sportsmanship.</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">🏌️ Course Variety</h3>
                <p className="text-blue-700 text-sm">Players enjoyed rounds at various courses, showcasing the flexibility of our format.</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-800 mb-2">💰 Prize Distribution</h3>
                <p className="text-purple-700 text-sm">$550 total prize pool distributed to top performers and most active players.</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">📊 Data Available</h3>
                <p className="text-yellow-700 text-sm">Complete season data available for download and analysis by all participants.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Information */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">2026 Season Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">📅</div>
              <h3 className="font-semibold text-gray-800 mb-2">Duration</h3>
              <p className="text-gray-600">May 1 - August 31, 2026</p>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-3">👥</div>
              <h3 className="font-semibold text-gray-800 mb-2">Format</h3>
              <p className="text-gray-600">Group play required</p>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="font-semibold text-gray-800 mb-2">Entry Fee</h3>
              <p className="text-gray-600">Free to join</p>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-3">🏆</div>
              <h3 className="font-semibold text-gray-800 mb-2">Prizes</h3>
              <p className="text-gray-600">Cash prizes for top performers</p>
            </div>
          </div>
        </div>



        {/* Footer */}
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">
            Thank you for being part of the Summer Swing League community!
          </p>
          <div className="space-x-4">
            <Link 
              href="/" 
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Back to Home
            </Link>
            <Link 
              href="/league-complete" 
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View 2025 Results
            </Link>
            <Link 
              href="/download-data" 
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Download 2025 Data
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
