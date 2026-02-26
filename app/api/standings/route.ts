import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface StandingEntry {
  id: number;
  name: string;
  handicap: number;
  totalRounds: number;
  totalPoints: number;
  seasonScore: number;
  topScores: number[]; // best 5 or fewer round points
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get all non-test members
    const members = await prisma.member.findMany({
      where: {
        is_test: false
      }
    });

    // Get all scores with player relation
    const scores = await prisma.score.findMany({
      include: { player: true }
    });

    // Calculate standings for each member
    const standings: StandingEntry[] = members.map((member) => {
      // Find scores for this member by playerId
      const memberScores = scores.filter(score => score.playerId === member.id);

      const totalRounds = memberScores.length;
      
      // Calculate total points
      const sortedScores = [...memberScores].sort((a, b) => Number(b.total_points ?? 0) - Number(a.total_points ?? 0));
      const bestScores = sortedScores.slice(0, 5);
      
      // Sum of best 5 (or fewer) rounds
      const totalPoints = bestScores.reduce((sum: number, score) => sum + Number(score.total_points ?? 0), 0);

      // Season score multiplier based on number of rounds played
      let multiplier = 1;
      if (totalRounds < 5) {
        multiplier = [0.2, 0.4, 0.6, 0.8][totalRounds - 1] || 1;
      }

      const seasonScore = totalPoints * multiplier;

      const topScores = bestScores.map(s => Number(s.total_points ?? 0));

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

    return NextResponse.json(standings, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error fetching standings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch standings' },
      { status: 500 }
    );
  }
} 
