import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface AnalyticsData {
  leagueOverview: {
    totalPlayers: number;
    totalRounds: number;
    averageHandicap: number;
    totalScoresSubmitted: number;
    activePlayers: number; // players with scores in last 30 days
  };
  performanceMetrics: {
    averageScore: number;
    lowestScore: number;
    highestScore: number;
    averagePoints: number;
    mostActivePlayer: string;
    bestImprovement: {
      player: string;
      improvement: number;
    };
  };
  courseAnalytics: Array<{
    course: string;
    totalRounds: number;
    averageScore: number;
    difficulty: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    totalRounds: number;
    averageScore: number;
    averagePoints: number;
    uniquePlayers: number;
  }>;
  handicapDistribution: Array<{
    range: string;
    count: number;
  }>;
  topPerformers: Array<{
    player: string;
    seasonScore: number;
    totalRounds: number;
    averageScore: number;
  }>;
  recentActivity: Array<{
    date: string;
    player: string;
    course: string;
    score: number;
    points: number;
  }>;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get all members and scores
    const members = await prisma.member.findMany({
      where: { is_test: false }
    });
    
    const scores = await prisma.score.findMany({
      orderBy: { play_date: 'desc' }
    });

    const totalPlayers = members.length;
    const totalRounds = scores.length;
    const averageHandicap = members.reduce((sum, m) => sum + m.handicap, 0) / totalPlayers;

    // Active players (played in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentScores = scores.filter(s => s.play_date >= thirtyDaysAgo);
    const activePlayers = new Set(recentScores.map(s => s.player.split(',')[0].trim())).size;

    // Performance metrics
    const grossScores = scores.map(s => s.gross);
    const totalPoints = scores.map(s => s.total_points);
    const averageScore = grossScores.reduce((sum, score) => sum + score, 0) / grossScores.length;
    const lowestScore = Math.min(...grossScores);
    const highestScore = Math.max(...grossScores);
    const averagePoints = totalPoints.reduce((sum, points) => sum + points, 0) / totalPoints.length;

    // Most active player
    const playerRoundCounts = new Map();
    scores.forEach(score => {
      const player = score.player.split(',')[0].trim();
      playerRoundCounts.set(player, (playerRoundCounts.get(player) || 0) + 1);
    });
    const mostActivePlayer = Array.from(playerRoundCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Course analytics
    const courseMap = new Map();
    scores.forEach(score => {
      if (!courseMap.has(score.course_name)) {
        courseMap.set(score.course_name, {
          scores: [],
          difficulties: []
        });
      }
      courseMap.get(score.course_name).scores.push(score.gross);
      courseMap.get(score.course_name).difficulties.push(score.difficulty);
    });

    const courseAnalytics = Array.from(courseMap.entries()).map(([course, data]) => ({
      course,
      totalRounds: data.scores.length,
      averageScore: data.scores.reduce((sum: number, score: number) => sum + score, 0) / data.scores.length,
      difficulty: data.difficulties.reduce((sum: number, diff: number) => sum + diff, 0) / data.difficulties.length
    })).sort((a, b) => b.totalRounds - a.totalRounds);

    // Monthly trends
    const monthlyMap = new Map();
    scores.forEach(score => {
      const month = score.play_date.toISOString().slice(0, 7);
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, {
          scores: [],
          points: [],
          players: new Set()
        });
      }
      monthlyMap.get(month).scores.push(score.gross);
      monthlyMap.get(month).points.push(score.total_points);
      monthlyMap.get(month).players.add(score.player.split(',')[0].trim());
    });

    const monthlyTrends = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      totalRounds: data.scores.length,
      averageScore: data.scores.reduce((sum: number, score: number) => sum + score, 0) / data.scores.length,
      averagePoints: data.points.reduce((sum: number, points: number) => sum + points, 0) / data.points.length,
      uniquePlayers: data.players.size
    })).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);

    // Handicap distribution
    const handicapRanges = [
      { min: 0, max: 5, label: '0-5' },
      { min: 6, max: 10, label: '6-10' },
      { min: 11, max: 15, label: '11-15' },
      { min: 16, max: 20, label: '16-20' },
      { min: 21, max: 25, label: '21-25' },
      { min: 26, max: 100, label: '26+' }
    ];

    const handicapDistribution = handicapRanges.map(range => ({
      range: range.label,
      count: members.filter(m => m.handicap >= range.min && m.handicap <= range.max).length
    }));

    // Top performers (calculate season scores)
    const playerStats = new Map();
    members.forEach(member => {
      const memberScores = scores.filter(score => 
        score.player.split(',')[0].trim() === member.full_name
      );
      
      if (memberScores.length > 0) {
        const sortedScores = [...memberScores].sort((a, b) => b.total_points - a.total_points);
        const bestScores = sortedScores.slice(0, 5);
        
        let multiplier = 1;
        if (memberScores.length < 5) {
          multiplier = [0.2, 0.4, 0.6, 0.8][memberScores.length - 1] || 1;
        }
        
        const seasonScore = bestScores.reduce((sum, score) => sum + score.total_points, 0) * multiplier;
        const averageScore = memberScores.reduce((sum, score) => sum + score.gross, 0) / memberScores.length;
        
        playerStats.set(member.full_name, {
          seasonScore,
          totalRounds: memberScores.length,
          averageScore
        });
      }
    });

    const topPerformers = Array.from(playerStats.entries())
      .map(([player, stats]) => ({
        player,
        seasonScore: Math.round(stats.seasonScore * 10) / 10,
        totalRounds: stats.totalRounds,
        averageScore: Math.round(stats.averageScore * 10) / 10
      }))
      .sort((a, b) => b.seasonScore - a.seasonScore)
      .slice(0, 10);

    // Recent activity
    const recentActivity = scores.slice(0, 20).map(score => ({
      date: score.play_date.toISOString().split('T')[0],
      player: score.player.split(',')[0].trim(),
      course: score.course_name,
      score: score.gross,
      points: Math.round(score.total_points * 10) / 10
    }));

    // Best improvement calculation (simplified - comparing first and last 3 rounds)
    let bestImprovement = { player: 'N/A', improvement: 0 };
    
    for (const member of members) {
      const memberScores = scores
        .filter(score => score.player.split(',')[0].trim() === member.full_name)
        .sort((a, b) => new Date(a.play_date).getTime() - new Date(b.play_date).getTime());
      
      if (memberScores.length >= 6) {
        const firstThree = memberScores.slice(0, 3);
        const lastThree = memberScores.slice(-3);
        
        const firstAvg = firstThree.reduce((sum, score) => sum + score.gross, 0) / 3;
        const lastAvg = lastThree.reduce((sum, score) => sum + score.gross, 0) / 3;
        
        const improvement = firstAvg - lastAvg; // Positive means improvement (lower scores)
        
        if (improvement > bestImprovement.improvement) {
          bestImprovement = {
            player: member.full_name,
            improvement: Math.round(improvement * 10) / 10
          };
        }
      }
    }

    const analytics: AnalyticsData = {
      leagueOverview: {
        totalPlayers,
        totalRounds,
        averageHandicap: Math.round(averageHandicap * 10) / 10,
        totalScoresSubmitted: totalRounds,
        activePlayers
      },
      performanceMetrics: {
        averageScore: Math.round(averageScore * 10) / 10,
        lowestScore,
        highestScore,
        averagePoints: Math.round(averagePoints * 10) / 10,
        mostActivePlayer,
        bestImprovement
      },
      courseAnalytics: courseAnalytics.map(course => ({
        ...course,
        averageScore: Math.round(course.averageScore * 10) / 10,
        difficulty: Math.round(course.difficulty * 10) / 10
      })),
      monthlyTrends: monthlyTrends.map(trend => ({
        ...trend,
        averageScore: Math.round(trend.averageScore * 10) / 10,
        averagePoints: Math.round(trend.averagePoints * 10) / 10
      })),
      handicapDistribution,
      topPerformers,
      recentActivity
    };

    return NextResponse.json(analytics, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}