import Image from 'next/image';

export default function Rules() {
  return (
    <div className="min-h-screen py-12">
      <div className="relative max-w-4xl mx-auto bg-white/90 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Summer Swing League Rules
        </h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Purpose</h2>
            <p className="text-gray-600">
              The SSL was created with the purpose to maximize summer golf fun by both fostering camaraderie and encouraging friendly competition through group play. The league offers a flexible and fun summer golf format (with cash prizes) that accommodates players of any skill level, schedule constraints, and location while rewarding personal improvement, and importantly, participation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-green-800 mb-4">League Overview</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Duration: May 1 - August 31, 2025</li>
              <li>Eligibility: Open to registered league members</li>
              <li>Cost: Free to join (participants pay their own golf fees each round)</li>
              <li>Format: Group play required; no solo rounds permitted</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Rules</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">1. Group Play Requirement</h3>
                <p className="text-gray-600">
                  Each round of golf (booked on your own) must include at least one other verified league member. Rounds with non-members do not count.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">2. Membership Verification</h3>
                <p className="text-gray-600">
                  Only participants registered prior to a round qualify for scoring and bonuses.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">3. Scoring</h3>
                <p className="text-gray-600 mb-2">
                  The goal is to reward skill (via handicaps), encourage group play (with bonuses), and ensure fairness across 9-hole and 18-hole rounds, even for high scores.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li>Base Points:
                    <ul className="list-disc list-inside ml-4">
                      <li>9 holes: 75 - (Gross Score - Handicap (9 hole))</li>
                      <li>18 holes: (150 - (Gross Score - Handicap (18 hole))) / 2</li>
                    </ul>
                  </li>
                  <li>Course Difficulty Adjustment: Easy (×0.95), Average (×1.0), Tough (×1.05)</li>
                  <li>Group Bonus: +1 point per verified league member present (including self)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">4. Season Score</h3>
                <p className="text-gray-600">
                  At the end of the season, each player's best 5 rounds of golf will be used to calculate their final score. If you play less than 5 rounds during the season, a multiplier is applied to your total.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
                  <li>1 round = 20%</li>
                  <li>2 rounds = 40%</li>
                  <li>3 rounds = 60%</li>
                  <li>4 rounds = 80%</li>
                  <li>5+ rounds = 100%</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Prizes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-800">1st Place</h3>
                <p className="text-yellow-600">$250</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800">2nd Place</h3>
                <p className="text-gray-600">$150</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <h3 className="font-semibold text-amber-800">3rd Place</h3>
                <p className="text-amber-600">$75</p>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold text-gray-800">Going the Distance Award</h3>
              <p className="text-gray-600">$75 for the player with the most rounds played (tie breaker based on total season points)</p>
            </div>
          </section>

          {/* Handicap Assignment */}
          <section>
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Handicap Assignment</h2>
            <p className="text-gray-600 mb-2">Your handicap is fixed at the start of the season so everyone plays on equal footing.</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><span className="font-semibold">Priority – Golf App&nbsp;Users:</span> provide the index shown in your preferred app (Golf&nbsp;Pad, 18Birdies, GHIN, The&nbsp;Grint, etc.). Example: "My Golf&nbsp;Pad handicap is&nbsp;10."</li>
              <li><span className="font-semibold">No&nbsp;App:</span> send an average 9&nbsp;hole score from recent rounds. Handicap = Average&nbsp;Score&nbsp;−&nbsp;Par. Example: 48&nbsp;avg&nbsp;–&nbsp;36&nbsp;par&nbsp;=&nbsp;12 (×2&nbsp;=&nbsp;24 for 18 holes).</li>
              <li><span className="font-semibold">New&nbsp;Players:</span> we'll estimate from a practice round or assign a temporary 25&nbsp;–&nbsp;35 until data is available.</li>
            </ul>
          </section>

          {/* Registration */}
          <section>
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Registration</h2>
            <p className="text-gray-600 mb-4">Email <a href="mailto:matthew.mcalear@gmail.com" className="text-green-700 underline">Matthew&nbsp;McAlear</a> (or text / DM) with "I'm in!" and your handicap info. You'll be added to the member list, get the live standings sheet and group&nbsp;chat details. Only verified members count toward bonuses.</p>
          </section>

          {/* Scoring Examples */}
          <section>
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Scoring Examples</h2>
            <div className="space-y-4 text-gray-600 text-sm">
              <div>
                <h3 className="font-semibold text-gray-800">9&nbsp;hole Example</h3>
                <p>Player&nbsp;John&nbsp;Cena (HCP&nbsp;8) shoots 44 (Average course) with 3 league members.</p>
                <p>Net&nbsp;=&nbsp;44&nbsp;−&nbsp;8&nbsp;=&nbsp;36<br/>Base&nbsp;=&nbsp;75&nbsp;−&nbsp;36&nbsp;=&nbsp;39<br/>Bonus&nbsp;=&nbsp;3<br/>Total&nbsp;=&nbsp;39&nbsp;&nbsp;+&nbsp;&nbsp;3&nbsp;&nbsp;=&nbsp;&nbsp;42&nbsp;&nbsp;pts</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">18&nbsp;hole Example</h3>
                <p>Player&nbsp;Jimmy&nbsp;Buffet (HCP&nbsp;20) shoots 120 (Tough course ×1.05) with 5 members.</p>
                <p>Net&nbsp;=&nbsp;120&nbsp;−&nbsp;20&nbsp;=&nbsp;100<br/>Base&nbsp;= (150&nbsp;−&nbsp;100)/2&nbsp;= 25<br/>Adj.&nbsp;= 25&nbsp;×&nbsp;1.05&nbsp;= 26.25<br/>Bonus&nbsp;= 5<br/>Total&nbsp;= 31.25&nbsp;pts</p>
              </div>
            </div>
          </section>

          {/* Season Score Examples */}
          <section>
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Season Score Examples</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600 text-sm">
              <li><span className="font-semibold">5&nbsp;+ Rounds:</span> Chun&nbsp;Li's best 5 = 42,45,40,43,41 → Total&nbsp;211 ×100%&nbsp;=&nbsp;211</li>
              <li><span className="font-semibold">3&nbsp;Rounds:</span> Barry's best 3 = 57.5,50,52 → 159.5 ×60%&nbsp;= 95.7</li>
            </ul>
          </section>

          {/* Special Events */}
          <section>
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Special Events</h2>
            <p className="text-gray-600">Group outings will be scheduled during the summer. Attendance earns bonus points—details will be announced in advance.</p>
          </section>

          {/* Financial Responsibility */}
          <section>
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Financial Responsibility</h2>
            <p className="text-gray-600">The SSL does <span className="font-semibold">not</span> cover any golf&nbsp;related expenses. Players pay their own green/cart fees each round. Playing budget&nbsp;friendly courses is encouraged!</p>
          </section>

          {/* Participation Benefits */}
          <section>
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Participation Benefits</h2>
            <p className="text-gray-600">Enjoy organized summer golf, connect with friends &amp; family, and compete for cash prizes—all while setting your own tee&nbsp;times and course choices.</p>
          </section>
        </div>
      </div>
    </div>
  );
} 