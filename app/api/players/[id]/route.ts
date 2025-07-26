import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface PlayerProfile {
  id: number;
  name: string;
  email: string;
  handicap: number;
  totalRounds: number;
  total18HoleRounds: number;
  total9HoleRounds: number;
  averageScore18: number;
  averageScore9: number;
  bestScore18: number;
  bestScore9: number;
  worstScore18: number;
  worstScore9: number;
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
    rounds18: number;
    rounds9: number;
    averageScore18: number;
    averageScore9: number;
    averagePoints: number;
  }>;
  courseStats: Array<{
    course: string;
    rounds: number;
    rounds18: number;
    rounds9: number;
    averageScore18: number;
    averageScore9: number;
    bestScore18: number;
    bestScore9: number;
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
        total18HoleRounds: 0,
        total9HoleRounds: 0,
        averageScore18: 0,
        averageScore9: 0,
        bestScore18: 0,
        bestScore9: 0,
        worstScore18: 0,
        worstScore9: 0,
        totalPoints: 0,
        averagePoints: 0,
        seasonScore: 0,
        handicapProgression: [],
        recentScores: [],
        monthlyStats: [],
        courseStats: []
      });
    }

    // Separate scores by hole count
    const scores18 = scores.filter(s => s.holes === 18);
    const scores9 = scores.filter(s => s.holes === 9);
    const total18HoleRounds = scores18.length;
    const total9HoleRounds = scores9.length;

    // Calculate basic stats separated by hole count
    const totalRounds = scores.length;
    const grossScores18 = scores18.map(s => s.gross);
    const grossScores9 = scores9.map(s => s.gross);
    const totalPoints = scores.reduce((sum, score) => sum + score.total_points, 0);
    
    const averageScore18 = grossScores18.length > 0 ? grossScores18.reduce((sum, score) => sum + score, 0) / grossScores18.length : 0;
    const averageScore9 = grossScores9.length > 0 ? grossScores9.reduce((sum, score) => sum + score, 0) / grossScores9.length : 0;
    const averagePoints = totalPoints / totalRounds;
    const bestScore18 = grossScores18.length > 0 ? Math.min(...grossScores18) : 0;
    const bestScore9 = grossScores9.length > 0 ? Math.min(...grossScores9) : 0;
    const worstScore18 = grossScores18.length > 0 ? Math.max(...grossScores18) : 0;
    const worstScore9 = grossScores9.length > 0 ? Math.max(...grossScores9) : 0;

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

    // Calculate monthly stats separated by hole count
    const monthlyMap = new Map();
    scores.forEach(score => {
      const month = score.play_date.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { scores18: [], scores9: [], points: [] });
      }
      if (score.holes === 18) {
        monthlyMap.get(month).scores18.push(score.gross);
      } else if (score.holes === 9) {
        monthlyMap.get(month).scores9.push(score.gross);
      }
      monthlyMap.get(month).points.push(score.total_points);
    });

    const monthlyStats = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      rounds: data.scores18.length + data.scores9.length,
      rounds18: data.scores18.length,
      rounds9: data.scores9.length,
      averageScore18: data.scores18.length > 0 ? data.scores18.reduce((sum: number, score: number) => sum + score, 0) / data.scores18.length : 0,
      averageScore9: data.scores9.length > 0 ? data.scores9.reduce((sum: number, score: number) => sum + score, 0) / data.scores9.length : 0,
      averagePoints: data.points.reduce((sum: number, points: number) => sum + points, 0) / data.points.length
    })).sort((a, b) => b.month.localeCompare(a.month));

    // Calculate course stats separated by hole count
    const courseMap = new Map();
    scores.forEach(score => {
      if (!courseMap.has(score.course_name)) {
        courseMap.set(score.course_name, { scores18: [], scores9: [] });
      }
      if (score.holes === 18) {
        courseMap.get(score.course_name).scores18.push(score.gross);
      } else if (score.holes === 9) {
        courseMap.get(score.course_name).scores9.push(score.gross);
      }
    });

    const courseStats = Array.from(courseMap.entries()).map(([course, data]) => ({
      course,
      rounds: data.scores18.length + data.scores9.length,
      rounds18: data.scores18.length,
      rounds9: data.scores9.length,
      averageScore18: data.scores18.length > 0 ? data.scores18.reduce((sum: number, score: number) => sum + score, 0) / data.scores18.length : 0,
      averageScore9: data.scores9.length > 0 ? data.scores9.reduce((sum: number, score: number) => sum + score, 0) / data.scores9.length : 0,
      bestScore18: data.scores18.length > 0 ? Math.min(...data.scores18) : 0,
      bestScore9: data.scores9.length > 0 ? Math.min(...data.scores9) : 0
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
      total18HoleRounds,
      total9HoleRounds,
      averageScore18: Math.round(averageScore18 * 10) / 10,
      averageScore9: Math.round(averageScore9 * 10) / 10,
      bestScore18,
      bestScore9,
      worstScore18,
      worstScore9,
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