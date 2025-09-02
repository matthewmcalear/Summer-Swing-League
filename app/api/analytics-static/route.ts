import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the static data files
    const membersPath = path.join(process.cwd(), 'public', 'members.json');
    const scoresPath = path.join(process.cwd(), 'public', 'scores.json');
    const playerStatsPath = path.join(process.cwd(), 'public', 'player_stats.json');
    const seasonSummaryPath = path.join(process.cwd(), 'public', 'season_summary.json');

    const members = JSON.parse(fs.readFileSync(membersPath, 'utf8'));
    const scores = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));
    const playerStats = JSON.parse(fs.readFileSync(playerStatsPath, 'utf8'));
    const seasonSummary = JSON.parse(fs.readFileSync(seasonSummaryPath, 'utf8'))[0];

    // Filter out test data
    const realMembers = members.filter((m: any) => !m.is_test_data);
    const realScores = scores.filter((s: any) => {
      // Check if any real member is in the player field
      return realMembers.some((m: any) => s.player.includes(m.full_name));
    });

    // Calculate analytics from static data
    const analytics = {
      leagueOverview: {
        totalPlayers: realMembers.length,
        totalRounds: realScores.length,
        total18HoleRounds: realScores.filter((s: any) => s.holes === 18).length,
        total9HoleRounds: realScores.filter((s: any) => s.holes === 9).length,
        averageHandicap: realMembers.reduce((sum: number, m: any) => sum + parseFloat(m.handicap), 0) / realMembers.length,
        totalScoresSubmitted: realScores.length,
        activePlayers: realMembers.length,
        totalPoints: realScores.reduce((sum: number, s: any) => sum + parseFloat(s.total_points), 0),
        averagePointsPerRound: realScores.reduce((sum: number, s: any) => sum + parseFloat(s.total_points), 0) / realScores.length,
        participationRate: 100
      },
      performanceMetrics: {
        averageScore18: realScores.filter((s: any) => s.holes === 18).reduce((sum: number, s: any) => sum + s.gross, 0) / realScores.filter((s: any) => s.holes === 18).length || 0,
        averageScore9: realScores.filter((s: any) => s.holes === 9).reduce((sum: number, s: any) => sum + s.gross, 0) / realScores.filter((s: any) => s.holes === 9).length || 0,
        lowestScore18: Math.min(...realScores.filter((s: any) => s.holes === 18).map((s: any) => s.gross)) || 0,
        lowestScore9: Math.min(...realScores.filter((s: any) => s.holes === 9).map((s: any) => s.gross)) || 0,
        highestScore18: Math.max(...realScores.filter((s: any) => s.holes === 18).map((s: any) => s.gross)) || 0,
        highestScore9: Math.max(...realScores.filter((s: any) => s.holes === 9).map((s: any) => s.gross)) || 0,
        averagePoints: realScores.reduce((sum: number, s: any) => sum + parseFloat(s.total_points), 0) / realScores.length,
        mostActivePlayer: playerStats[0]?.player_name || 'N/A',
        bestImprovement: {
          player: 'N/A',
          improvement: 0,
          roundType: '18H'
        },
        consistencyLeader: {
          player: playerStats[0]?.player_name || 'N/A',
          standardDeviation: 0,
          rounds: playerStats[0]?.total_rounds || 0
        },
        courseSpecialist: {
          player: 'N/A',
          course: 'N/A',
          averageScore: 0,
          rounds: 0
        }
      },
      courseAnalytics: [],
      monthlyTrends: [],
      handicapDistribution: [],
      topPerformers: playerStats.map((p: any) => ({
        player: p.player_name,
        seasonScore: p.total_points || 0,
        totalRounds: p.total_rounds || 0,
        averageScore: 0, // Would need to calculate from scores
        averagePoints: p.avg_points || 0,
        bestRound: p.best_round || 0,
        consistency: 0
      })),
      recentActivity: realScores
        .sort((a: any, b: any) => new Date(b.play_date).getTime() - new Date(a.play_date).getTime())
        .slice(0, 10)
        .map((s: any) => ({
          date: s.play_date,
          player: s.player,
          course: s.course_name,
          score: s.gross,
          points: parseFloat(s.total_points)
        })),
      playerInsights: playerStats.map((p: any) => ({
        player: p.player_name,
        totalRounds: p.total_rounds || 0,
        averageScore: 0,
        bestScore: p.best_round || 0,
        worstScore: 0,
        averagePoints: p.avg_points || 0,
        handicap: p.handicap || 0,
        improvement: 0,
        favoriteCourse: p.courses_played || 'N/A',
        roundsThisMonth: 0
      })),
      seasonHighlights: {
        totalTournaments: 0,
        averageTournamentSize: 0,
        biggestComeback: {
          player: 'N/A',
          improvement: 0,
          roundType: '18H'
        },
        mostConsistentPlayer: {
          player: playerStats[0]?.player_name || 'N/A',
          standardDeviation: 0,
          rounds: playerStats[0]?.total_rounds || 0
        },
        courseDifficultyRanking: []
      },
      playerScoreData: playerStats.map((p: any) => ({
        player: p.player_name,
        scores: [], // Would need to extract from scores data
        totalRounds: p.total_rounds || 0,
        averageScore: 0,
        bestScore: p.best_round || 0,
        worstScore: 0,
        averagePoints: p.avg_points || 0,
        handicap: p.handicap || 0
      }))
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error loading static analytics:', error);
    return NextResponse.json({ error: 'Failed to load analytics data' }, { status: 500 });
  }
}
