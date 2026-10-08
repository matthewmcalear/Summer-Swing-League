/**
 * Season recap — awards and per-player "wrapped" summaries derived from rounds.
 * Pure: takes plain rows, returns plain data. Loaded by app/season/page.tsx.
 */

export interface RecapRound {
  member_id: string | null
  player_name: string
  holes: number
  gross_score: number
  course_name: string
  total_points: number
  play_date: string // YYYY-MM-DD
  group_member_ids: string[]
}

export interface RecapMember {
  id: string
  name: string
  handicapImprovement: number
}

export interface Award {
  key: string
  title: string
  winner: string
  memberId: string | null
  value: string
  detail?: string
}

export interface PlayerWrap {
  id: string
  name: string
  rounds: number
  holes: number
  courses: number
  favoriteCourse: string | null
  bestRound: { points: number; course: string; date: string } | null
  topPartner: { name: string; rounds: number } | null
  busiestMonth: string | null
}

export interface SeasonRecap {
  totals: { rounds: number; holes: number; courses: number; players: number; strokes: number }
  awards: Award[]
  players: PlayerWrap[]
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Most frequent key, ties broken by first occurrence. */
function mode<T>(items: T[]): { value: T; count: number } | null {
  const counts = new Map<T, number>()
  let best: { value: T; count: number } | null = null
  for (const it of items) {
    const c = (counts.get(it) ?? 0) + 1
    counts.set(it, c)
    if (!best || c > best.count) best = { value: it, count: c }
  }
  return best
}

/** Pick the max by `score`; returns null for empty or all-non-positive scores. */
function top<T>(items: T[], score: (t: T) => number): T | null {
  let best: T | null = null
  let bestScore = 0
  for (const it of items) {
    const s = score(it)
    if (s > bestScore) { best = it; bestScore = s }
  }
  return best
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
/** '2026-09-19' → 'Sep 19' (fixed English, no locale/timezone dependence). */
export const shortDate = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)} ${Number(iso.slice(8, 10))}`

export function buildSeasonRecap(rounds: RecapRound[], members: RecapMember[]): SeasonRecap {
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  const byMember = new Map<string, RecapRound[]>()
  for (const r of rounds) {
    if (!r.member_id || !nameOf.has(r.member_id)) continue
    const list = byMember.get(r.member_id)
    if (list) list.push(r)
    else byMember.set(r.member_id, [r])
  }

  const players: PlayerWrap[] = Array.from(byMember.entries()).map(([id, rs]) => {
    const best = rs.reduce((a, b) => (b.total_points > a.total_points ? b : a))
    const fav = mode(rs.map((r) => r.course_name.trim()))
    const partner = mode(rs.flatMap((r) => r.group_member_ids.filter((g) => g !== id && nameOf.has(g))))
    const month = mode(rs.map((r) => Number(r.play_date.slice(5, 7)) - 1))
    return {
      id,
      name: nameOf.get(id)!,
      rounds: rs.length,
      holes: rs.reduce((s, r) => s + r.holes, 0),
      courses: new Set(rs.map((r) => r.course_name.trim().toLowerCase())).size,
      favoriteCourse: fav && fav.count > 1 ? fav.value : null,
      bestRound: { points: best.total_points, course: best.course_name, date: best.play_date },
      topPartner: partner ? { name: nameOf.get(partner.value)!, rounds: partner.count } : null,
      busiestMonth: month ? MONTHS[month.value] : null,
    }
  }).sort((a, b) => b.rounds - a.rounds || a.name.localeCompare(b.name))

  const memberRounds = rounds.filter((r) => r.member_id && nameOf.has(r.member_id))
  const awards: Award[] = []

  const ironman = top(players, (p) => p.rounds)
  if (ironman) awards.push({
    key: 'ironman', title: 'Iron Man', winner: ironman.name, memberId: ironman.id,
    value: plural(ironman.rounds, 'round'), detail: `${ironman.holes} holes played`,
  })

  const bestRound = top(memberRounds, (r) => r.total_points)
  if (bestRound) awards.push({
    key: 'round', title: 'Round of the Year', winner: nameOf.get(bestRound.member_id!)!, memberId: bestRound.member_id,
    value: `${bestRound.total_points.toFixed(1)} pts`, detail: `${bestRound.course_name} · ${shortDate(bestRound.play_date)}`,
  })

  const low18 = top(memberRounds.filter((r) => r.holes === 18), (r) => 1000 - r.gross_score)
  if (low18) awards.push({
    key: 'lowgross', title: 'Low Gross', winner: nameOf.get(low18.member_id!)!, memberId: low18.member_id,
    value: `${low18.gross_score}`, detail: `18 holes · ${low18.course_name}`,
  })

  const improved = top(members, (m) => m.handicapImprovement)
  if (improved) awards.push({
    key: 'improved', title: 'Most Improved', winner: improved.name, memberId: improved.id,
    value: `−${improved.handicapImprovement} strokes`, detail: 'Handicap drop since first round',
  })

  const explorer = top(players, (p) => p.courses)
  if (explorer && explorer.courses > 1) awards.push({
    key: 'explorer', title: 'Course Explorer', winner: explorer.name, memberId: explorer.id,
    value: plural(explorer.courses, 'course'),
  })

  const partnersOf = (id: string) =>
    new Set((byMember.get(id) ?? []).flatMap((r) => r.group_member_ids.filter((g) => g !== id && nameOf.has(g)))).size
  const social = top(players, (p) => partnersOf(p.id))
  if (social) awards.push({
    key: 'social', title: 'Social Butterfly', winner: social.name, memberId: social.id,
    value: plural(partnersOf(social.id), 'playing partner'),
  })

  return {
    totals: {
      rounds: memberRounds.length,
      holes: memberRounds.reduce((s, r) => s + r.holes, 0),
      courses: new Set(memberRounds.map((r) => r.course_name.trim().toLowerCase())).size,
      players: players.length,
      strokes: memberRounds.reduce((s, r) => s + r.gross_score, 0),
    },
    awards,
    players,
  }
}
