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

export default function LiveScore() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    player: '',
    holes: '18' as '9' | '18',
    course_name: '',
    difficulty: '1.0',
    play_date: new Date().toISOString().split('T')[0],
    bonus_points: '',
    holeScores: Array(18).fill(0),
  });

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('liveScoreDraft');
    if (saved) {
      setFormData(JSON.parse(saved));
    }

    // Fetch members
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

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('liveScoreDraft', JSON.stringify(formData));
  }, [formData]);

  const handleHoleChange = (hole: number, score: string) => {
    const newScores = [...formData.holeScores];
    newScores[hole - 1] = parseInt(score) || 0;
    setFormData({ ...formData, holeScores: newScores });
  };

  const calculateGross = () => {
    const relevantHoles = formData.holes === '9' ? 9 : 18;
    return formData.holeScores.slice(0, relevantHoles).reduce((sum, score) => sum + score, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const gross = calculateGross();
    if (gross === 0) {
      alert('Please enter some scores');
      return;
    }

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
          gross,
          holes: Number(formData.holes),
          difficulty: Number(formData.difficulty),
          bonus_points: formData.bonus_points === '' ? 0 : Number(formData.bonus_points),
          // Optionally add holeScores if API supports
        }),
      });

      if (response.ok) {
        localStorage.removeItem('liveScoreDraft');
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

  const gross = calculateGross();

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6 md:p-8">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6 md:mb-8">
          Live On-Course Score Entry
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="player" className="block text-sm font-medium text-gray-700">
              Player
            </label>
            <select
              id="player"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-lg p-2"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-lg p-2"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-lg p-2"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-lg p-2"
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
              Holes
            </label>
            <select
              id="holes"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-lg p-2"
              value={formData.holes}
              onChange={(e) => setFormData({ ...formData, holes: e.target.value as '9' | '18' })}
            >
              <option value="9">9 Holes</option>
              <option value="18">18 Holes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hole Scores
            </label>
            <div className="grid grid-cols-6 gap-2">
              {formData.holeScores.slice(0, formData.holes === '9' ? 9 : 18).map((score, index) => (
                <input
                  key={index}
                  type="number"
                  min="1"
                  max="20"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-lg p-2 text-center"
                  value={score > 0 ? score : ''}
                  onChange={(e) => handleHoleChange(index + 1, e.target.value)}
                  placeholder={`H${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="bonus_points" className="block text-sm font-medium text-gray-700">
              Bonus Points (optional)
            </label>
            <input
              type="number"
              id="bonus_points"
              min="0"
              step="0.1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-lg p-2"
              value={formData.bonus_points}
              onChange={(e) => setFormData({ ...formData, bonus_points: e.target.value })}
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
                      className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      checked={selectedMembers.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMembers([...selectedMembers, member.id]);
                        } else {
                          setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                        }
                      }}
                    />
                    <span className="ml-2 text-base text-gray-700">{member.full_name}</span>
                  </label>
                ))}
            </div>
          </div>

          <div className="text-center text-lg font-bold text-green-600">
            Current Gross: {gross}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('liveScoreDraft');
                setFormData({ ...formData, holeScores: Array(18).fill(0) });
              }}
              className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Clear Draft
            </button>
            <button
              type="submit"
              className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Submit Score
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
