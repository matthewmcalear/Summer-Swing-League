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
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className={`${pop.className} text-2xl font-bold text-green-800 tracking-wide`}>Summer Swing League</h1>
              </div>
            </div>
            <div className="flex items-center">
              <Link href="/submit-score" className="ml-4 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700">
                Submit Score
              </Link>
              <Link href="/register" className="ml-4 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700">
                Register
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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
                    <Link href="/admin" className="text-green-600 hover:text-green-800">
                      Admin Dashboard
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
            <StandingsChart />
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