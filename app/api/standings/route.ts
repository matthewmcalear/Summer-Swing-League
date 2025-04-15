import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Member = {
  id: number;
  full_name: string;
  handicap: number;
  email: string;
  created_at: Date;
  updated_at: Date;
  is_test: boolean;
};

type Score = {
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
};

interface MemberWithScores extends Member {
  Score: Score[];
}

interface StandingEntry {
  id: number;
  name: string;
  handicap: number;
  totalRounds: number;
  totalPoints: number;
  seasonScore: number;
}

export async function GET() {
  try {
    // Get all members with their scores
    const members = await prisma.member.findMany({
      where: {
        is_test: false
      },
      include: {
        Score: true
      }
    }) as MemberWithScores[];

    // Calculate standings for each member
    const standings: StandingEntry[] = members.map((member: MemberWithScores) => {
      const scores = member.Score || [];
      const totalRounds = scores.length;
      
      // Calculate total points
      const totalPoints = scores.reduce((sum: number, score: Score) => sum + score.total_points, 0);
      
      // Calculate season score based on best 5 rounds
      const sortedScores = [...scores].sort((a: Score, b: Score) => b.total_points - a.total_points);
      const bestScores = sortedScores.slice(0, 5);
      
      // Apply multiplier based on number of rounds
      let multiplier = 1;
      if (totalRounds < 5) {
        multiplier = [0.2, 0.4, 0.6, 0.8][totalRounds - 1] || 1;
      }
      
      const seasonScore = bestScores.reduce((sum: number, score: Score) => sum + score.total_points, 0) * multiplier;

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
    standings.sort((a: StandingEntry, b: StandingEntry) => b.seasonScore - a.seasonScore);

    return NextResponse.json(standings);
  } catch (error) {
    console.error('Error fetching standings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch standings' },
      { status: 500 }
    );
  }
} 