import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Poppins } from 'next/font/google';

const StandingsChart = dynamic(() => import('./components/StandingsChart'), { ssr: false });

const pop = Poppins({
  weight: '400',
  subsets: ['latin'],
});

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center py-2">
            <h1 className={`${pop.className} text-2xl font-bold text-green-800 tracking-wide`}>Summer Swing League</h1>
            <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
              <Link href="/submit-score" className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 text-sm">
                Submit Score
              </Link>
              <Link href="/register" className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 text-sm">
                Register
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* League Completion Banner */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-6 mb-6 text-white">
            <div className="flex flex-col">
              <div className="flex-1">
                <h2 className={`${pop.className} text-2xl md:text-3xl font-bold mb-2`}>🏆 SUMMER SWING LEAGUE 2025 - COMPLETED! 🏆</h2>
                <p className="text-lg mb-4">The 2025 season has officially ended. Check out the final results and winners!</p>
                <div className="flex flex-wrap gap-3">
                  <Link 
                    href="/league-complete" 
                    className="px-6 py-3 bg-white text-green-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    View Final Results & Winners
                  </Link>
                  <Link 
                    href="/standings" 
                    className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-400 transition-colors"
                  >
                    Final Standings
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* SSL Open Event Banner */}
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 mb-6 text-white">
            <div className="flex flex-col">
              <div className="flex-1">
                <h2 className={`${pop.className} text-2xl md:text-3xl font-bold mb-2`}>🏆 SSL Golf Open 2025 - COMPLETED! 🏆</h2>
                <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-4">
                  <h3 className="font-bold text-xl mb-2 text-center">🎉 CONGRATULATIONS THOMAS MCALEAR! 🎉</h3>
                  <p className="text-center text-lg font-semibold">2025 SSL Open Champion</p>
                  <p className="text-center text-sm mt-1">Winning Score: 59.0 Round Points + 10.0 Tournament Win Bonus = 69.0 Total Points</p>
                  <p className="text-center text-xs mt-1 text-yellow-100">(102 Gross, 62.0 Net)</p>
                </div>
                
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                   <div className="bg-white bg-opacity-20 rounded-lg p-4">
                     <h3 className="font-bold text-lg mb-2">🏅 Top 3 Finishers</h3>
                     <ul className="text-sm space-y-1">
                       <li>🥇 1st: Thomas McAlear - 59.0 + 10.0 = 69.0 pts</li>
                       <li>🥈 2nd: Nick Clarke - 57.5 pts</li>
                       <li>🥉 3rd: Rachel Kuta - 56.5 pts</li>
                     </ul>
                   </div>
                   <div className="bg-white bg-opacity-20 rounded-lg p-4">
                     <h3 className="font-bold text-lg mb-2">📊 Tournament Summary</h3>
                     <ul className="text-sm space-y-1">
                       <li>• 11 Players Competed</li>
                       <li>• All 18-hole rounds</li>
                       <li>• Course: Golf des Îles de Boucherville</li>
                       <li>• Date: August 10th, 2025</li>
                       <li>• Tournament Winner receives +10.0 bonus points</li>
                     </ul>
                   </div>
                 </div>
                
                                 <div className="bg-white bg-opacity-20 rounded-lg p-4">
                   <h3 className="font-bold text-lg mb-2">🏌️ Full Results (Ranked by SSL Points - Highest Wins)</h3>
                   <div className="text-xs overflow-x-auto">
                     <table className="w-full">
                       <thead>
                         <tr className="border-b border-yellow-200">
                           <th className="text-left py-1">Rank</th>
                           <th className="text-left py-1">Player</th>
                           <th className="text-left py-1">Gross</th>
                           <th className="text-left py-1">Net</th>
                           <th className="text-left py-1">SSL Points</th>
                         </tr>
                       </thead>
                       <tbody>
                         <tr className="border-b border-yellow-100 bg-yellow-100 bg-opacity-30">
                           <td className="py-1 font-bold">🥇 1st</td>
                           <td className="py-1 font-bold">Thomas McAlear</td>
                           <td className="py-1">102</td>
                           <td className="py-1">62.0</td>
                           <td className="py-1 font-bold text-lg">69.0</td>
                         </tr>
                         <tr className="border-b border-yellow-100 bg-yellow-100 bg-opacity-20">
                           <td className="py-1 font-bold">🥈 2nd</td>
                           <td className="py-1 font-bold">Nick Clarke</td>
                           <td className="py-1">91</td>
                           <td className="py-1">65.0</td>
                           <td className="py-1 font-bold">57.5</td>
                         </tr>
                         <tr className="border-b border-yellow-100 bg-yellow-100 bg-opacity-20">
                           <td className="py-1 font-bold">🥉 3rd</td>
                           <td className="py-1 font-bold">Rachel Kuta</td>
                           <td className="py-1">92</td>
                           <td className="py-1">67.0</td>
                           <td className="py-1 font-bold">56.5</td>
                         </tr>
                         <tr className="border-b border-yellow-100">
                           <td className="py-1">4th</td>
                           <td className="py-1">Daniel McAlear</td>
                           <td className="py-1">91</td>
                           <td className="py-1">67.0</td>
                           <td className="py-1">56.5</td>
                         </tr>
                         <tr className="border-b border-yellow-100">
                           <td className="py-1">5th</td>
                           <td className="py-1">Matthew McAlear</td>
                           <td className="py-1">102</td>
                           <td className="py-1">66.0</td>
                           <td className="py-1">56.0</td>
                         </tr>
                         <tr className="border-b border-yellow-100">
                           <td className="py-1">6th</td>
                           <td className="py-1">Tibi Mitran</td>
                           <td className="py-1">102</td>
                           <td className="py-1">69.0</td>
                           <td className="py-1">55.5</td>
                         </tr>
                         <tr className="border-b border-yellow-100">
                           <td className="py-1">7th</td>
                           <td className="py-1">Eviatar Fields</td>
                           <td className="py-1">99</td>
                           <td className="py-1">71.0</td>
                           <td className="py-1">54.5</td>
                         </tr>
                         <tr className="border-b border-yellow-100">
                           <td className="py-1">8th</td>
                           <td className="py-1">Connor Peltz</td>
                           <td className="py-1">92</td>
                           <td className="py-1">72.0</td>
                           <td className="py-1">54.0</td>
                         </tr>
                         <tr className="border-b border-yellow-100">
                           <td className="py-1">9th</td>
                           <td className="py-1">Jackson Shea</td>
                           <td className="py-1">102</td>
                           <td className="py-1">72.0</td>
                           <td className="py-1">54.0</td>
                         </tr>
                         <tr className="border-b border-yellow-100">
                           <td className="py-1">10th</td>
                           <td className="py-1">Alex Sokaris</td>
                           <td className="py-1">98</td>
                           <td className="py-1">74.0</td>
                           <td className="py-1">53.0</td>
                         </tr>
                         <tr>
                           <td className="py-1">11th</td>
                           <td className="py-1">Kashif Khan</td>
                           <td className="py-1">125</td>
                           <td className="py-1">92.0</td>
                           <td className="py-1">32.0</td>
                         </tr>
                       </tbody>
                     </table>
                   </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className={`${pop.className} text-3xl font-bold text-gray-900 mb-4`}>Welcome to Summer Swing League 2025</h2>
            <p className="text-gray-600 mb-4">
              Join us for a summer of competitive and social golf from May 1 to August 31, 2025.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-green-800 mb-2">League Overview</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Duration: May 1 - August 31, 2025</li>
                  <li>• Open to all skill levels</li>
                  <li>• Group play required</li>
                  <li>• Cash prizes for top performers</li>
                </ul>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-green-800 mb-2">Quick Links</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/rules" className="text-green-600 hover:text-green-800">
                      View League Rules
                    </Link>
                  </li>
                  <li>
                    <Link href="/standings" className="text-green-600 hover:text-green-800">
                      Current Standings
                    </Link>
                  </li>
                  <li>
                    <Link href="/members" className="text-green-600 hover:text-green-800">
                      View Members
                    </Link>
                  </li>
                  <li>
                    <Link href="/scores" className="text-green-600 hover:text-green-800">
                      All Scores
                    </Link>
                  </li>
                  <li>
                    <Link href="/submit-score" className="text-green-600 hover:text-green-800">
                      Submit Score
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="text-green-600 hover:text-green-800">
                      Register Now
                    </Link>
                  </li>
                  <li>
                    <Link href="/analytics" className="text-green-600 hover:text-green-800">
                      Analytics Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin" className="text-green-600 hover:text-green-800">
                      Admin Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/league-complete" className="text-green-600 hover:text-green-800 font-semibold">
                      🏆 League Completion Results
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-semibold text-green-800 mb-4">Prizes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800">1st Place</h4>
                  <p className="text-yellow-600">$250</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800">2nd Place</h4>
                  <p className="text-gray-600">$150</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h4 className="font-semibold" style={{color:'#cd7f32'}}>3rd Place</h4>
                  <p style={{color:'#cd7f32'}}>$75</p>
                </div>
              </div>
            </div>

            {/* Standings Chart */}
            <div className="mt-6 overflow-x-auto">
              <div className="min-w-[600px]">
                <StandingsChart />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white shadow-sm mt-8">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">
            © 2025 Summer Swing League. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
} 