'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    handicap: '',
    handicapSource: 'app', // 'app' or 'average'
    is_test: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Calculate final handicap based on source
      let finalHandicap = parseFloat(formData.handicap);
      if (formData.handicapSource === 'average') {
        // Convert average score to handicap (assuming par 36 for 9 holes)
        finalHandicap = (parseFloat(formData.handicap) - 36) * 2; // Convert to 18-hole handicap
      }

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          handicap: finalHandicap,
          is_test: formData.is_test
        }),
      });

      if (response.ok) {
        router.push('/success');
      } else {
        const error = await response.json();
        alert(error.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Register for Summer Swing League
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              id="full_name"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How would you like to provide your handicap?
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="handicapSource"
                  value="app"
                  checked={formData.handicapSource === 'app'}
                  onChange={(e) => setFormData({ ...formData, handicapSource: e.target.value })}
                  className="h-4 w-4 text-green-600 focus:ring-green-500"
                />
                <span className="ml-2 text-sm text-gray-700">I use a golf app (Golf Pad, 18Birdies, GHIN, The Grint)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="handicapSource"
                  value="average"
                  checked={formData.handicapSource === 'average'}
                  onChange={(e) => setFormData({ ...formData, handicapSource: e.target.value })}
                  className="h-4 w-4 text-green-600 focus:ring-green-500"
                />
                <span className="ml-2 text-sm text-gray-700">I'll provide my average score</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="handicap" className="block text-sm font-medium text-gray-700">
              {formData.handicapSource === 'app' ? 'Handicap' : 'Average Score (9 holes)'}
            </label>
            <input
              type="number"
              id="handicap"
              required
              step="0.1"
              min={formData.handicapSource === 'app' ? "0" : "30"}
              max={formData.handicapSource === 'app' ? "54" : "70"}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={formData.handicap}
              onChange={(e) => setFormData({ ...formData, handicap: e.target.value })}
            />
            <p className="mt-1 text-sm text-gray-500">
              {formData.handicapSource === 'app' 
                ? "Enter your current handicap index (0-54)" 
                : "Enter your typical 9-hole score (30-70)"}
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_test"
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              checked={formData.is_test}
              onChange={(e) => setFormData({ ...formData, is_test: e.target.checked })}
            />
            <label htmlFor="is_test" className="ml-2 block text-sm text-gray-700">
              This is a test registration
            </label>
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 