export default function Rules() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
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
                      <li>18 holes: 150 - (Gross Score - Handicap (18 hole)) * (1/2)</li>
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
        </div>
      </div>
    </div>
  );
} 