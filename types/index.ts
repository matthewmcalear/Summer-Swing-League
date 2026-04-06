export interface Member {
  id: string
  full_name: string
  email: string
  current_handicap: number
  is_active: boolean
  created_at: string
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
}
