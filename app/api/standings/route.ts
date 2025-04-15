import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get all players with their scores
    const players = await prisma.player.findMany({
      include: {
        scores: {
          include: {
            round: true,
          },
        },
      },
    });

    // Calculate standings for each player
    const standings = players.map(player => {
      const scores = player.scores;
      const totalRounds = scores.length;
      
      // Calculate total points
      const totalPoints = scores.reduce((sum, score) => sum + score.totalPoints, 0);
      
      // Calculate season score based on best 5 rounds
      const sortedScores = [...scores].sort((a, b) => b.totalPoints - a.totalPoints);
      const bestScores = sortedScores.slice(0, 5);
      
      // Apply multiplier based on number of rounds
      let multiplier = 1;
      if (totalRounds < 5) {
        multiplier = [0.2, 0.4, 0.6, 0.8][totalRounds - 1] || 1;
      }
      
      const seasonScore = bestScores.reduce((sum, score) => sum + score.totalPoints, 0) * multiplier;

      return {
        id: player.id,
        name: player.name,
        handicap: player.handicap,
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