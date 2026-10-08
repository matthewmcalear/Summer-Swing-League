export interface Member {
  id: string
  full_name: string
  email?: string
  current_handicap: number
  starting_handicap: number | null
  is_active: boolean
  created_at: string
  round_count?: number
}

export interface Score {
  id: string
  member_id: string | null
  player_name: string
  holes: 9 | 18
  gross_score: number
  handicap_used: number
  course_name: string
  course_difficulty: 'easy' | 'average' | 'tough'
  difficulty_multiplier: number
  group_member_ids: string[]
  group_member_names: string
  group_size: number
  base_points: number
  group_bonus: number
  additional_points: number
  total_points: number
  play_date: string
  notes: string | null
  created_at: string
}

export interface HandicapHistory {
  id: string
  member_id: string
  handicap: number
  score_id: string | null
  recorded_at: string
}

export interface SeasonBonus {
  id: string
  points: number
  reason: string
  awarded_date: string
}

export interface StandingEntry {
  id: string
  name: string
  currentHandicap: number
  startingHandicap: number | null
  handicapImprovement: number
  improvementBonus: number
  totalRounds: number
  totalPoints: number
  seasonScore: number
  topScores: number[]
  seasonBonusPoints: number
  seasonBonuses: SeasonBonus[]
  lastPlayed?: string | null
  /** 1-based; tied players share a rank. */
  rank?: number
  /** Places gained (+) or lost (−) over the last 7 days; null if new/unranked then. */
  movement?: number | null
  gapToLeader?: number
  gapToNext?: number | null
  nextName?: string | null
  /** Points one more round must earn to pass the player directly above; null if out of reach. */
  pointsToPass?: number | null
  /** True when pointsToPass beats the best round anyone has posted this season. */
  toPassAboveBest?: boolean
}
