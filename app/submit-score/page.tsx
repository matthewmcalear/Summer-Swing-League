'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Member {
  id: number;
  full_name: string;
  handicap: number;
  email: string;
  created_at: Date;
  updated_at: Date;
  is_test: boolean;
}

export default function SubmitScore() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    player: '',
    holes: '18',
    gross: '',
    course_name: '',
    difficulty: '1.0', // Default to average
    play_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    // Fetch members for the group play selection
    async function fetchMembers() {
      try {
        const response = await fetch('/api/members');
        const data = await response.json();
        setMembers(data.filter((m: Member) => !m.is_test));
      } catch (error) {
        console.error('Error fetching members:', error);
      }
    }

    fetchMembers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          group_member_ids: selectedMembers,
          play_date: new Date(formData.play_date + 'T12:00:00').toISOString(),
          player: Number(formData.player),
          gross: Number(formData.gross),
          holes: Number(formData.holes),
          difficulty: Number(formData.difficulty)
        }),
      });

      if (response.ok) {
        router.push('/success-score');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit score. Please try again.');
      }
    } catch (error) {
      console.error('Score submission error:', error);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Submit Score
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="player" className="block text-sm font-medium text-gray-700">
              Player
            </label>
            <select
              id="player"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={formData.player}
              onChange={(e) => setFormData({ ...formData, player: e.target.value })}
            >
              <option value="">Select player</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="play_date" className="block text-sm font-medium text-gray-700">
              Date Played
            </label>
            <input
              type="date"
              id="play_date"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={formData.play_date}
              onChange={(e) => setFormData({ ...formData, play_date: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="course_name" className="block text-sm font-medium text-gray-700">
              Course Name
            </label>
            <input
              type="text"
              id="course_name"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={formData.course_name}
              onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
              Course Difficulty
            </label>
            <select
              id="difficulty"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            >
              <option value="0.95">Easy</option>
              <option value="1.0">Average</option>
              <option value="1.05">Tough</option>
            </select>
          </div>

          <div>
            <label htmlFor="holes" className="block text-sm font-medium text-gray-700">
              Holes Played
            </label>
            <select
              id="holes"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={formData.holes}
              onChange={(e) => setFormData({ ...formData, holes: e.target.value })}
            >
              <option value="9">9 Holes</option>
              <option value="18">18 Holes</option>
            </select>
          </div>

          <div>
            <label htmlFor="gross" className="block text-sm font-medium text-gray-700">
              Gross Score
            </label>
            <input
              type="number"
              id="gross"
              required
              min={formData.holes === '9' ? "30" : "60"}
              max={formData.holes === '9' ? "70" : "140"}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={formData.gross}
              onChange={(e) => setFormData({ ...formData, gross: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Members (select all that played with you)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
              {members
                .filter(m => m.id.toString() !== formData.player)
                .map((member) => (
                  <label key={member.id} className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      checked={selectedMembers.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMembers([...selectedMembers, member.id]);
                        } else {
                          setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                        }
                      }}
                    />
                    <span className="ml-2 text-sm text-gray-700">{member.full_name}</span>
                  </label>
                ))}
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Submit Score
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 