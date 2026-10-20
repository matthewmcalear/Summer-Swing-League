import {
  SKILL_POINTS,
  attendanceOf,
  fitFor,
  lineLabel,
  slotsFor,
  type Attendance,
  type Board,
  type Fit,
  type Game,
  type Player,
  type SlotDef,
  type SlotKind,
} from './model'

/**
 * Everything the board shows to help decide the lines: line strength from
 * skill, position fit, who's in/out/unconfirmed, who isn't placed yet (the
 * old sheet's "Allocated" column) and what needs attention.
 */

export interface SlotInfo {
  def: SlotDef
  player: Player | null
  fit: Fit | null
  attendance: Attendance | null
}

export interface LineInfo {
  kind: SlotKind
  line: number
  label: string
  slots: SlotInfo[]
  filled: number
  /** Sum of skill points of the players on the line. */
  points: number
  /** Average skill points per player on the line (1–4), null when empty. */
  avg: number | null
}

export interface Warning {
  id: string
  level: 'alert' | 'note'
  text: string
  /** Player the warning is about, so tapping it can pick them up. */
  player?: string
}

export interface GameInsights {
  forwards: LineInfo[]
  defence: LineInfo[]
  goalie: LineInfo
  /** Available (in or unconfirmed) players who aren't in the lineup. */
  bench: Player[]
  out: Player[]
  placed: Map<string, SlotDef>
  counts: { in: number; maybe: number; out: number; slots: number; filled: number; open: number }
  /** Gap between the strongest and weakest line's average (null if fewer than two lines have players). */
  spread: { F: number | null; D: number | null }
  /** Who's bringing beer to this game. */
  beer: Player[]
  warnings: Warning[]
}

function lineInfo(kind: SlotKind, line: number, defs: SlotDef[], game: Game, byId: Map<string, Player>): LineInfo {
  const slots: SlotInfo[] = defs.map((def) => {
    const pid = game.slots[def.id]
    const player = pid ? byId.get(pid) ?? null : null
    return {
      def,
      player,
      fit: player ? fitFor(player.pos, def.kind) : null,
      attendance: player ? attendanceOf(game, player.id) : null,
    }
  })
  const players = slots.flatMap((s) => (s.player ? [s.player] : []))
  const points = players.reduce((sum, p) => sum + SKILL_POINTS[p.skill], 0)
  return {
    kind,
    line,
    label: lineLabel(kind, line),
    slots,
    filled: players.length,
    points,
    avg: players.length ? points / players.length : null,
  }
}

function spreadOf(lines: LineInfo[]): number | null {
  const avgs = lines.flatMap((l) => (l.avg === null ? [] : [l.avg]))
  if (avgs.length < 2) return null
  return Math.max(...avgs) - Math.min(...avgs)
}

const listNames = (names: string[]) =>
  names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

export function analyzeGame(board: Board, game: Game): GameInsights {
  const byId = new Map(board.players.map((p) => [p.id, p]))
  const defs = slotsFor(game)

  const forwards: LineInfo[] = []
  for (let line = 1; line <= game.fLines; line++) {
    forwards.push(lineInfo('F', line, defs.filter((d) => d.kind === 'F' && d.line === line), game, byId))
  }
  const defence: LineInfo[] = []
  for (let line = 1; line <= game.dPairs; line++) {
    defence.push(lineInfo('D', line, defs.filter((d) => d.kind === 'D' && d.line === line), game, byId))
  }
  const goalie = lineInfo('G', 1, defs.filter((d) => d.kind === 'G'), game, byId)

  const placed = new Map<string, SlotDef>()
  for (const l of [...forwards, ...defence, goalie]) for (const s of l.slots) if (s.player) placed.set(s.player.id, s.def)

  const bench: Player[] = []
  const out: Player[] = []
  const counts = { in: 0, maybe: 0, out: 0, slots: defs.length, filled: placed.size, open: defs.length - placed.size }
  for (const p of board.players) {
    const a = attendanceOf(game, p.id)
    counts[a]++
    if (a === 'out') out.push(p)
    else if (!placed.has(p.id)) bench.push(p)
  }

  const warnings: Warning[] = []
  const goalieSlot = goalie.slots[0]
  const benchGoalies = bench.filter((p) => p.pos === 'G')

  if (!goalieSlot.player) {
    const g = benchGoalies.find((p) => attendanceOf(game, p.id) === 'in') ?? benchGoalies[0]
    warnings.push(
      g
        ? { id: 'no-goalie', level: 'alert', text: `${g.name} isn't in net yet`, player: g.id }
        : { id: 'no-goalie', level: 'alert', text: board.players.some((p) => p.pos === 'G') ? 'No goalie available — find a sub' : 'No goalie in net' },
    )
  } else if (goalieSlot.fit === 'wrong') {
    warnings.push({ id: 'skater-in-net', level: 'alert', text: `${goalieSlot.player.name} is in net but isn't a goalie`, player: goalieSlot.player.id })
  }

  // In but not in the lineup — the red "No" in the old Allocated column.
  for (const p of bench) {
    if (attendanceOf(game, p.id) !== 'in') continue
    if (p.pos === 'G' && goalieSlot.player) continue // a backup goalie on the bench is fine
    warnings.push({ id: `unplaced-${p.id}`, level: 'alert', text: `${p.name} is in but not in the lineup`, player: p.id })
  }

  for (const l of [...forwards, ...defence]) {
    for (const s of l.slots) {
      if (!s.player || s.fit === 'ok') continue
      const where = s.def.kind === 'F' ? 'up front' : 'on D'
      warnings.push(
        s.fit === 'wrong'
          ? { id: `fit-${s.player.id}`, level: 'alert', text: `${s.player.name} is a goalie playing ${where}`, player: s.player.id }
          : { id: `fit-${s.player.id}`, level: 'note', text: `${s.player.name} (${s.player.pos}) is playing ${where}`, player: s.player.id },
      )
    }
  }

  const skaterSlots = defs.length - 1
  const skatersPlaced = placed.size - (goalieSlot.player ? 1 : 0)
  const skatersAvailable = bench.filter((p) => p.pos !== 'G').length
  const openSkater = skaterSlots - skatersPlaced
  if (openSkater > 0 && skatersAvailable === 0) {
    warnings.push({
      id: 'short',
      level: 'note',
      text: openSkater === 1 ? '1 open spot and nobody left on the bench' : `${openSkater} open spots and nobody left on the bench`,
    })
  }

  const unconfirmed = [...placed.keys()].filter((id) => attendanceOf(game, id) === 'maybe').map((id) => byId.get(id)!.name)
  if (unconfirmed.length) {
    warnings.push({
      id: 'unconfirmed',
      level: 'note',
      text:
        unconfirmed.length > 4
          ? `${unconfirmed.length} players in the lineup haven't confirmed`
          : `${listNames(unconfirmed)} ${unconfirmed.length === 1 ? "hasn't" : "haven't"} confirmed`,
    })
  }

  const spread = { F: spreadOf(forwards), D: spreadOf(defence) }
  if (spread.F !== null && spread.F >= 1) {
    const withAvg = forwards.filter((l) => l.avg !== null)
    const top = withAvg.reduce((a, b) => (b.avg! > a.avg! ? b : a))
    const low = withAvg.reduce((a, b) => (b.avg! < a.avg! ? b : a))
    warnings.push({
      id: 'spread',
      level: 'note',
      text: `${top.label} is much stronger than ${low.label} (${top.avg!.toFixed(1)} vs ${low.avg!.toFixed(1)})`,
    })
  }

  const beer = game.beer.flatMap((id) => byId.get(id) ?? [])
  for (const p of beer) {
    if (attendanceOf(game, p.id) === 'out') {
      warnings.push({ id: `beer-out-${p.id}`, level: 'note', text: `${p.name} is on beer but marked out`, player: p.id })
    }
  }

  return { forwards, defence, goalie, bench, out, placed, counts, spread, beer, warnings }
}
