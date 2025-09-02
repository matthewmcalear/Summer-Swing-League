'use client';

import Link from 'next/link';

export default function About() {
  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-green-800 mb-4">
            About Summer Swing League
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Fostering camaraderie and friendly competition through golf
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-lg text-gray-600 mb-6">
              The Summer Swing League was created to maximize summer golf fun by fostering camaraderie and encouraging friendly competition through group play. We offer a flexible and fun summer golf format that accommodates players of any skill level, schedule constraints, and location while rewarding personal improvement and participation.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">What Makes Us Different</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-800 mb-3">🏌️ Group Play Focus</h3>
                <p className="text-green-700">
                  We require group play to encourage social interaction and make golf more enjoyable for everyone.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-800 mb-3">📊 Fair Scoring</h3>
                <p className="text-blue-700">
                  Our handicap-based scoring system ensures fair competition across all skill levels.
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="font-semibold text-purple-800 mb-3">💰 Cash Prizes</h3>
                <p className="text-purple-700">
                  We offer real cash prizes to reward top performers and most active players.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="font-semibold text-yellow-800 mb-3">📈 Data Transparency</h3>
                <p className="text-yellow-700">
                  All league data is available for download, ensuring complete transparency.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">League History</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="text-2xl">🏆</div>
                  <div>
                    <h3 className="font-semibold text-gray-800">2025 Season</h3>
                    <p className="text-gray-600">Our inaugural season with multiple participants, successful prize distribution, and complete data transparency.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="text-2xl">🚀</div>
                  <div>
                    <h3 className="font-semibold text-gray-800">2026 Season</h3>
                    <p className="text-gray-600">Building on our success with enhanced features, improved analytics, and a growing community.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Contact Us</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-800 mb-3">📧 General Inquiries</h3>
              <p className="text-green-700 mb-2">
                Questions about the league, rules, or participation?
              </p>
              <div className="bg-white border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <strong>Email:</strong> [Your email here]<br/>
                  <strong>Response Time:</strong> Within 24 hours
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-800 mb-3">💡 Feedback & Suggestions</h3>
              <p className="text-blue-700 mb-2">
                Have ideas to improve the league? We'd love to hear them!
              </p>
              <div className="bg-white border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Email:</strong> [Your email here]<br/>
                  <strong>Subject:</strong> "League Feedback"
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-800 mb-3">📅 2026 Season Registration</h3>
            <p className="text-yellow-700 mb-2">
              Want to be notified when registration opens for the 2026 season?
            </p>
            <div className="bg-white border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Email:</strong> [Your email here]<br/>
                <strong>Subject:</strong> "2026 Registration Notification"
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-semibold text-gray-800 mb-2">How much does it cost to join?</h3>
              <p className="text-gray-600">The league is completely free to join! Players only pay for their own golf fees each round.</p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-semibold text-gray-800 mb-2">Do I need to be a good golfer?</h3>
              <p className="text-gray-600">Not at all! Our handicap-based scoring system ensures fair competition for players of all skill levels.</p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-semibold text-gray-800 mb-2">Can I play solo rounds?</h3>
              <p className="text-gray-600">No, group play is required to encourage social interaction and make the experience more enjoyable for everyone.</p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-semibold text-gray-800 mb-2">How are prizes determined?</h3>
              <p className="text-gray-600">Prizes are awarded based on season scores (best 5 rounds) and participation (most rounds played).</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">When does the 2026 season start?</h3>
              <p className="text-gray-600">The 2026 season runs from May 1 to August 31, 2026. Registration will open in March 2026.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">
            Join us for another amazing season of golf and friendship!
          </p>
          <div className="space-x-4">
            <Link 
              href="/" 
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Back to Home
            </Link>
            <Link 
              href="/season-2026" 
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Learn About 2026
            </Link>
            <Link 
              href="/rules" 
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              View Rules
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
