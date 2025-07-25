import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface PlayerProfile {
  id: number;
  name: string;
  email: string;
  handicap: number;
  totalRounds: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalPoints: number;
  averagePoints: number;
  seasonScore: number;
  handicapProgression: Array<{ date: string; handicap: number }>;
  recentScores: Array<{
    id: number;
    date: string;
    course: string;
    holes: number;
    gross: number;
    points: number;
    difficulty: number;
    groupMembers: string;
  }>;
  monthlyStats: Array<{
    month: string;
    rounds: number;
    averageScore: number;
    averagePoints: number;
  }>;
  courseStats: Array<{
    course: string;
    rounds: number;
    averageScore: number;
    bestScore: number;
  }>;
}

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const playerId = parseInt(params.id);
    
    if (isNaN(playerId)) {
      return NextResponse.json(
        { error: 'Invalid player ID' },
        { status: 400 }
      );
    }

    // Get player details
    const player = await prisma.member.findUnique({
      where: { id: playerId }
    });

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Get all scores for this player
    const scores = await prisma.score.findMany({
      where: {
        player: {
          startsWith: player.full_name
        }
      },
      orderBy: {
        play_date: 'desc'
      }
    });

    if (scores.length === 0) {
      return NextResponse.json({
        id: player.id,
        name: player.full_name,
        email: player.email,
        handicap: player.handicap,
        totalRounds: 0,
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        totalPoints: 0,
        averagePoints: 0,
        seasonScore: 0,
        handicapProgression: [],
        recentScores: [],
        monthlyStats: [],
        courseStats: []
      });
    }

    // Calculate basic stats
    const totalRounds = scores.length;
    const grossScores = scores.map(s => s.gross);
    const totalPoints = scores.reduce((sum, score) => sum + score.total_points, 0);
    const averageScore = grossScores.reduce((sum, score) => sum + score, 0) / totalRounds;
    const averagePoints = totalPoints / totalRounds;
    const bestScore = Math.min(...grossScores);
    const worstScore = Math.max(...grossScores);

    // Calculate season score (best 5 rounds)
    const sortedScores = [...scores].sort((a, b) => b.total_points - a.total_points);
    const bestScores = sortedScores.slice(0, 5);
    let multiplier = 1;
    if (totalRounds < 5) {
      multiplier = [0.2, 0.4, 0.6, 0.8][totalRounds - 1] || 1;
    }
    const seasonScore = bestScores.reduce((sum, score) => sum + score.total_points, 0) * multiplier;

    // Format recent scores
    const recentScores = scores.slice(0, 10).map(score => ({
      id: score.id,
      date: score.play_date.toISOString().split('T')[0],
      course: score.course_name,
      holes: score.holes,
      gross: score.gross,
      points: score.total_points,
      difficulty: score.difficulty,
      groupMembers: score.group_members
    }));

    // Calculate monthly stats
    const monthlyMap = new Map();
    scores.forEach(score => {
      const month = score.play_date.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { scores: [], points: [] });
      }
      monthlyMap.get(month).scores.push(score.gross);
      monthlyMap.get(month).points.push(score.total_points);
    });

    const monthlyStats = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      rounds: data.scores.length,
      averageScore: data.scores.reduce((sum: number, score: number) => sum + score, 0) / data.scores.length,
      averagePoints: data.points.reduce((sum: number, points: number) => sum + points, 0) / data.points.length
    })).sort((a, b) => b.month.localeCompare(a.month));

    // Calculate course stats
    const courseMap = new Map();
    scores.forEach(score => {
      if (!courseMap.has(score.course_name)) {
        courseMap.set(score.course_name, []);
      }
      courseMap.get(score.course_name).push(score.gross);
    });

    const courseStats = Array.from(courseMap.entries()).map(([course, scores]) => ({
      course,
      rounds: scores.length,
      averageScore: scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length,
      bestScore: Math.min(...scores)
    })).sort((a, b) => b.rounds - a.rounds);

    // Handicap progression (simplified - using current handicap for now)
    const handicapProgression = [
      {
        date: new Date().toISOString().split('T')[0],
        handicap: player.handicap
      }
    ];

    const profile: PlayerProfile = {
      id: player.id,
      name: player.full_name,
      email: player.email,
      handicap: player.handicap,
      totalRounds,
      averageScore: Math.round(averageScore * 10) / 10,
      bestScore,
      worstScore,
      totalPoints: Math.round(totalPoints * 10) / 10,
      averagePoints: Math.round(averagePoints * 10) / 10,
      seasonScore: Math.round(seasonScore * 10) / 10,
      handicapProgression,
      recentScores,
      monthlyStats,
      courseStats
    };

    return NextResponse.json(profile, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error fetching player profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player profile' },
      { status: 500 }
    );
  }
}