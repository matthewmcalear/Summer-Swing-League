import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the static data files
    const membersPath = path.join(process.cwd(), 'public', 'members.json');
    const scoresPath = path.join(process.cwd(), 'public', 'scores.json');

    const members = JSON.parse(fs.readFileSync(membersPath, 'utf8'));
    const scores = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));

    // Filter out test data
    const realMembers = members.filter((m: any) => !m.is_test_data);
    const realScores = scores.filter((s: any) => {
      return realMembers.some((m: any) => s.player.includes(m.full_name));
    });

    // Calculate standings for each member
    const standings = realMembers.map((member: any) => {
      // Find scores where the player field starts with the member's name
      const memberScores = realScores.filter((score: any) => {
        const players = score.player.split(',');
        return players[0].trim() === member.full_name;
      });

      const totalRounds = memberScores.length;
      
      // Calculate total points
      const sortedScores = [...memberScores].sort((a: any, b: any) => Number(b.total_points ?? 0) - Number(a.total_points ?? 0));
      const bestScores = sortedScores.slice(0, 5);
      
      // Sum of best 5 (or fewer) rounds
      const totalPoints = bestScores.reduce((sum: number, score: any) => sum + Number(score.total_points ?? 0), 0);

      // Season score multiplier based on number of rounds played
      let multiplier = 1;
      if (totalRounds < 5) {
        multiplier = [0.2, 0.4, 0.6, 0.8][totalRounds - 1] || 1;
      }

      const seasonScore = totalPoints * multiplier;

      const topScores = bestScores.map((s: any) => Number(s.total_points ?? 0));

      return {
        id: member.id,
        name: member.full_name,
        handicap: member.handicap,
        totalRounds,
        totalPoints,
        seasonScore,
        topScores,
      };
    });

    // Sort by season score
    standings.sort((a, b) => b.seasonScore - a.seasonScore);

    return NextResponse.json(standings);
  } catch (error) {
    console.error('Error loading static standings:', error);
    return NextResponse.json({ error: 'Failed to load standings data' }, { status: 500 });
  }
}
