import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface AnalyticsData {
  leagueOverview: {
    totalPlayers: number;
    totalRounds: number;
    total18HoleRounds: number;
    total9HoleRounds: number;
    averageHandicap: number;
    totalScoresSubmitted: number;
    activePlayers: number; // players with scores in last 30 days
    totalPoints: number;
    averagePointsPerRound: number;
    participationRate: number; // percentage of members who have played
  };
  performanceMetrics: {
    averageScore18: number;
    averageScore9: number;
    lowestScore18: number;
    lowestScore9: number;
    highestScore18: number;
    highestScore9: number;
    averagePoints: number;
    mostActivePlayer: string;
    bestImprovement: {
      player: string;
      improvement: number;
      roundType: string;
    };
    consistencyLeader: {
      player: string;
      standardDeviation: number;
      rounds: number;
    };
    courseSpecialist: {
      player: string;
      course: string;
      averageScore: number;
      rounds: number;
    };
  };
  courseAnalytics: Array<{
    course: string;
    totalRounds: number;
    total18HoleRounds: number;
    total9HoleRounds: number;
    averageScore18: number;
    averageScore9: number;
    difficulty: number;
    averagePoints: number;
    mostFrequentPlayer: string;
    bestScore: number;
    bestPlayer: string;
  }>;
  monthlyTrends: Array<{
    month: string;
    totalRounds: number;
    total18HoleRounds: number;
    total9HoleRounds: number;
    averageScore18: number;
    averageScore9: number;
    averagePoints: number;
    uniquePlayers: number;
  }>;
  handicapDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  topPerformers: Array<{
    player: string;
    seasonScore: number;
    totalRounds: number;
    averageScore: number;
    averagePoints: number;
    bestRound: number;
    consistency: number; // standard deviation of scores
  }>;
  recentActivity: Array<{
    date: string;
    player: string;
    course: string;
    score: number;
    points: number;
  }>;
  playerInsights: Array<{
    player: string;
    totalRounds: number;
    averageScore: number;
    bestScore: number;
    worstScore: number;
    averagePoints: number;
    handicap: number;
    improvement: number;
    favoriteCourse: string;
    roundsThisMonth: number;
  }>;
  seasonHighlights: {
    totalTournaments: number;
    averageTournamentSize: number;
    biggestComeback: {
      player: string;
      improvement: number;
      roundType: string;
    };
    mostConsistentPlayer: {
      player: string;
      standardDeviation: number;
      rounds: number;
    };
    courseDifficultyRanking: Array<{
      course: string;
      averageScore: number;
      difficulty: number;
      rounds: number;
    }>;
  };
  playerScoreData: Array<{
    player: string;
    scores: Array<{
      date: string;
      gross: number;
      net: number;
      points: number;
      course: string;
      holes: number;
      handicap: number;
    }>;
    totalRounds: number;
    averageScore: number;
    bestScore: number;
    worstScore: number;
    averagePoints: number;
    handicap: number;
  }>;
}

export const dynamic = 'force-dynamic';

// Course name normalization function
function normalizeCourseName(courseName: string): string {
  const normalized = courseName.toLowerCase().trim();
  
  // Handle specific course variations from the dataset
  const courseMappings: { [key: string]: string } = {
    // St. Lambert variations
    'st. lambert': 'St. Lambert',
    'st lambert': 'St. Lambert',
    'saint lambert': 'St. Lambert',
    'st-lambert': 'St. Lambert',
    'saint-lambert': 'St. Lambert',
    'st lambert golf': 'St. Lambert',
    'st. lambert golf': 'St. Lambert',
    'saint lambert golf': 'St. Lambert',
    'golf st lambert': 'St. Lambert',
    'stlambert blue': 'St. Lambert',
    'st lambert [blue]': 'St. Lambert',
    'country club st lambert': 'St. Lambert',
    
    // Oasis variations
    'oasis': 'Oasis',
    'oasis front': 'Oasis',
    'oasis back': 'Oasis',
    'oasis front 9': 'Oasis',
    'oasis back 9': 'Oasis',
    'oasis white': 'Oasis',
    
    // Golf des Îles de Boucherville variations
    'golf des iles back 9': 'Golf des Îles de Boucherville',
    'golf des iles front 9': 'Golf des Îles de Boucherville',
    'golf des iles': 'Golf des Îles de Boucherville',
    'golf des isles': 'Golf des Îles de Boucherville',
    'golf des îles': 'Golf des Îles de Boucherville',
    'golf des isles de boucherville': 'Golf des Îles de Boucherville',
    'golf des iles de boucherville': 'Golf des Îles de Boucherville',
    'golf des îles de boucherville': 'Golf des Îles de Boucherville',
    'boucherville': 'Golf des Îles de Boucherville',
    'ile boucherville': 'Golf des Îles de Boucherville',
    'îles boucherville': 'Golf des Îles de Boucherville',
    'des iles': 'Golf des Îles de Boucherville',
    'des îles': 'Golf des Îles de Boucherville',
    
    // Caughnawaga variations
    'caughnawaga': 'Caughnawaga',
    'caughawagha': 'Caughnawaga',
    
    // Parcours du cerf
    'parcours du cerf': 'Parcours du Cerf',
    
    // Anjou variations
    'anjou': 'Anjou',
    'golf metropolitan d\'anjou': 'Anjou',
    'golf métropolitain d\'anjou': 'Anjou',
    
    // Dorval
    'dorval': 'Dorval',
    
    // Country Club Montreal variations
    'country club of montreal': 'Country Club Montreal',
    'country club montreal': 'Country Club Montreal',
    'country club montréal': 'Country Club Montreal',
    
    // Golf des Îles de Boucherville
    
    // Club de Golf Ste-Rose variations
    'club de golf ste-rose': 'Club de Golf Ste-Rose',
    'club de golf ste. rose': 'Club de Golf Ste-Rose',
    
    // Hemmingford
    'hemmingford (village)': 'Hemmingford',
    
    // Mystic Pines variations
    'mystic pines': 'Mystic Pines',
    'mystic pine': 'Mystic Pines',
    'mystic pines golf and country club': 'Mystic Pines',
    
    // Prescott variations
    'prescott golf club': 'Prescott',
    'prescott golf course': 'Prescott',
    'prescott': 'Prescott',
    
    // Club de l'île de Montréal (same as Club de Golf Metropolitan)
    'club de l\'île de montréal - l\'ile': 'Club de l\'île de Montréal',
    'club de golf metropolitan': 'Club de l\'île de Montréal',
    
    // Unicorn variations
    'unicorn golf course': 'Unicorn Golf',
    'unicorn golf': 'Unicorn Golf',
    
    // Amberwood
    'amberwood golf': 'Amberwood Golf',
    
    // Vercheres Madeline variations
    'verchers madeline back 9': 'Vercheres Madeline',
    'vercheres - madeleine': 'Vercheres Madeline',
    'verchere madeline': 'Vercheres Madeline',
    'vercheres madeline': 'Vercheres Madeline',
    'vercheres madeline\'s': 'Vercheres Madeline',
    
    // Montreal Municipal variations
    'montréal municipal': 'Montreal Municipal',
    'montreal municipal par 3 ( score x 1.33)': 'Montreal Municipal',
    'montréal municipale': 'Montreal Municipal',
    
    // Rivière Rouge variations
    'rivier rouge': 'Rivière Rouge',
    'rivière rouge': 'Rivière Rouge',
    'club de golf rivière rouge': 'Rivière Rouge',
    'river rouge': 'Rivière Rouge',
    'riviere rouge': 'Rivière Rouge',
    
    // Club de Golf Rive-Sud
    'club de golf rive-sud': 'Club de Golf Rive-Sud',
    'rive sud': 'Club de Golf Rive-Sud',
  };
  
  // Check for exact matches first
  if (courseMappings[normalized]) {
    return courseMappings[normalized];
  }
  
  // Apply common transformations
  let processed = normalized;
  
  // Remove common prefixes/suffixes
  for (const [pattern, replacement] of Object.entries(courseMappings)) {
    if (pattern.endsWith(' ') && processed.startsWith(pattern)) {
      processed = processed.replace(pattern, replacement);
    }
    if (pattern.startsWith(' ') && processed.endsWith(pattern)) {
      processed = processed.replace(pattern, replacement);
    }
  }
  
  // Check for partial matches (contains)
  for (const [pattern, standardName] of Object.entries(courseMappings)) {
    if (processed.includes(pattern) || pattern.includes(processed)) {
      return standardName;
    }
  }
  
  // Handle common naming patterns
  if (processed.includes('st.') || processed.includes('saint')) {
    processed = processed.replace(/saint/g, 'St.').replace(/st\./g, 'St.');
  }
  
  // If no match found, return original with proper capitalization
  return courseName.charAt(0).toUpperCase() + courseName.slice(1).toLowerCase();
}

export async function GET() {
  try {
    // Get all members and scores
    const members = await prisma.member.findMany({
      where: { is_test: false }
    });
    
    const scores = await prisma.score.findMany({
      orderBy: { play_date: 'desc' },
      include: { player: true }
    });

    const totalPlayers = members.length;
    const totalRounds = scores.length;
    const averageHandicap = members.reduce((sum, m) => sum + m.handicap, 0) / totalPlayers;
    
    // Calculate total points and participation metrics
    const totalPoints = scores.reduce((sum, s) => sum + s.total_points, 0);
    const averagePointsPerRound = totalRounds > 0 ? totalPoints / totalRounds : 0;
    const playersWhoHavePlayed = new Set(scores.map(s => s.player.full_name)).size;
    const participationRate = totalPlayers > 0 ? (playersWhoHavePlayed / totalPlayers) * 100 : 0;

    // Separate 18-hole and 9-hole rounds
    const scores18 = scores.filter(s => s.holes === 18);
    const scores9 = scores.filter(s => s.holes === 9);
    const total18HoleRounds = scores18.length;
    const total9HoleRounds = scores9.length;

    // Active players (played in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentScores = scores.filter(s => s.play_date >= thirtyDaysAgo);
    const activePlayers = new Set(recentScores.map(s => s.player.full_name)).size;

    // Performance metrics separated by hole count
    const grossScores18 = scores18.map(s => s.gross);
    const grossScores9 = scores9.map(s => s.gross);
    const scorePoints = scores.map(s => s.total_points);
    
    const averageScore18 = grossScores18.length > 0 ? grossScores18.reduce((sum, score) => sum + score, 0) / grossScores18.length : 0;
    const averageScore9 = grossScores9.length > 0 ? grossScores9.reduce((sum, score) => sum + score, 0) / grossScores9.length : 0;
    const lowestScore18 = grossScores18.length > 0 ? Math.min(...grossScores18) : 0;
    const lowestScore9 = grossScores9.length > 0 ? Math.min(...grossScores9) : 0;
    const highestScore18 = grossScores18.length > 0 ? Math.max(...grossScores18) : 0;
    const highestScore9 = grossScores9.length > 0 ? Math.max(...grossScores9) : 0;
    const averagePoints = scorePoints.reduce((sum, points) => sum + points, 0) / scorePoints.length;

    // Most active player
    const playerRoundCounts = new Map();
    scores.forEach(score => {
      const player = score.player.full_name;
      playerRoundCounts.set(player, (playerRoundCounts.get(player) || 0) + 1);
    });
    const mostActivePlayer = Array.from(playerRoundCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Course analytics separated by hole count
    const courseMap = new Map();
    scores.forEach(score => {
      const normalizedCourseName = normalizeCourseName(score.course_name);
      if (!courseMap.has(normalizedCourseName)) {
        courseMap.set(normalizedCourseName, {
          scores18: [],
          scores9: [],
          difficulties: []
        });
      }
      if (score.holes === 18) {
        courseMap.get(normalizedCourseName).scores18.push(score.gross);
      } else if (score.holes === 9) {
        courseMap.get(normalizedCourseName).scores9.push(score.gross);
      }
      courseMap.get(normalizedCourseName).difficulties.push(score.difficulty);
    });

    const courseAnalytics = Array.from(courseMap.entries()).map(([course, data]) => ({
      course,
      totalRounds: data.scores18.length + data.scores9.length,
      total18HoleRounds: data.scores18.length,
      total9HoleRounds: data.scores9.length,
      averageScore18: data.scores18.length > 0 ? data.scores18.reduce((sum: number, score: number) => sum + score, 0) / data.scores18.length : 0,
      averageScore9: data.scores9.length > 0 ? data.scores9.reduce((sum: number, score: number) => sum + score, 0) / data.scores9.length : 0,
      difficulty: data.difficulties.reduce((sum: number, diff: number) => sum + diff, 0) / data.difficulties.length
    })).sort((a, b) => b.totalRounds - a.totalRounds);

    // Monthly trends separated by hole count
    const monthlyMap = new Map();
    scores.forEach(score => {
      const month = score.play_date.toISOString().slice(0, 7);
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, {
          scores18: [],
          scores9: [],
          points: [],
          players: new Set()
        });
      }
      if (score.holes === 18) {
        monthlyMap.get(month).scores18.push(score.gross);
      } else if (score.holes === 9) {
        monthlyMap.get(month).scores9.push(score.gross);
      }
      monthlyMap.get(month).points.push(score.total_points);
      monthlyMap.get(month).players.add(score.player.full_name);
    });

    const monthlyTrends = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      totalRounds: data.scores18.length + data.scores9.length,
      total18HoleRounds: data.scores18.length,
      total9HoleRounds: data.scores9.length,
      averageScore18: data.scores18.length > 0 ? data.scores18.reduce((sum: number, score: number) => sum + score, 0) / data.scores18.length : 0,
      averageScore9: data.scores9.length > 0 ? data.scores9.reduce((sum: number, score: number) => sum + score, 0) / data.scores9.length : 0,
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
        score.player.full_name === member.full_name
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
      date: new Date(score.play_date).toLocaleDateString('en-CA'), // YYYY-MM-DD format without timezone issues
      player: score.player.full_name,
      course: normalizeCourseName(score.course_name),
      score: score.gross,
      points: Math.round(score.total_points * 10) / 10
    }));

    // Best improvement calculation using linear trend analysis - separated by round type
    let bestImprovement18 = { player: 'N/A', improvement: 0, roundType: '18-hole' };
    let bestImprovement9 = { player: 'N/A', improvement: 0, roundType: '9-hole' };
    
    for (const member of members) {
      // Separate scores by round type
      const memberScores18 = scores
        .filter(score => score.player.full_name === member.full_name && score.holes === 18)
        .sort((a, b) => new Date(a.play_date).getTime() - new Date(b.play_date).getTime());
      
      const memberScores9 = scores
        .filter(score => score.player.full_name === member.full_name && score.holes === 9)
        .sort((a, b) => new Date(a.play_date).getTime() - new Date(b.play_date).getTime());
      
      // Calculate 18-hole improvement
      if (memberScores18.length >= 3) { // Need at least 3 rounds for meaningful trend
        const n = memberScores18.length;
        const xValues = Array.from({length: n}, (_, i) => i + 1);
        const yValues = memberScores18.map(score => score.gross);
        
        const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
        const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;
        
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < n; i++) {
          numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
          denominator += (xValues[i] - xMean) * (xValues[i] - xMean);
        }
        
        const slope = denominator !== 0 ? numerator / denominator : 0;
        const totalImprovement = -slope * n; // Convert to positive for improvement
        
        if (totalImprovement > bestImprovement18.improvement) {
          bestImprovement18 = {
            player: member.full_name,
            improvement: Math.round(totalImprovement * 10) / 10,
            roundType: '18-hole'
          };
        }
      }
      
      // Calculate 9-hole improvement
      if (memberScores9.length >= 3) { // Need at least 3 rounds for meaningful trend
        const n = memberScores9.length;
        const xValues = Array.from({length: n}, (_, i) => i + 1);
        const yValues = memberScores9.map(score => score.gross);
        
        const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
        const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;
        
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < n; i++) {
          numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
          denominator += (xValues[i] - xMean) * (xValues[i] - xMean);
        }
        
        const slope = denominator !== 0 ? numerator / denominator : 0;
        const totalImprovement = -slope * n; // Convert to positive for improvement
        
        if (totalImprovement > bestImprovement9.improvement) {
          bestImprovement9 = {
            player: member.full_name,
            improvement: Math.round(totalImprovement * 10) / 10,
            roundType: '9-hole'
          };
        }
      }
    }
    
    // Choose the best improvement overall (prioritize 18-hole if similar)
    let bestImprovement = bestImprovement18.improvement > bestImprovement9.improvement ? 
      bestImprovement18 : bestImprovement9;

    // Calculate consistency leader (lowest standard deviation)
    let consistencyLeader = { player: 'N/A', standardDeviation: Infinity, rounds: 0 };
    for (const member of members) {
      const memberScores = scores.filter(score => 
        score.player.full_name === member.full_name
      );
      
      if (memberScores.length >= 3) {
        const scores = memberScores.map(s => s.gross);
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev < consistencyLeader.standardDeviation) {
          consistencyLeader = {
            player: member.full_name,
            standardDeviation: Math.round(stdDev * 10) / 10,
            rounds: memberScores.length
          };
        }
      }
    }

    // Calculate course specialist (best average score on a specific course with minimum rounds)
    let courseSpecialist = { player: 'N/A', course: 'N/A', averageScore: Infinity, rounds: 0 };
    for (const member of members) {
      const memberScores = scores.filter(score => 
        score.player.full_name === member.full_name
      );
      
      // Group by course
      const courseScores = new Map();
      memberScores.forEach(score => {
        const course = normalizeCourseName(score.course_name);
        if (!courseScores.has(course)) {
          courseScores.set(course, []);
        }
        courseScores.get(course).push(score.gross);
      });
      
      // Find best course average
      courseScores.forEach((scores, course) => {
        if (scores.length >= 2) { // Minimum 2 rounds on a course
          const avg = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
          if (avg < courseSpecialist.averageScore) {
            courseSpecialist = {
              player: member.full_name,
              course,
              averageScore: Math.round(avg * 10) / 10,
              rounds: scores.length
            };
          }
        }
      });
    }

    const analytics: AnalyticsData = {
      leagueOverview: {
        totalPlayers,
        totalRounds,
        total18HoleRounds,
        total9HoleRounds,
        averageHandicap: Math.round(averageHandicap * 10) / 10,
        totalScoresSubmitted: totalRounds,
        activePlayers,
        totalPoints: Math.round(totalPoints * 10) / 10,
        averagePointsPerRound: Math.round(averagePointsPerRound * 10) / 10,
        participationRate: Math.round(participationRate * 10) / 10
      },
      performanceMetrics: {
        averageScore18: Math.round(averageScore18 * 10) / 10,
        averageScore9: Math.round(averageScore9 * 10) / 10,
        lowestScore18,
        lowestScore9,
        highestScore18,
        highestScore9,
        averagePoints: Math.round(averagePoints * 10) / 10,
        mostActivePlayer,
        bestImprovement,
        consistencyLeader,
        courseSpecialist
      },
      courseAnalytics: courseAnalytics.map(course => ({
        ...course,
        averageScore18: Math.round(course.averageScore18 * 10) / 10,
        averageScore9: Math.round(course.averageScore9 * 10) / 10,
        difficulty: Math.round(course.difficulty * 10) / 10,
        averagePoints: 0, // Placeholder - will calculate this
        mostFrequentPlayer: 'N/A', // Placeholder - will calculate this
        bestScore: 0, // Placeholder - will calculate this
        bestPlayer: 'N/A' // Placeholder - will calculate this
      })),
      monthlyTrends: monthlyTrends.map(trend => ({
        ...trend,
        averageScore18: Math.round(trend.averageScore18 * 10) / 10,
        averageScore9: Math.round(trend.averageScore9 * 10) / 10,
        averagePoints: Math.round(trend.averagePoints * 10) / 10
      })),
      handicapDistribution: handicapDistribution.map(range => ({
        ...range,
        percentage: Math.round((range.count / totalPlayers) * 100 * 10) / 10
      })),
      topPerformers: topPerformers.map(player => ({
        ...player,
        averagePoints: 0, // Placeholder - will calculate this
        bestRound: 0, // Placeholder - will calculate this
        consistency: 0 // Placeholder - will calculate this
      })),
      recentActivity,
      playerInsights: [], // Placeholder - will implement later
      seasonHighlights: {
        totalTournaments: 0, // Placeholder - will implement later
        averageTournamentSize: 0, // Placeholder - will implement later
        biggestComeback: { player: 'N/A', improvement: 0, roundType: 'N/A' }, // Placeholder
        mostConsistentPlayer: { player: 'N/A', standardDeviation: 0, rounds: 0 }, // Placeholder
        courseDifficultyRanking: [] // Placeholder - will implement later
      },
      playerScoreData: members.map(member => {
        const memberScores = scores.filter(score => 
          score.player.full_name === member.full_name
        ).sort((a, b) => new Date(a.play_date).getTime() - new Date(b.play_date).getTime());
        
        const totalRounds = memberScores.length;
        const averageScore = totalRounds > 0 ? 
          Math.round(memberScores.reduce((sum, s) => sum + s.gross, 0) / totalRounds * 10) / 10 : 0;
        const bestScore = totalRounds > 0 ? Math.min(...memberScores.map(s => s.gross)) : 0;
        const worstScore = totalRounds > 0 ? Math.max(...memberScores.map(s => s.gross)) : 0;
        const averagePoints = totalRounds > 0 ? 
          Math.round(memberScores.reduce((sum, s) => sum + s.total_points, 0) / totalRounds * 10) / 10 : 0;
        
        return {
          player: member.full_name,
          scores: memberScores.map(score => ({
            date: new Date(score.play_date).toLocaleDateString('en-CA'),
            gross: score.gross,
            net: score.holes === 9 ? score.gross - score.handicap / 2 : score.gross - score.handicap,
            points: Math.round(score.total_points * 10) / 10,
            course: normalizeCourseName(score.course_name),
            holes: score.holes,
            handicap: score.handicap
          })),
          totalRounds,
          averageScore,
          bestScore,
          worstScore,
          averagePoints,
          handicap: member.handicap || 0
        };
      })
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