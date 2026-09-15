export const OPEN_EVENT_ID = 'ssl-open-2026'
export const OPEN_DATE = '2026-09-19'
export const OPEN_FIELD_PLAYERS = ['Matthew McAlear', 'Thomas McAlear', 'Dan McAlear', 'Connor Peltz', 'Alex Sokaris', 'Tibi Mitran', 'Shaun Anderson', 'Spence Goodwin', 'Rachel Kuta', 'Nicholas Clarke']
export type OpenMode = 'normal' | 'hard' | 'god'
export const OPEN_BONUSES: Record<OpenMode, number[]> = { normal: [5, 3, 1], hard: [10, 6, 2], god: [25, 12, 6] }
export type OpenPlayer = {
  id: string; memberId: string; name: string; handicap: number; mode: OpenMode | null
  doubleDown: boolean; scores: number[]; version: number; scoreId: string | null; bonusId: string | null
}
export type OpenGroup = { id: string; name: string; teeTime: string; players: OpenPlayer[]; scoringCode?: string }
export type OpenEvent = {
  id: string; courseId: string; courseName: string; teeName: string; playDate: string
  courseRating: number; slopeRating: number; coursePar: number; holePars: number[]
  difficulty: string; finalizedAt: string | null; updatedAt: string; groups: OpenGroup[]
}
export type OpenSeasonMember = {
  id: string; name: string; startingHandicap: number | null; currentHandicap: number
  scores: { id: string; points: number }[]; bonuses: { id: string; points: number }[]
}
export type OpenState = { event: OpenEvent | null; season: OpenSeasonMember[]; isAdmin: boolean; authorizedGroupId?: string | null; fetchedAt: string }
export type OpenProjection = {
  player: OpenPlayer; groupId: string; groupName: string; holesPlayed: number; gross: number; toPar: number
  projectedGross: number | null; projectedNet: number | null; roundPoints: number | null
  rank: number | null; tied: boolean; finishBonus: number | null; bonusMin: number; bonusMax: number
  doubleDownStatus: 'off' | 'pending' | 'projected-win' | 'projected-loss' | 'won' | 'lost'
}
export type OpenSeasonProjection = {
  id: string; name: string; currentScore: number; projectedScore: number; delta: number
  rank: number; currentRank: number; bonusPending: boolean
}
