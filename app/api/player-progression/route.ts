import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface PlayerScore {
  id: string;
  play_date: string;
  player: string;
  course_name: string;
  gross: number;
  net: number;
  points: number;
  handicap: number;
}

interface PlayerProgressionData {
  player: string;
  scores: Array<{
    date: string;
    course: string;
    gross: number;
    net: number;
    points: number;
    handicap: number;
    roundType: '9-hole' | '18-hole';
  }>;
  averageScore: number;
  totalRounds: number;
  improvement: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const players = searchParams.get('players')?.split(',') || [];
    const timePeriod = searchParams.get('timePeriod') || '6'; // months
    const courseFilter = searchParams.get('course') || '';
    const roundType = searchParams.get('roundType') || 'all'; // '9-hole', '18-hole', or 'all'

    console.log('API: Received players parameter:', players);
    console.log('API: Time period:', timePeriod);
    console.log('API: Course filter:', courseFilter);
    console.log('API: Round type:', roundType);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(timePeriod));

    console.log('API: Date range:', { startDate, endDate });

    // Build where clause
    const whereClause: any = {
      play_date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (players.length > 0) {
      whereClause.player = {
        in: players,
      };
      console.log('API: Added player filter:', whereClause.player);
    }

    if (courseFilter) {
      whereClause.course_name = {
        contains: courseFilter,
        mode: 'insensitive',
      };
    }

    // Fetch scores
    const scores = await prisma.score.findMany({
      where: whereClause,
      orderBy: {
        play_date: 'asc',
      },
    });

    console.log('API: Found scores count:', scores.length);
    if (scores.length > 0) {
      console.log('API: Sample score player field:', scores[0].player);
    }

    // Group scores by player
    const playerData: { [key: string]: PlayerProgressionData } = {};

    scores.forEach((score) => {
      const playerName = score.player.split(',')[0].trim();
      
      // Determine round type based on course name or other logic
      const detectedRoundType = score.course_name.toLowerCase().includes('front 9') || 
                       score.course_name.toLowerCase().includes('back 9') ||
                       score.course_name.toLowerCase().includes('9') ? '9-hole' : '18-hole';

      // Filter by round type if specified
      if (roundType !== 'all' && roundType !== detectedRoundType) {
        return;
      }

      if (!playerData[playerName]) {
        playerData[playerName] = {
          player: playerName,
          scores: [],
          averageScore: 0,
          totalRounds: 0,
          improvement: 0,
        };
      }

      // Calculate net score (gross - handicap)
      const netScore = score.gross - score.handicap;
      
      playerData[playerName].scores.push({
        date: score.play_date.toISOString().split('T')[0],
        course: score.course_name,
        gross: score.gross,
        net: netScore,
        points: score.total_points + score.additional_points,
        handicap: score.handicap,
        roundType: detectedRoundType as '9-hole' | '18-hole',
      });
    });

    // Calculate averages and improvements for each player
    Object.values(playerData).forEach((player) => {
      player.totalRounds = player.scores.length;
      
      if (player.scores.length > 0) {
        const totalScore = player.scores.reduce((sum, score) => sum + score.gross, 0);
        player.averageScore = totalScore / player.scores.length;

        // Calculate improvement using linear regression
        if (player.scores.length >= 3) {
          const n = player.scores.length;
          const xValues = Array.from({length: n}, (_, i) => i + 1);
          const yValues = player.scores.map(score => score.gross);

          const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
          const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;

          let numerator = 0;
          let denominator = 0;

          for (let i = 0; i < n; i++) {
            numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
            denominator += (xValues[i] - xMean) * (xValues[i] - xMean);
          }

          const slope = denominator !== 0 ? numerator / denominator : 0;
          player.improvement = -slope * n; // Convert to positive for improvement
        }
      }
    });

    // Get unique courses for filter options
    const uniqueCourses = Array.from(new Set(scores.map((score: any) => score.course_name))).sort();

    // Debug: Show what player names are actually in the database
    const uniquePlayerNames = Array.from(new Set(scores.map((score: any) => score.player))).sort();
    console.log('API: Unique player names in database:', uniquePlayerNames);

    return NextResponse.json({
      players: Object.values(playerData),
      courses: uniqueCourses,
      timePeriod: parseInt(timePeriod),
      totalScores: scores.length,
    });

  } catch (error) {
    console.error('Error fetching player progression data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player progression data' },
      { status: 500 }
    );
  }
} 