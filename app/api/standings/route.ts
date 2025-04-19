import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface StandingEntry {
  id: number;
  name: string;
  handicap: number;
  totalRounds: number;
  totalPoints: number;
  seasonScore: number;
}

interface DBMember {
  id: number;
  full_name: string;
  handicap: number;
  email: string;
  created_at: Date;
  updated_at: Date;
  is_test: boolean;
}

interface DBScore {
  id: number;
  player: string;
  holes: number;
  gross: number;
  handicap: number;
  difficulty: number;
  group_members: number;
  total_points: number;
  play_date: Date;
  course_name: string;
  created_at: Date;
}

export async function GET() {
  try {
    // Get all non-test members
    const members = await prisma.member.findMany({
      where: {
        is_test: false
      }
    }) as DBMember[];

    // Get all scores
    const scores = await prisma.score.findMany() as DBScore[];

    // Calculate standings for each member
    const standings: StandingEntry[] = members.map((member) => {
      // Find scores where the player field starts with the member's name
      const memberScores = scores.filter(score => {
        const players = score.player.split(',');
        return players[0].trim() === member.full_name;
      });

      const totalRounds = memberScores.length;
      
      // Calculate total points
      const totalPoints = memberScores.reduce((sum: number, score) => sum + Number(score.total_points ?? 0), 0);
      
      // Calculate season score based on best 5 rounds
      const sortedScores = [...memberScores].sort((a, b) => Number(b.total_points ?? 0) - Number(a.total_points ?? 0));
      const bestScores = sortedScores.slice(0, 5);
      
      // Apply multiplier based on number of rounds
      let multiplier = 1;
      if (totalRounds < 5) {
        multiplier = [0.2, 0.4, 0.6, 0.8][totalRounds - 1] || 1;
      }
      
      const seasonScore = bestScores.reduce((sum: number, score) => sum + Number(score.total_points ?? 0), 0) * multiplier;

      return {
        id: member.id,
        name: member.full_name,
        handicap: member.handicap,
        totalRounds,
        totalPoints,
        seasonScore,
      };
    });

    // Sort by season score
    standings.sort((a, b) => b.seasonScore - a.seasonScore);

    return NextResponse.json(standings);
  } catch (error) {
    console.error('Error fetching standings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch standings' },
      { status: 500 }
    );
  }
} 