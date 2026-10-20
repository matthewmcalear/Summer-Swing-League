import { LIMITS, compareGames, sheetSeed, type Board, type Game } from './model'

/**
 * The Yeti's 2026-27 regular season, from the league's "Horaire 2026-2027
 * Schedule" (Westmount Municipal Hockey Leagues, Senior): 38 games, Sep 22 to
 * Mar 11, at Molson or Desmarais. `home` is true when the Yeti are the local
 * team. Players need 60% of regular-season games (23 of 38) for the playoffs.
 */

export interface ScheduledGame {
  /** League game number. */
  no: number
  date: string
  /** Puck drop, 24-hour. */
  time: string
  rink: string
  home: boolean
  opponent: string
}

export const SCHEDULE_ID = 'westmount-senior-2026-27'

/** Games from this date on are loaded into the board (the earlier ones were played before the tool existed). */
export const SCHEDULE_IMPORT_FROM = '2026-10-20'

export const RINKS = ['Molson', 'Desmarais'] as const

export const YETI_SCHEDULE: readonly ScheduledGame[] = [
  { no: 2, date: '2026-09-22', time: '22:20', rink: 'Molson', home: false, opponent: 'Devils' },
  { no: 7, date: '2026-09-29', time: '22:20', rink: 'Molson', home: false, opponent: 'Coyotes' },
  { no: 9, date: '2026-10-01', time: '21:00', rink: 'Desmarais', home: false, opponent: 'Hawks' },
  { no: 13, date: '2026-10-07', time: '22:20', rink: 'Desmarais', home: false, opponent: 'Kings' },
  { no: 14, date: '2026-10-08', time: '21:00', rink: 'Desmarais', home: true, opponent: 'Lightning' },
  { no: 18, date: '2026-10-15', time: '21:00', rink: 'Desmarais', home: true, opponent: 'Hawks' },
  { no: 21, date: '2026-10-20', time: '22:20', rink: 'Molson', home: true, opponent: 'Kings' },
  { no: 24, date: '2026-10-22', time: '22:20', rink: 'Desmarais', home: true, opponent: 'Lightning' },
  { no: 29, date: '2026-10-29', time: '22:20', rink: 'Desmarais', home: true, opponent: 'Coyotes' },
  { no: 30, date: '2026-11-03', time: '21:00', rink: 'Molson', home: false, opponent: 'Kings' },
  { no: 32, date: '2026-11-04', time: '22:20', rink: 'Desmarais', home: false, opponent: 'Lightning' },
  { no: 37, date: '2026-11-11', time: '22:20', rink: 'Desmarais', home: false, opponent: 'Coyotes' },
  { no: 40, date: '2026-11-17', time: '21:00', rink: 'Molson', home: true, opponent: 'Hawks' },
  { no: 43, date: '2026-11-19', time: '21:00', rink: 'Desmarais', home: false, opponent: 'Devils' },
  { no: 45, date: '2026-11-24', time: '21:00', rink: 'Molson', home: true, opponent: 'Lightning' },
  { no: 49, date: '2026-11-26', time: '22:20', rink: 'Desmarais', home: true, opponent: 'Kings' },
  { no: 53, date: '2026-12-03', time: '21:00', rink: 'Desmarais', home: true, opponent: 'Hawks' },
  { no: 56, date: '2026-12-08', time: '22:20', rink: 'Molson', home: false, opponent: 'Coyotes' },
  { no: 59, date: '2026-12-10', time: '22:20', rink: 'Desmarais', home: false, opponent: 'Devils' },
  { no: 61, date: '2026-12-15', time: '22:20', rink: 'Molson', home: true, opponent: 'Kings' },
  { no: 63, date: '2026-12-17', time: '21:00', rink: 'Desmarais', home: false, opponent: 'Lightning' },
  { no: 65, date: '2027-01-05', time: '21:00', rink: 'Molson', home: true, opponent: 'Hawks' },
  { no: 67, date: '2027-01-06', time: '22:20', rink: 'Desmarais', home: true, opponent: 'Coyotes' },
  { no: 71, date: '2027-01-12', time: '22:20', rink: 'Molson', home: true, opponent: 'Devils' },
  { no: 79, date: '2027-01-21', time: '22:20', rink: 'Desmarais', home: false, opponent: 'Lightning' },
  { no: 80, date: '2027-01-26', time: '21:00', rink: 'Molson', home: false, opponent: 'Kings' },
  { no: 84, date: '2027-01-28', time: '22:20', rink: 'Desmarais', home: false, opponent: 'Devils' },
  { no: 85, date: '2027-02-02', time: '21:00', rink: 'Molson', home: false, opponent: 'Hawks' },
  { no: 87, date: '2027-02-03', time: '22:20', rink: 'Desmarais', home: false, opponent: 'Coyotes' },
  { no: 91, date: '2027-02-09', time: '22:20', rink: 'Molson', home: false, opponent: 'Lightning' },
  { no: 96, date: '2027-02-16', time: '22:20', rink: 'Molson', home: false, opponent: 'Coyotes' },
  { no: 98, date: '2027-02-18', time: '21:00', rink: 'Desmarais', home: false, opponent: 'Kings' },
  { no: 102, date: '2027-02-24', time: '22:20', rink: 'Desmarais', home: true, opponent: 'Hawks' },
  { no: 103, date: '2027-02-25', time: '21:00', rink: 'Desmarais', home: true, opponent: 'Devils' },
  { no: 107, date: '2027-03-03', time: '22:20', rink: 'Desmarais', home: true, opponent: 'Kings' },
  { no: 108, date: '2027-03-04', time: '21:00', rink: 'Desmarais', home: true, opponent: 'Devils' },
  { no: 111, date: '2027-03-09', time: '22:20', rink: 'Molson', home: true, opponent: 'Hawks' },
  { no: 114, date: '2027-03-11', time: '22:20', rink: 'Desmarais', home: true, opponent: 'Lightning' },
]

/**
 * Adds the season's remaining games to the board and fills in the time, rink,
 * opponent and home/away of games already on those dates. Never overwrites
 * anything already set and never touches lines or attendance, so it is safe
 * to run again; the board is marked with SCHEDULE_ID once done.
 */
export function applySchedule(board: Board): Board {
  const games = board.games.slice()
  for (const s of YETI_SCHEDULE) {
    if (s.date < SCHEDULE_IMPORT_FROM) continue
    const i = games.findIndex((g) => g.date === s.date)
    if (i >= 0) {
      const g = games[i]
      games[i] = {
        ...g,
        opponent: g.opponent || s.opponent,
        time: g.time || s.time,
        rink: g.rink || s.rink,
        home: g.home ?? s.home,
      }
      continue
    }
    const id = `g-${s.date}`
    if (games.some((g) => g.id === id) || games.length >= LIMITS.games) continue
    const game: Game = {
      id,
      date: s.date,
      opponent: s.opponent,
      time: s.time,
      rink: s.rink,
      home: s.home,
      fLines: LIMITS.fLines.default,
      dPairs: LIMITS.dPairs.default,
      attendance: {},
      slots: {},
    }
    games.push(game)
  }
  games.sort(compareGames)
  return { ...board, games, schedule: SCHEDULE_ID }
}

/** A brand-new board: the spreadsheet's roster and Oct 20 lines, plus the schedule. */
export function seedBoard(): Board {
  return applySchedule(sheetSeed())
}
