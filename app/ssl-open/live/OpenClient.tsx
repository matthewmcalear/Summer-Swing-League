'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Radio, Trophy, ChevronLeft, ChevronRight, Check, Copy, Flag } from 'lucide-react'
import { projectOpen, projectOpenSeason } from '@/lib/open-scoring'
import type { OpenEvent, OpenGroup, OpenMode, OpenPlayer, OpenProjection, OpenState } from '@/lib/open-types'
import { OPEN_BONUSES } from '@/lib/open-types'
import { displayName } from '@/lib/nameUtils'
import OpenSetup from './OpenSetup'

const number = (n: number | null, digits = 1) => n == null ? '—' : n.toFixed(digits)
const signed = (n: number) => n === 0 ? 'E' : `${n > 0 ? '+' : ''}${number(n, Number.isInteger(n) ? 0 : 1)}`
const names = (rows: OpenProjection[]) => rows.map((p) => displayName(p.player.name)).join(', ')
const CODE_KEY = 'ssl_open_scoring_code'

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Unable to connect. Please try again.')
  return data
}

function playerRequest(player: OpenPlayer, code: string, fields: Record<string, unknown>) {
  return jsonRequest(`/api/ssl-open/players/${player.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scoringCode: code, version: player.version, ...fields }),
  })
}

export default function OpenClient({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<OpenState | null>(null)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<'open' | 'season' | 'scoring'>('open')
  const [groupId, setGroupId] = useState('')
  const [adminOpen, setAdminOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [adminBusy, setAdminBusy] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminNotice, setAdminNotice] = useState('')
  const [copied, setCopied] = useState('')
  const [now, setNow] = useState(Date.now())
  const refreshSerial = useRef(0)

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    let saved = ''
    try { saved = hash.get('code') || localStorage.getItem(CODE_KEY) || '' } catch { saved = hash.get('code') || '' }
    setCode(saved)
    try { if (saved) localStorage.setItem(CODE_KEY, saved) } catch { /* private mode: the code lives in memory for this visit */ }
    if (hash.get('group')) setGroupId(hash.get('group')!)
    if (hash.get('code') && !compact) setTab('scoring')
    // Keep the scoring key out of copied public leaderboard links.
    if (hash.has('code')) history.replaceState(null, '', window.location.pathname)
    setReady(true)
  }, [compact])

  const refresh = useCallback(async () => {
    if (!ready) return
    const serial = ++refreshSerial.current
    try {
      const next: OpenState = await jsonRequest(`/api/ssl-open${code ? `?code=${encodeURIComponent(code)}` : ''}`)
      if (serial !== refreshSerial.current) return
      setState(next)
      setError('')
      setGroupId((current) => current || next.authorizedGroupId || next.event?.groups[0]?.id || '')
    } catch (e) {
      if (serial === refreshSerial.current) setError((e as Error).message)
    }
  }, [code, ready])

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
  const group = event?.groups.find((g) => g.id === groupId) || event?.groups[0]
  const canScore = !!state?.isAdmin || (!!group && state?.authorizedGroupId === group.id)
  const age = state ? Math.max(0, Math.floor((now - new Date(state.fetchedAt).getTime()) / 1000)) : 0

  async function login(e: React.FormEvent) {
    e.preventDefault(); setAdminBusy(true); setAdminError('')
    try {
      await jsonRequest('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
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
    if (!confirm('Delete the Open setup, its groups, the scoring links and every live score entered so far? You can set it up again afterwards.')) return
    setAdminBusy(true); setAdminError(''); setAdminNotice('')
    try {
      await jsonRequest('/api/ssl-open', { method: 'DELETE' })
      setGroupId('')
      await refresh()
    } catch (e) { setAdminError((e as Error).message) }
    finally { setAdminBusy(false) }
  }

  const groupLink = (g: OpenGroup) => `${location.origin}/ssl-open/live#group=${g.id}&code=${g.scoringCode}`

  async function copyGroup(g: OpenGroup) {
    try {
      await navigator.clipboard.writeText(groupLink(g))
      setCopied(g.id)
    } catch { setAdminError('Could not copy the link. Select and copy it from the field below.') }
  }

  return <div className={`mx-auto space-y-5 ${compact ? '' : 'max-w-5xl'}`}>
    <section className="rounded-2xl bg-green-900 text-white p-5 sm:p-7 overflow-hidden">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-200"><Radio size={15} /> September 19 · {event?.courseName || 'Golf Ste-Rose'}</p>
        {!compact && <Link href="/ssl-open" className="text-sm text-green-200 underline underline-offset-4">Open rules</Link>}
      </div>
      <h1 className={`${compact ? 'text-2xl' : 'text-3xl sm:text-4xl'} font-bold mt-3`}>The Open, live.</h1>
      <p className="text-sm text-green-100 mt-2">Three groups. One leaderboard. Follow the race for the Open and the SSL season.</p>
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
      <h2 className="text-xl font-bold">Ready for the first tee</h2>
      <p className="text-sm text-gray-600">The commissioner needs to choose the tees, confirm the hole pars and assign the three groups. Live scores will appear here as each group saves a hole.</p>
      {compact ? <Link href="/ssl-open/live" className="btn-primary">Open live scoring</Link> : <button className="btn-primary" onClick={() => setAdminOpen(true)}>Commissioner setup</button>}
    </div>}

    {event && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-white border border-gray-200" role="tablist" aria-label="Open views">
          {([['open', 'Open leaderboard'], ['season', 'SSL season'], ...(!compact ? [['scoring', 'Scorecards']] : [])] as [typeof tab, string][]).map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold ${tab === key ? 'bg-green-800 text-white' : 'text-gray-600'}`}>{label}</button>)}
        </div>
        {compact && <Link href="/ssl-open/live" className="btn-primary"><Flag size={16} className="mr-2" />{event.finalizedAt ? 'Full scorecards' : 'Enter group scores'}</Link>}
      </div>
      <p className="text-xs text-gray-500">{event.courseName} · {event.teeName || 'Selected tees'} · Par {event.coursePar} · {event.difficulty} SSL course difficulty</p>

      {tab === 'open' && <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {event.groups.map((g) => {
            const played = g.players.reduce((sum, p) => sum + p.scores.filter((s) => s > 0).length, 0)
            return <button key={g.id} className="bg-white rounded-xl border border-gray-200 p-3 text-left" onClick={() => { setGroupId(g.id); if (!compact) setTab('scoring') }}>
              <p className="font-bold text-sm text-gray-900">{g.name}</p><p className="text-[11px] text-gray-500 mt-0.5">{g.teeTime} · {g.players.length} players</p>
              <div className="h-1 bg-green-100 rounded mt-3"><div className="h-1 bg-green-600 rounded" style={{ width: `${played / (g.players.length * 18) * 100}%` }} /></div>
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
        <div className="flex flex-wrap gap-2">{event.groups.map((g) => <button key={g.id} onClick={() => setGroupId(g.id)} className={g.id === group.id ? 'btn-primary' : 'btn-secondary'}>{g.name} · {g.teeTime}</button>)}</div>
        {!canScore && !event.finalizedAt && <form className="card space-y-3" onSubmit={(e) => { e.preventDefault(); const next = codeInput.trim(); try { localStorage.setItem(CODE_KEY, next) } catch { /* private mode */ } setCode(next) }}>
          <h2 className="text-lg font-bold">Score for your group</h2><p className="text-sm text-gray-600">Use your group’s private scoring link from the commissioner, or enter its scoring code. Everyone can view the leaderboard.</p>
          <label className="block text-sm font-medium">Group scoring code<input className="form-input" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} autoComplete="off" required /></label>
          <button className="btn-primary">Unlock scoring</button>
          {code && !state?.authorizedGroupId && <p className="text-sm text-red-700">That code does not match a group. Check your scoring link.</p>}
          {state?.authorizedGroupId && state.authorizedGroupId !== group.id && <button type="button" className="btn-secondary ml-2" onClick={() => setGroupId(state.authorizedGroupId!)}>Go to your group</button>}
        </form>}
        <GroupScorecard key={group.id} event={event} group={group} canScore={canScore && !event.finalizedAt} code={code} refresh={refresh} />
      </section>}

      <details className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
        <summary className="font-semibold text-gray-800 cursor-pointer">How the live projections work</summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p>Projected gross = course par + (strokes over par so far × 18 ÷ holes played). Projected net subtracts the player’s locked event handicap. It’s a pace estimate, not a win probability; a single early hole can move it a lot.</p>
          <p>Normal pays +5/+3/+1, Hard +10/+6/+2, God +25/+12/+6 for first/second/third overall. These add directly to the SSL season score. Mode does not change the course difficulty multiplier or the Open’s net ranking.</p>
          <p>Double Down compares back-nine net against front-nine net using half the handicap for each. A strictly lower back nine doubles the finish bonus; a tie or worse pays zero. Once back-nine scoring starts, its own pace estimates that nine. Until then we show the possible bonus range.</p>
          <p>Tied places share a rank. The published rules do not specify a prize tiebreak, so an affected bonus stays a range until the commissioner resolves the tie. Season projections use the range’s lower value and hold the current season handicap constant.</p>
          <p>SSL round points include only the other league players in your own group. Scores already posted from this event are counted once. Final results require all 18 holes and commissioner posting.</p>
        </div>
      </details>
    </>}

    {!compact && <section className="pt-3 border-t border-gray-200 space-y-4">
      <button className="text-sm text-gray-500 underline min-h-10" onClick={() => setAdminOpen(!adminOpen)}>{adminOpen ? 'Hide commissioner controls' : 'Commissioner controls'}</button>
      {adminOpen && !state?.isAdmin && <form className="card max-w-sm space-y-3" onSubmit={login}><label className="block text-sm font-medium">Admin password<input type="password" required autoComplete="current-password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} /></label><button className="btn-primary" disabled={adminBusy}>Sign in</button></form>}
      {adminOpen && state?.isAdmin && !event && <OpenSetup onCreated={() => { setAdminNotice(''); void refresh() }} />}
      {adminOpen && state?.isAdmin && event && <div className="card space-y-4">
        <h2 className="text-xl font-bold">Group scoring links</h2><p className="text-sm text-gray-600">Send each link to that group’s scorer. The link lets them enter scores for every player in their group.</p>
        {event.groups.map((g) => <div key={g.id} className="space-y-1"><button className="btn-secondary" onClick={() => void copyGroup(g)}>{copied === g.id ? <Check size={15} className="mr-2" /> : <Copy size={15} className="mr-2" />}{copied === g.id ? 'Copied' : `Copy ${g.name} link`}</button><input aria-label={`${g.name} scoring link`} readOnly className="form-input text-xs" value={typeof window === 'undefined' ? '' : groupLink(g)} onFocus={(e) => e.target.select()} /></div>)}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <button className="btn-primary" disabled={finished.length === 0 || !!event.finalizedAt || adminBusy} onClick={() => void finalize()}>{event.finalizedAt ? 'Results posted to SSL' : adminBusy ? 'Working…' : 'Post final results to SSL'}</button>
          <p className="text-xs text-gray-500">{event.finalizedAt ? `Posted ${new Date(event.finalizedAt).toLocaleString()}.` : `${finished.length} of ${projections.length} players have finished 18 holes. Posts each complete card as an SSL round plus the earned Open bonuses, once, then locks scoring.${podiumTies.length ? ` Podium tie: ${names(podiumTies)} — decide the tiebreak and award that bonus under Admin › Season bonuses.` : ''}`}</p>
        </div>
        {!event.finalizedAt && <div className="border-t border-gray-100 pt-4 space-y-2">
          <button className="btn-secondary" disabled={adminBusy} onClick={() => void reset()}>Reset Open setup</button>
          <p className="text-xs text-gray-500">Wrong course, pars or groups? Reset deletes the setup, the scoring links and every live score, so do it before play starts.</p>
        </div>}
      </div>}
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

const validStrokes = (draft: string) => draft === '' || (/^\d{1,2}$/.test(draft) && Number(draft) >= 1 && Number(draft) <= 20)

/**
 * One hole at a time for the whole group. Every player's strokes for the hole
 * are typed first, then saved together with one tap; each player's card still
 * saves on its own request so a conflict on one phone never blocks the others.
 */
function GroupScorecard({ event, group, canScore, code, refresh }: { event: OpenEvent; group: OpenGroup; canScore: boolean; code: string; refresh: () => Promise<void> }) {
  const [hole, setHole] = useState(() => {
    const next = event.holePars.findIndex((_, i) => group.players.some((p) => !p.scores[i]))
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

  const edit = (player: OpenPlayer, value: string) => {
    setDrafts((old) => ({ ...old, [player.id]: value }))
    setErrors((old) => { const { [player.id]: _, ...rest } = old; return rest })
    setSaved((old) => { const { [player.id]: _, ...rest } = old; return rest })
  }

  const discard = (player: OpenPlayer) => {
    setDrafts((old) => { const { [player.id]: _, ...rest } = old; return rest })
    setErrors((old) => { const { [player.id]: _, ...rest } = old; return rest })
  }

  // Mode and Double Down are single declarations, saved the moment they are made.
  async function declare(player: OpenPlayer, fields: Record<string, unknown>) {
    setBusy(true)
    setErrors((old) => { const { [player.id]: _, ...rest } = old; return rest })
    try { await playerRequest(player, code, fields) }
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
        await playerRequest(player, code, { hole, strokes: draft === '' ? null : Number(draft) })
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

  return <div className="space-y-4">
    <form className="card space-y-5" onSubmit={(e) => { e.preventDefault(); void saveHole(true) }}>
      <div className="flex items-center justify-between gap-3"><button type="button" aria-label="Previous hole" className="btn-secondary px-3" disabled={hole === 1} onClick={() => goTo(hole - 1)}><ChevronLeft size={20} /></button><div className="text-center"><p className="text-xs text-gray-500">{group.name} · {hole <= 9 ? 'Front nine' : 'Back nine'}</p><h2 className="text-2xl font-bold">Hole {hole} <span className="text-base font-normal text-gray-500">/ Par {par}</span></h2></div><button type="button" aria-label="Next hole" className="btn-secondary px-3" disabled={hole === 18} onClick={() => goTo(hole + 1)}><ChevronRight size={20} /></button></div>
      <div className="grid grid-cols-9 gap-1">{event.holePars.map((_, i) => <button type="button" key={i} onClick={() => goTo(i + 1)} className={`min-h-10 text-sm font-semibold rounded-lg border ${hole === i + 1 ? 'bg-green-800 text-white border-green-800' : group.players.every((p) => p.scores[i] > 0) ? 'bg-green-50 text-green-800 border-green-200' : 'bg-white border-gray-200 text-gray-500'}`} aria-label={`Hole ${i + 1}`} aria-pressed={hole === i + 1}>{i + 1}</button>)}</div>
      {!canScore && <p className="text-xs text-gray-500">{event.finalizedAt ? 'Final scorecards · scoring is closed.' : 'Viewing saved scores. Unlock your group to enter scores.'}</p>}
      {group.players.map((player) => <PlayerHole key={player.id} player={player} hole={hole} par={par} canScore={canScore} busy={busy} draft={drafts[player.id]} error={errors[player.id]} saved={!!saved[player.id]} onEdit={(value) => edit(player, value)} onDiscard={() => discard(player)} onDeclare={(fields) => void declare(player, fields)} />)}
      {canScore && <div className="space-y-2 pt-1">
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary min-h-12 flex-1" disabled={busy}>{busy ? 'Saving…' : hole === 18 ? (hasDirty ? 'Save hole 18' : 'Hole 18 saved') : hasDirty ? `Save hole ${hole} & next` : 'Next hole'}</button>
          {hasDirty && hole < 18 && <button type="button" className="btn-secondary min-h-12" disabled={busy} onClick={() => void saveHole(false)}>Save, stay here</button>}
        </div>
        <p className="text-xs text-gray-500">Enter each player’s gross strokes for hole {hole}, including penalties, then save. A checkmark confirms the server has the score. Blank holes stay unplayed.</p>
      </div>}
    </form>
    <div className="card p-0 overflow-x-auto"><table className="table-base w-full whitespace-nowrap"><caption className="text-left text-sm font-bold px-4 py-3">{group.name} · full scorecards</caption><thead><tr><th>Player</th>{event.holePars.map((_, i) => <th key={i}>{i + 1}</th>)}<th>Total</th></tr></thead><tbody><tr><td>Par</td>{event.holePars.map((p, i) => <td key={i}>{p}</td>)}<td>{event.coursePar}</td></tr>{group.players.map((p) => <tr key={p.id}><td className="font-semibold">{displayName(p.name)}</td>{p.scores.map((s, i) => <td key={i}>{s || '—'}</td>)}<td className="font-bold">{p.scores.reduce((a, b) => a + b, 0) || '—'}</td></tr>)}</tbody></table></div>
  </div>
}

function PlayerHole({ player, hole, par, canScore, busy, draft, error, saved, onEdit, onDiscard, onDeclare }: {
  player: OpenPlayer; hole: number; par: number; canScore: boolean; busy: boolean
  draft: string | undefined; error: string | undefined; saved: boolean
  onEdit: (value: string) => void; onDiscard: () => void; onDeclare: (fields: Record<string, unknown>) => void
}) {
  const [mode, setMode] = useState<OpenMode>(player.mode || 'normal')
  const frontDone = player.scores.slice(0, 9).every((s) => s > 0)
  const backStarted = player.scores.slice(9).some((s) => s > 0)
  const hasScores = player.scores.some((s) => s > 0)
  const value = draft ?? String(player.scores[hole - 1] || '')
  const dirty = draft !== undefined && draft !== String(player.scores[hole - 1] || '')
  const strokes = value === '' ? null : Number(value)

  return <div className="border-t border-gray-100 pt-4 space-y-3">
    <div className="flex justify-between items-start gap-3"><div><h3 className="font-bold text-lg">{displayName(player.name)}</h3><p className="text-xs text-gray-500">HC {number(player.handicap)} · <span className="capitalize">{player.mode || 'Declare mode before scoring'}</span>{player.doubleDown && ' · Double Down'}</p></div><p className="text-lg font-bold tabular-nums">{hasScores ? player.scores.reduce((a, b) => a + b, 0) : '—'}<span className="block text-[10px] text-gray-500 font-normal">gross so far</span></p></div>
    {canScore && !hasScores && <div className="flex flex-wrap items-end gap-2"><label className="text-xs font-medium text-gray-600">First-tee mode<select className="form-input" value={mode} onChange={(e) => setMode(e.target.value as OpenMode)} disabled={busy}>{Object.entries(OPEN_BONUSES).map(([m, bonuses]) => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)} · +{bonuses.join('/+')}</option>)}</select></label><button type="button" className="btn-secondary" disabled={busy || player.mode === mode} onClick={() => onDeclare({ mode })}>{player.mode ? 'Update mode' : 'Declare mode'}</button><p className="text-xs text-gray-500 w-full">Say it to your group. Your mode locks when your first score is saved.</p></div>}
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
