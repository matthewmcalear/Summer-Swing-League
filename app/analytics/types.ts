export interface RoundScore {
  date: string; totalPoints: number; gross: number; handicap: number
  holes: number; course: string; difficulty: string
  groupBonus: number; basePoints: number; commBonus: number
}

export interface PlayerTimeline {
  id: string; name: string; currentHandicap: number; startingHandicap: number | null
  avgPoints: number; stdDev: number; seasonScore: number; topScores: number[]
  courseStats: { name: string; count: number; avgPoints: number }[]
  pointsBreakdown: { base: number; groupBonus: number; commBonus: number }
  scores: RoundScore[]
}

export interface BagEntry {
  memberId: string
  memberName: string
  clubs: { club_name: string; yards: number }[]
}

export interface Analytics {
  playerTimelines: PlayerTimeline[]
  activityByDate:  Record<string, number>
  topCourses:      { name: string; count: number }[]
  holes9: number; holes18: number; diffCount: Record<string, number>
  totalRounds: number; avgPoints: number; maxPoints: number
  bags: BagEntry[]
}
