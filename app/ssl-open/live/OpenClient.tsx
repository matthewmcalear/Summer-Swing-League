'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Radio, Trophy, ChevronLeft, ChevronRight, Check, Flag, UserPlus } from 'lucide-react'
import { projectOpen, projectOpenSeason } from '@/lib/open-scoring'
import type { OpenEvent, OpenGroup, OpenMode, OpenPlayer, OpenProjection, OpenState } from '@/lib/open-types'
import { OPEN_BONUSES } from '@/lib/open-types'
import { displayName } from '@/lib/nameUtils'
import type { Member } from '@/types'

const number = (n: number | null, digits = 1) => n == null ? '—' : n.toFixed(digits)
const signed = (n: number) => n === 0 ? 'E' : `${n > 0 ? '+' : ''}${number(n, Number.isInteger(n) ? 0 : 1)}`
const names = (rows: OpenProjection[]) => rows.map((p) => displayName(p.player.name)).join(', ')
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
/** "13:10" → "1:10" like the Open page; anything else is shown as typed. */
const teeLabel = (time: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!match) return time
  const hour = Number(match[1])
  return `${hour % 12 || 12}:${match[2]}`
}
const groupLabel = (group: OpenGroup) => group.teeTime ? `${group.name} · ${teeLabel(group.teeTime)}` : group.name
const ME_KEY = 'ssl_open_me'
const readMe = () => { try { return localStorage.getItem(ME_KEY) || '' } catch { return '' } }
const writeMe = (id: string) => { try { if (id) localStorage.setItem(ME_KEY, id); else localStorage.removeItem(ME_KEY) } catch { /* private mode */ } }

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Unable to connect. Please try again.')
  return data
}

const json = (body: unknown, method = 'PUT'): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

function playerRequest(player: OpenPlayer, fields: Record<string, unknown>) {
  return jsonRequest(`/api/ssl-open/players/${player.id}`, json({ version: player.version, ...fields }))
}

export default function OpenClient({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<OpenState | null>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<'open' | 'season' | 'scoring'>('open')
  const [groupId, setGroupId] = useState('')
  const [me, setMe] = useState('')
  const [adminOpen, setAdminOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [adminBusy, setAdminBusy] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminNotice, setAdminNotice] = useState('')
  const [now, setNow] = useState(Date.now())
  const refreshSerial = useRef(0)

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    setMe(readMe())
    if (hash.get('tab') === 'scoring' && !compact) setTab('scoring')
    setReady(true)
  }, [compact])

  const refresh = useCallback(async () => {
    if (!ready) return
    const serial = ++refreshSerial.current
    try {
      const next: OpenState = await jsonRequest('/api/ssl-open')
      if (serial !== refreshSerial.current) return
      setState(next)
      setError('')
    } catch (e) {
      if (serial === refreshSerial.current) setError((e as Error).message)
    }
  }, [ready])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => { setNow(Date.now()); if (!document.hidden) void refresh() }, 10_000)
    const wake = () => { if (!document.hidden) void refresh() }
    window.addEventListener('online', wake)
    document.addEventListener('visibilitychange', wake)
    return () => { clearInterval(timer); window.removeEventListener('online', wake); document.removeEventListener('visibilitychange', wake); refreshSerial.current++ }
  }, [refresh])

  const event = state?.event
  const projections = event ? projectOpen(event) : []
  const season = event && state ? projectOpenSeason(event, state.season, projections) : []
  const leaders = projections.filter((p) => p.rank === 1)
  const finished = projections.filter((p) => p.holesPlayed === 18)
  const partial = projections.filter((p) => p.holesPlayed > 0 && p.holesPlayed < 18)
  const unstarted = projections.filter((p) => p.holesPlayed === 0)
  const allFinished = projections.length > 0 && finished.length === projections.length
  const podiumTies = finished.filter((p) => p.rank != null && p.rank <= 3 && p.finishBonus == null)
  const myGroup = event?.groups.find((g) => g.players.some((p) => p.id === me))
  const group = event?.groups.find((g) => g.id === groupId) || myGroup || event?.groups[0]
  const canScore = !!event && !event.finalizedAt
  const age = state ? Math.max(0, Math.floor((now - new Date(state.fetchedAt).getTime()) / 1000)) : 0

  const chooseMe = (player: OpenPlayer | null, playerGroup?: OpenGroup) => {
    setMe(player?.id ?? '')
    writeMe(player?.id ?? '')
    if (playerGroup) setGroupId(playerGroup.id)
  }

  async function login(e: React.FormEvent) {
    e.preventDefault(); setAdminBusy(true); setAdminError('')
    try {
      await jsonRequest('/api/admin/login', json({ password }, 'POST'))
      setPassword(''); await refresh()
    } catch (e) { setAdminError((e as Error).message) }
    finally { setAdminBusy(false) }
  }

  async function finalize() {
    const incomplete = [...partial, ...unstarted]
    const lines = [
      `Post ${finished.length} complete round${finished.length === 1 ? '' : 's'} to the official SSL standings and award the earned Open bonuses? This locks scoring.`,
      incomplete.length ? `Skipped (no complete 18-hole card, so no round or bonus is posted): ${names(incomplete)}.` : '',
      podiumTies.length ? `Podium tie: ${names(podiumTies)}. Their bonus is not posted automatically — decide the tiebreak, then add it under Admin › Season bonuses.` : '',
    ].filter(Boolean)
    if (!confirm(lines.join('\n\n'))) return
    setAdminBusy(true); setAdminError(''); setAdminNotice('')
    try {
      const result = await jsonRequest('/api/ssl-open/finalize', { method: 'POST' })
      setAdminNotice([
        `Posted ${result.posted} round${result.posted === 1 ? '' : 's'} and the earned Open bonuses to the SSL standings.`,
        result.skipped?.length ? `Skipped: ${result.skipped.map(displayName).join(', ')}.` : '',
        result.pendingTies?.length ? `Bonus still to award by hand (tie): ${result.pendingTies.map(displayName).join(', ')}.` : '',
      ].filter(Boolean).join(' '))
      await refresh()
    } catch (e) { setAdminError((e as Error).message) }
    finally { setAdminBusy(false) }
  }

  async function reset() {
    if (!confirm('Delete the Open and every live score entered so far? It is recreated from the announced field and the course library the next time anyone opens the board.')) return
    setAdminBusy(true); setAdminError(''); setAdminNotice('')
    try {
      await jsonRequest('/api/ssl-open', { method: 'DELETE' })
      setGroupId(''); chooseMe(null)
      await refresh()
    } catch (e) { setAdminError((e as Error).message) }
    finally { setAdminBusy(false) }
  }

  return <div className={`mx-auto space-y-5 ${compact ? '' : 'max-w-5xl'}`}>
    <section className="rounded-2xl bg-green-900 text-white p-5 sm:p-7 overflow-hidden">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-200"><Radio size={15} /> September 19 · {event?.courseName || 'Golf Ste-Rose'}</p>
        {!compact && <Link href="/ssl-open" className="text-sm text-green-200 underline underline-offset-4">Open rules</Link>}
      </div>
      <h1 className={`${compact ? 'text-2xl' : 'text-3xl sm:text-4xl'} font-bold mt-3`}>The Open, live.</h1>
      <p className="text-sm text-green-100 mt-2">Three groups. One leaderboard. Enter your own scores hole by hole and follow the race for the Open and the SSL season.</p>
      {leaders.length > 0 && <div className="mt-5 pt-4 border-t border-green-700">
        <p className="text-xs text-brass-200 uppercase tracking-widest font-semibold flex gap-2 items-center"><Trophy size={15} />{event?.finalizedAt ? 'Open winner' : allFinished ? 'Clubhouse leader' : 'Projected Open leader'}{leaders.length > 1 ? 's · tied' : ''}</p>
        <div className="flex flex-wrap justify-between items-end gap-3 mt-2">
          <div><p className="text-xl sm:text-2xl font-bold">{leaders.map((p) => displayName(p.player.name)).join(' & ')}</p><p className="text-green-200 text-xs mt-1">{leaders.map((p) => `${displayName(p.player.name)}: ${p.holesPlayed === 18 ? 'finished' : `${p.holesPlayed} of 18 holes`}`).join(' · ')}</p></div>
          <p className="text-3xl font-bold tabular-nums">{number(leaders[0].projectedNet)} <span className="text-sm font-normal text-green-200">{allFinished || event?.finalizedAt ? 'net' : 'projected net'}</span></p>
        </div>
        {!event?.finalizedAt && unstarted.length > 0 && <p className="text-xs text-green-200 mt-3">{unstarted.length} player{unstarted.length === 1 ? ' has' : 's have'} not started scoring yet.</p>}
      </div>}
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500" aria-live="polite">
      <span className={error ? 'text-red-700 font-semibold' : ''}>{error ? `Updates paused: ${error}` : state ? event?.finalizedAt ? 'Official results posted' : `Refreshes every 10 seconds · updated ${age < 15 ? 'just now' : `${age}s ago`}` : 'Connecting to the leaderboard…'}</span>
      <button className="underline underline-offset-2 min-h-9" onClick={() => void refresh()}>Refresh now</button>
    </div>
    {error && state && <p className="text-sm bg-red-50 text-red-800 border border-red-200 rounded-xl p-3">Showing the last saved scores. Projections may be out of date until the connection returns.</p>}

    {state && !event && <div className="card space-y-3">
      <h2 className="text-xl font-bold">The board is not ready yet</h2>
      <p className="text-sm text-gray-600">{state.notice || 'The Open could not be created automatically. Reload the page, and if this keeps happening tell the commissioner.'}</p>
      <div className="flex flex-wrap gap-3"><button className="btn-primary" onClick={() => void refresh()}>Reload</button><Link href="/register" className="btn-secondary">Register a player</Link></div>
    </div>}

    {event && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-white border border-gray-200" role="tablist" aria-label="Open views">
          {([['open', 'Open leaderboard'], ['season', 'SSL season'], ...(!compact ? [['scoring', 'Scorecards']] : [])] as [typeof tab, string][]).map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold ${tab === key ? 'bg-green-800 text-white' : 'text-gray-600'}`}>{label}</button>)}
        </div>
        {compact && <Link href="/ssl-open/live#tab=scoring" className="btn-primary"><Flag size={16} className="mr-2" />{event.finalizedAt ? 'Full scorecards' : 'Enter my scores'}</Link>}
      </div>
      <p className="text-xs text-gray-500">{event.courseName} · {event.teeName || 'Selected tees'} · Par {event.coursePar} · {event.difficulty} SSL course difficulty</p>

      {tab === 'open' && <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {event.groups.map((g) => {
            const played = g.players.reduce((sum, p) => sum + p.scores.filter((s) => s > 0).length, 0)
            const slots = Math.max(1, g.players.length * 18)
            return <button key={g.id} className="bg-white rounded-xl border border-gray-200 p-3 text-left" onClick={() => { setGroupId(g.id); if (!compact) setTab('scoring') }}>
              <p className="font-bold text-sm text-gray-900">{g.name}</p><p className="text-[11px] text-gray-500 mt-0.5">{teeLabel(g.teeTime)} · {g.players.length} player{g.players.length === 1 ? '' : 's'}</p>
              <div className="h-1 bg-green-100 rounded mt-3"><div className="h-1 bg-green-600 rounded" style={{ width: `${played / slots * 100}%` }} /></div>
              <p className="text-[10px] text-gray-500 mt-1">{played}/{g.players.length * 18} scores in</p>
            </button>
          })}
        </div>
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-base whitespace-nowrap">
              <thead><tr><th>Pos</th><th>Player</th><th>Thru</th><th>Gross</th><th>{allFinished || event.finalizedAt ? 'Net' : 'Proj. net'}</th><th>To lead</th><th>Open bonus</th><th>SSL round pts</th></tr></thead>
              <tbody>{projections.map((p) => <tr key={p.player.id} className={p.rank === 1 ? 'bg-brass-50' : ''}>
                <td className="font-bold text-green-800">{p.rank == null ? '—' : `${p.tied ? 'T' : ''}${p.rank}`}</td>
                <td><p className="font-semibold text-gray-900">{displayName(p.player.name)}</p><p className="text-[11px] text-gray-500 mt-1">{p.groupName} · HC {number(p.player.handicap)} · <span className="capitalize">{p.player.mode || 'Mode undeclared'}</span>{p.player.doubleDown ? ' · DD' : ''}</p></td>
                <td>{p.holesPlayed === 18 ? 'F' : p.holesPlayed || '—'}</td>
                <td>{p.holesPlayed ? p.gross : '—'}<span className="block text-[11px] text-gray-500">{p.holesPlayed ? `${signed(p.toPar)} to par` : 'Not started'}</span></td>
                <td className="font-bold tabular-nums">{number(p.projectedNet)}</td>
                <td className="tabular-nums">{p.projectedNet != null && leaders[0]?.projectedNet != null ? p.rank === 1 ? '—' : `+${number(p.projectedNet - leaders[0].projectedNet)}` : '—'}</td>
                <td><span className="font-semibold text-green-800">{bonusLabel(p)}</span><span className="block text-[11px] text-gray-500">{bonusNote(p)}</span></td>
                <td className="tabular-nums">{number(p.roundPoints, 2)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 p-4 border-t border-gray-100">Lowest {event.finalizedAt ? 'net wins' : 'projected net leads'} the Open. Gross is strokes recorded so far. {event.finalizedAt ? 'Only complete 18-hole cards are ranked.' : 'Projections estimate the full 18 holes so groups at different holes can be compared.'}</p>
        </div>
      </div>}

      {tab === 'season' && <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-bold text-lg">{event.finalizedAt ? 'SSL season standings with the Open' : 'Projected SSL season standings'}</h2><p className="text-xs text-gray-500 mt-1">Best five rounds, participation multiplier, improvement bonus and Open finish bonus.</p></div>
        <div className="overflow-x-auto"><table className="w-full table-base whitespace-nowrap">
          <thead><tr><th>Pos</th><th>Player</th><th>{event.finalizedAt ? 'Before Open' : 'Current'}</th><th>{event.finalizedAt ? 'Season' : 'Projected'}</th><th>Change</th></tr></thead>
          <tbody>{season.map((p) => <tr key={p.id}><td className="font-bold">{p.rank}</td><td className="font-semibold">{displayName(p.name)}{p.bonusPending && <span className="block font-normal text-xs text-gray-500">Open bonus unresolved</span>}</td><td>{number(p.currentScore, 2)}</td><td className="font-bold text-green-800">{number(p.projectedScore, 2)}</td><td className="text-green-700">{p.delta > 0 ? '+' : ''}{number(p.delta, 2)}</td></tr>)}</tbody>
        </table></div><p className="text-xs text-gray-500 p-4">{event.finalizedAt ? 'Posted Open rounds and bonuses are counted once. A tied Open bonus is added when the commissioner awards it.' : 'Unresolved Open bonuses use the lower end of the displayed range. Side awards are added separately by the commissioner.'}</p>
      </div>}

      {tab === 'scoring' && group && <section className="space-y-4">
        <WhoIsScoring event={event} me={me} onChoose={chooseMe} onJoined={(next) => { setState(next); setError('') }} onMove={refresh} canScore={canScore} />
        <div className="flex flex-wrap gap-2">{event.groups.map((g) => <button key={g.id} onClick={() => setGroupId(g.id)} className={g.id === group.id ? 'btn-primary' : 'btn-secondary'}>{groupLabel(g)}</button>)}</div>
        <GroupScorecard key={group.id} event={event} group={group} me={me} canScore={canScore} refresh={refresh} />
      </section>}

      <details className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
        <summary className="font-semibold text-gray-800 cursor-pointer">How the live projections work</summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p>Projected gross = course par + (strokes over par so far × 18 ÷ holes played). Projected net subtracts the player’s handicap, frozen when the board was created. It’s a pace estimate, not a win probability; a single early hole can move it a lot.</p>
          <p>Normal pays +5/+3/+1, Hard +10/+6/+2, God +25/+12/+6 for first/second/third overall. These add directly to the SSL season score. Mode does not change the course difficulty multiplier or the Open’s net ranking.</p>
          <p>Double Down compares back-nine net against front-nine net using half the handicap for each. A strictly lower back nine doubles the finish bonus; a tie or worse pays zero. Once back-nine scoring starts, its own pace estimates that nine. Until then we show the possible bonus range.</p>
          <p>Tied places share a rank. The published rules do not specify a prize tiebreak, so an affected bonus stays a range until the commissioner resolves the tie. Season projections use the range’s lower value and hold the current season handicap constant.</p>
          <p>SSL round points include only the other league players in your own group, so make sure you are listed in the group you actually play with. Final results require all 18 holes and commissioner posting.</p>
        </div>
      </details>
    </>}

    {!compact && <section className="pt-3 border-t border-gray-200 space-y-4">
      <button className="text-sm text-gray-500 underline min-h-10" onClick={() => setAdminOpen(!adminOpen)}>{adminOpen ? 'Hide commissioner controls' : 'Commissioner controls'}</button>
      {adminOpen && !state?.isAdmin && <form className="card max-w-sm space-y-3" onSubmit={login}><label className="block text-sm font-medium">Admin password<input type="password" required autoComplete="current-password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} /></label><button className="btn-primary" disabled={adminBusy}>Sign in</button></form>}
      {adminOpen && state?.isAdmin && event && <div className="card space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Post results</h2>
          <button className="btn-primary" disabled={finished.length === 0 || !!event.finalizedAt || adminBusy} onClick={() => void finalize()}>{event.finalizedAt ? 'Results posted to SSL' : adminBusy ? 'Working…' : 'Post final results to SSL'}</button>
          <p className="text-xs text-gray-500">{event.finalizedAt ? `Posted ${new Date(event.finalizedAt).toLocaleString()}.` : `${finished.length} of ${projections.length} players have finished 18 holes. Posts each complete card as an SSL round plus the earned Open bonuses, once, then locks scoring.${podiumTies.length ? ` Podium tie: ${names(podiumTies)} — decide the tiebreak and award that bonus under Admin › Season bonuses.` : ''}`}</p>
        </div>
        {!event.finalizedAt && <div className="border-t border-gray-100 pt-4 space-y-2">
          <button className="btn-secondary" disabled={adminBusy} onClick={() => void reset()}>Reset the Open</button>
          <p className="text-xs text-gray-500">Deletes the board and every live score. The next visit rebuilds it from the announced field and the course library entry for {event.courseName} (edit that entry in Admin first if the tees or pars are wrong).</p>
        </div>}
      </div>}
      {adminOpen && state?.isAdmin && !event && <p className="text-sm text-gray-600">Nothing to manage until the board exists. {state?.notice}</p>}
      {adminNotice && <p role="status" className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl p-3">{adminNotice}</p>}
      {adminError && <p role="alert" className="text-sm text-red-700">{adminError}</p>}
    </section>}
  </div>
}

function bonusLabel(p: OpenProjection) {
  if (!p.holesPlayed) return '—'
  return p.finishBonus == null ? `+${number(p.bonusMin, 0)}–${number(p.bonusMax, 0)}` : `+${number(p.finishBonus, 0)}`
}
function bonusNote(p: OpenProjection) {
  if (!p.holesPlayed) return 'Awaiting scores'
  if (p.tied && p.finishBonus == null) return 'Tiebreak pending'
  return ({ off: p.holesPlayed === 18 ? 'Finish bonus' : 'Projected bonus', pending: 'DD pending', 'projected-win': 'DD on track', 'projected-loss': 'DD off track', won: 'DD won', lost: 'DD lost' })[p.doubleDownStatus]
}

/** Pick yourself from the field (remembered on this phone), switch groups, or join if you are not listed. */
function WhoIsScoring({ event, me, canScore, onChoose, onJoined, onMove }: {
  event: OpenEvent; me: string; canScore: boolean
  onChoose: (player: OpenPlayer | null, group?: OpenGroup) => void
  onJoined: (state: OpenState) => void
  onMove: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const myGroup = event.groups.find((g) => g.players.some((p) => p.id === me))
  const myself = myGroup?.players.find((p) => p.id === me)

  async function move(target: OpenGroup) {
    if (!myself || !myGroup || target.id === myGroup.id) return
    if (!confirm(`Move ${displayName(myself.name)} to ${groupLabel(target)}? SSL group points count the players you actually play with.`)) return
    setBusy(true); setError('')
    try { await playerRequest(myself, { groupId: target.id }); onChoose(myself, target) }
    catch (e) { setError((e as Error).message) }
    finally { await onMove(); setBusy(false) }
  }

  return <div className="card space-y-4">
    <div>
      <h2 className="text-lg font-bold">Who’s scoring?</h2>
      <p className="text-sm text-gray-600">Tap your name. Anyone can enter scores for their group, so one phone per group works too.</p>
    </div>
    <div className="space-y-3">
      {event.groups.map((g) => <div key={g.id} className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 w-full sm:w-auto sm:min-w-28">{groupLabel(g)}</span>
        {g.players.length === 0 && <span className="text-xs text-gray-400">Nobody yet</span>}
        {g.players.map((p) => <button key={p.id} type="button" onClick={() => onChoose(p.id === me ? null : p, p.id === me ? undefined : g)} aria-pressed={p.id === me} className={`min-h-10 px-3 rounded-full border text-sm font-semibold ${p.id === me ? 'bg-green-800 text-white border-green-800' : 'bg-white text-gray-800 border-gray-200'}`}>{displayName(p.name)}</button>)}
      </div>)}
    </div>
    {myself && myGroup && <div className="flex flex-wrap items-center gap-2 text-sm rounded-xl bg-green-50 border border-green-200 p-3">
      <span>You’re <strong>{displayName(myself.name)}</strong> in <strong>{groupLabel(myGroup)}</strong>.</span>
      {canScore && <label className="text-xs font-medium text-gray-600 flex items-center gap-2">Wrong group?<select className="form-input !py-1.5 !w-auto" value={myGroup.id} disabled={busy} onChange={(e) => { const target = event.groups.find((g) => g.id === e.target.value); if (target) void move(target) }}>{event.groups.map((g) => <option key={g.id} value={g.id}>{groupLabel(g)}</option>)}</select></label>}
    </div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {canScore && <JoinOpen event={event} onJoined={onJoined} />}
  </div>
}

function JoinOpen({ event, onJoined }: { event: OpenEvent; onJoined: (state: OpenState) => void }) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [memberId, setMemberId] = useState('')
  const [groupId, setGroupId] = useState(event.groups[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inField = new Set(event.groups.flatMap((g) => g.players.map((p) => p.memberId)))

  useEffect(() => {
    if (!open || members) return
    fetch('/api/members', { cache: 'no-store' }).then((r) => r.json())
      .then((data) => setMembers(Array.isArray(data) ? (data as Member[]).filter((m) => m.is_active) : []))
      .catch(() => setError('Could not load the member list. Please try again.'))
  }, [open, members])

  async function join(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const next: OpenState = await jsonRequest('/api/ssl-open/players', json({ memberId, groupId }, 'POST'))
      onJoined(next); setOpen(false); setMemberId('')
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  const available = (members ?? []).filter((m) => !inField.has(m.id))
  return <div className="border-t border-gray-100 pt-3">
    {!open ? <button type="button" className="text-sm text-green-800 font-semibold underline underline-offset-2 min-h-10 flex items-center gap-1" onClick={() => setOpen(true)}><UserPlus size={15} />Not in the list? Join the Open</button>
      : <form className="flex flex-wrap items-end gap-2" onSubmit={join}>
        <label className="text-xs font-medium text-gray-600">Player<select required className="form-input" value={memberId} disabled={busy || !members} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">{members ? (available.length ? 'Choose your name' : 'Everyone is already in') : 'Loading…'}</option>
          {available.map((m) => <option key={m.id} value={m.id}>{displayName(m.full_name)} · HC {m.current_handicap}</option>)}
        </select></label>
        <label className="text-xs font-medium text-gray-600">Group<select className="form-input" value={groupId} disabled={busy} onChange={(e) => setGroupId(e.target.value)}>{event.groups.map((g) => <option key={g.id} value={g.id}>{groupLabel(g)}</option>)}</select></label>
        <button className="btn-primary" disabled={busy || !memberId}>{busy ? 'Joining…' : 'Join'}</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setOpen(false); setError('') }}>Cancel</button>
        <p className="w-full text-xs text-gray-500">Not a member yet? <Link className="underline" href="/register">Register</Link> first, then join here.</p>
        {error && <p role="alert" className="w-full text-sm text-red-700">{error}</p>}
      </form>}
  </div>
}

const validStrokes = (draft: string) => draft === '' || (/^\d{1,2}$/.test(draft) && Number(draft) >= 1 && Number(draft) <= 20)

/**
 * One hole at a time for the whole group. Fill in whoever you are scoring for,
 * then save once; each player's card still saves on its own request so a
 * conflict on one phone never blocks the others.
 */
function GroupScorecard({ event, group, me, canScore, refresh }: { event: OpenEvent; group: OpenGroup; me: string; canScore: boolean; refresh: () => Promise<void> }) {
  const [hole, setHole] = useState(() => {
    const mine = group.players.find((p) => p.id === me)
    const next = event.holePars.findIndex((_, i) => mine ? !mine.scores[i] : group.players.some((p) => !p.scores[i]))
    return next < 0 ? 18 : next + 1
  })
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const par = event.holePars[hole - 1]
  const savedValue = (player: OpenPlayer) => String(player.scores[hole - 1] || '')
  const dirty = group.players.filter((p) => p.id in drafts && drafts[p.id] !== savedValue(p))
  const hasDirty = dirty.length > 0

  useEffect(() => {
    if (!hasDirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasDirty])

  const goTo = (next: number) => {
    if (hasDirty && !confirm('Leave this hole without saving your changes?')) return
    setDrafts({}); setErrors({}); setSaved({}); setHole(next)
  }

  const without = (map: Record<string, string>, id: string) => Object.fromEntries(Object.entries(map).filter(([key]) => key !== id))
  const edit = (player: OpenPlayer, value: string) => {
    setDrafts((old) => ({ ...old, [player.id]: value }))
    setErrors((old) => without(old, player.id))
    setSaved((old) => { const next = { ...old }; delete next[player.id]; return next })
  }
  const discard = (player: OpenPlayer) => {
    setDrafts((old) => without(old, player.id))
    setErrors((old) => without(old, player.id))
  }

  // Mode and Double Down are single declarations, saved the moment they are made.
  async function declare(player: OpenPlayer, fields: Record<string, unknown>) {
    setBusy(true)
    setErrors((old) => without(old, player.id))
    try { await playerRequest(player, fields) }
    catch (e) { setErrors((old) => ({ ...old, [player.id]: (e as Error).message })) }
    finally { await refresh(); setBusy(false) }
  }

  async function saveHole(advance: boolean) {
    if (!hasDirty) { if (advance && hole < 18) goTo(hole + 1); return }
    const invalid = dirty.filter((p) => !validStrokes(drafts[p.id]))
    if (invalid.length) {
      setErrors((old) => ({ ...old, ...Object.fromEntries(invalid.map((p) => [p.id, 'Enter whole strokes from 1 to 20, or leave blank.'])) }))
      return
    }
    setBusy(true)
    const failures: Record<string, string> = {}
    const done: Record<string, boolean> = {}
    for (const player of dirty) {
      const draft = drafts[player.id]
      try {
        await playerRequest(player, { hole, strokes: draft === '' ? null : Number(draft) })
        done[player.id] = true
      } catch (e) { failures[player.id] = (e as Error).message }
    }
    await refresh()
    setDrafts((old) => Object.fromEntries(Object.entries(old).filter(([id]) => failures[id])))
    setErrors(failures)
    setSaved(done)
    setBusy(false)
    if (advance && Object.keys(failures).length === 0 && hole < 18) { setSaved({}); setHole(hole + 1) }
  }

  const ordered = [...group.players].sort((a, b) => Number(b.id === me) - Number(a.id === me))

  return <div className="space-y-4">
    <form className="card space-y-5" onSubmit={(e) => { e.preventDefault(); void saveHole(true) }}>
      <div className="flex items-center justify-between gap-3"><button type="button" aria-label="Previous hole" className="btn-secondary px-3" disabled={hole === 1} onClick={() => goTo(hole - 1)}><ChevronLeft size={20} /></button><div className="text-center"><p className="text-xs text-gray-500">{groupLabel(group)} · {hole <= 9 ? 'Front nine' : 'Back nine'}</p><h2 className="text-2xl font-bold">Hole {hole} <span className="text-base font-normal text-gray-500">/ Par {par}</span></h2></div><button type="button" aria-label="Next hole" className="btn-secondary px-3" disabled={hole === 18} onClick={() => goTo(hole + 1)}><ChevronRight size={20} /></button></div>
      <div className="grid grid-cols-9 gap-1">{event.holePars.map((_, i) => <button type="button" key={i} onClick={() => goTo(i + 1)} className={`min-h-10 text-sm font-semibold rounded-lg border ${hole === i + 1 ? 'bg-green-800 text-white border-green-800' : group.players.length > 0 && group.players.every((p) => p.scores[i] > 0) ? 'bg-green-50 text-green-800 border-green-200' : 'bg-white border-gray-200 text-gray-500'}`} aria-label={`Hole ${i + 1}`} aria-pressed={hole === i + 1}>{i + 1}</button>)}</div>
      {!canScore && <p className="text-xs text-gray-500">Final scorecards · scoring is closed.</p>}
      {group.players.length === 0 && <p className="text-sm text-gray-500">Nobody is in this group yet. Pick your name above and use “Wrong group?” to move here.</p>}
      {ordered.map((player) => <PlayerHole key={player.id} player={player} hole={hole} par={par} isMe={player.id === me} canScore={canScore} busy={busy} draft={drafts[player.id]} error={errors[player.id]} saved={!!saved[player.id]} onEdit={(value) => edit(player, value)} onDiscard={() => discard(player)} onDeclare={(fields) => void declare(player, fields)} />)}
      {canScore && group.players.length > 0 && <div className="space-y-2 pt-1">
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary min-h-12 flex-1" disabled={busy}>{busy ? 'Saving…' : hole === 18 ? (hasDirty ? 'Save hole 18' : 'Hole 18 saved') : hasDirty ? `Save hole ${hole} & next` : 'Next hole'}</button>
          {hasDirty && hole < 18 && <button type="button" className="btn-secondary min-h-12" disabled={busy} onClick={() => void saveHole(false)}>Save, stay here</button>}
        </div>
        <p className="text-xs text-gray-500">Enter gross strokes for hole {hole}, including penalties, then save. A checkmark confirms the server has the score. Blank holes stay unplayed.</p>
      </div>}
    </form>
    <div className="card p-0 overflow-x-auto"><table className="table-base w-full whitespace-nowrap"><caption className="text-left text-sm font-bold px-4 py-3">{groupLabel(group)} · full scorecards</caption><thead><tr><th>Player</th>{event.holePars.map((_, i) => <th key={i}>{i + 1}</th>)}<th>Total</th></tr></thead><tbody><tr><td>Par</td>{event.holePars.map((p, i) => <td key={i}>{p}</td>)}<td>{event.coursePar}</td></tr>{group.players.map((p) => <tr key={p.id}><td className="font-semibold">{displayName(p.name)}</td>{p.scores.map((s, i) => <td key={i}>{s || '—'}</td>)}<td className="font-bold">{p.scores.reduce((a, b) => a + b, 0) || '—'}</td></tr>)}</tbody></table></div>
  </div>
}

function PlayerHole({ player, hole, par, isMe, canScore, busy, draft, error, saved, onEdit, onDiscard, onDeclare }: {
  player: OpenPlayer; hole: number; par: number; isMe: boolean; canScore: boolean; busy: boolean
  draft: string | undefined; error: string | undefined; saved: boolean
  onEdit: (value: string) => void; onDiscard: () => void; onDeclare: (fields: Record<string, unknown>) => void
}) {
  const frontDone = player.scores.slice(0, 9).every((s) => s > 0)
  const backStarted = player.scores.slice(9).some((s) => s > 0)
  const hasScores = player.scores.some((s) => s > 0)
  const value = draft ?? String(player.scores[hole - 1] || '')
  const dirty = draft !== undefined && draft !== String(player.scores[hole - 1] || '')
  const strokes = value === '' ? null : Number(value)

  return <div className={`border-t border-gray-100 pt-4 space-y-3 ${isMe ? '-mx-3 px-3 rounded-xl bg-green-50/60' : ''}`}>
    <div className="flex justify-between items-start gap-3"><div><h3 className="font-bold text-lg">{displayName(player.name)}{isMe && <span className="ml-2 text-[10px] uppercase tracking-widest text-green-800 font-bold">you</span>}</h3><p className="text-xs text-gray-500">HC {number(player.handicap)} · {player.mode ? `${capitalize(player.mode)} mode` : 'Mode not declared'}{player.doubleDown && ' · Double Down'}</p></div><p className="text-lg font-bold tabular-nums">{hasScores ? player.scores.reduce((a, b) => a + b, 0) : '—'}<span className="block text-[10px] text-gray-500 font-normal">gross so far</span></p></div>
    {canScore && !hasScores && <div className="space-y-2">
      <p className="text-xs font-medium text-gray-600">{player.mode ? 'First-tee mode (locks with the first saved score)' : 'Declare a mode on the first tee to start scoring'}</p>
      <div className="grid grid-cols-3 gap-2">{(Object.entries(OPEN_BONUSES) as [OpenMode, number[]][]).map(([mode, bonuses]) => <button key={mode} type="button" disabled={busy} aria-pressed={player.mode === mode} onClick={() => { if (player.mode !== mode) onDeclare({ mode }) }} className={`min-h-12 rounded-xl border text-sm font-semibold ${player.mode === mode ? 'bg-green-800 text-white border-green-800' : 'bg-white border-gray-200 text-gray-800'}`}>{capitalize(mode)}<span className={`block text-[10px] font-normal ${player.mode === mode ? 'text-green-100' : 'text-gray-500'}`}>+{bonuses.join('/+')}</span></button>)}</div>
    </div>}
    {canScore && frontDone && !backStarted && <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm space-y-2"><p className="font-semibold">At the turn: Double Down?</p><p className="text-xs text-gray-600">Say it to your group before playing hole 10. Beat your front-nine net to double your finish bonus; tie or worse means zero.</p><button type="button" disabled={busy} onClick={() => { if (confirm(player.doubleDown ? 'Withdraw Double Down before starting the back nine?' : 'Declare Double Down to your group now?')) onDeclare({ doubleDown: !player.doubleDown }) }} className="btn-secondary">{player.doubleDown ? 'Double Down declared · undo' : 'Declare Double Down'}</button></div>}
    {canScore ? <div className="flex items-end gap-3">
      <label className="block text-xs font-medium text-gray-600 flex-1">Hole {hole} strokes<input type="number" inputMode="numeric" min={1} max={20} step={1} aria-label={`${displayName(player.name)} hole ${hole} strokes`} className="form-input !text-xl !py-3 tabular-nums" placeholder={player.mode ? String(par) : 'Declare mode first'} disabled={busy || !player.mode} value={value} onChange={(e) => onEdit(e.target.value)} /></label>
      <p className="text-sm text-gray-500 min-w-16 pb-3 tabular-nums" aria-live="polite">{strokes == null ? '' : strokes === par ? 'Par' : signed(strokes - par)}</p>
    </div> : <p className="text-sm">Hole {hole}: <strong>{player.scores[hole - 1] || '—'}</strong></p>}
    {saved && !dirty && <p role="status" className="text-xs text-green-700 flex items-center gap-1"><Check size={14} />Saved</p>}
    {dirty && !error && <p className="text-xs text-gray-500">Unsaved change</p>}
    {error && <div role="alert" className="text-sm text-red-700 space-y-2"><p>{error}{dirty ? ' Your entry is still here.' : ''}</p>{dirty && <button type="button" className="underline text-xs" onClick={onDiscard}>Discard my edit and use latest saved score</button>}</div>}
  </div>
}
