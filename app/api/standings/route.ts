import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface StandingEntry {
  id: number;
  name: string;
  handicap: number;
  totalRounds: number;
  totalPoints: number;
  seasonScore: number;
  topScores: number[];
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const members = await prisma.member.findMany({
      where: { is_test: false }
    });

    const scores = await prisma.score.findMany();

    const standings: StandingEntry[] = members.map((member) => {
      const memberScores = scores.filter(score => {
        const players = score.player.split(',');
        return players[0].trim() === member.full_name;
      });

      const totalRounds = memberScores.length;
      const sortedScores = [...memberScores].sort((a, b) => Number(b.total_points ?? 0) - Number(a.total_points ?? 0));
      const bestScores = sortedScores.slice(0, 5);
      const totalPoints = bestScores.reduce((sum: number, score) => sum + Number(score.total_points ?? 0), 0);

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

    standings.sort((a, b) => b.seasonScore - a.seasonScore);

    return NextResponse.json(standings, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error fetching standings:', error);
    return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 });
  }
}
