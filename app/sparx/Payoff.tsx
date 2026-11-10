'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { NOTES_UNTIL, dayMs, type Point, type Timeline } from '@/lib/sparx/timeline'
import { dayLabel, monthLabel, usd } from './format'

// "When it's paid off": what's still owed over time, solid so far and dashed
// for the estimate, with a step up wherever a ring has to be bought.

const DAY = 86_400_000
const YEAR = 365.25 * DAY
const MAX_YEARS = 25
const H = 200
const M = { top: 26, right: 16, bottom: 26, left: 50 }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Payoff({ timeline: tl }: { timeline: Timeline }) {
  const tooFar = tl.payoff !== null && tl.payoff - tl.today > MAX_YEARS * YEAR
  let headline: string
  if (tl.paidOff) headline = 'Paid off'
  else if (tooFar) headline = `More than ${MAX_YEARS} years away`
  else if (tl.payoff !== null) headline = `Around ${monthLabel(tl.payoff)}`
  else headline = tl.perMonth > 0 ? 'Never, at these numbers' : 'Not enough to estimate yet'

  return (
    <section className="sx-card sx-time" aria-label="When it’s paid off">
      <h2>When it’s paid off</h2>
      <p className="sx-time-hero">{headline}</p>
      <p className="sx-time-sub">
        {tl.perMonth.toLocaleString('en-US', { maximumFractionDigits: 1 })} sharpenings a month on average since {monthLabel(tl.start)} ·{' '}
        {Math.round(tl.thisMonth).toLocaleString('en-US')} so far this month
      </p>
      <Chart tl={tl} />
      <div className="sx-chart-legend" aria-hidden>
        <span>
          <svg width="22" height="8">
            <line x1="1" y1="4" x2="21" y2="4" className="sx-line-actual" />
          </svg>
          So far
        </span>
        {tl.projected.length > 0 && (
          <span>
            <svg width="22" height="8">
              <line x1="1" y1="4" x2="21" y2="4" className="sx-line-projected" />
            </svg>
            Estimate
          </span>
        )}
      </div>
      <p className="sx-time-note">
        {tl.projected.length > 2 && 'The bumps in the estimate are new rings. '}
        Up to {dayLabel(dayMs(NOTES_UNTIL))} the line is straight because your notes had no dates.
      </p>
    </section>
  )
}

function Chart({ tl }: { tl: Timeline }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = wrap.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const all = [...tl.actual, ...tl.projected.slice(1)]
  const t0 = tl.start
  const end = Math.min(tl.payoff ?? tl.today, tl.today + MAX_YEARS * YEAR)
  const t1 = end + Math.max(20 * DAY, (end - t0) * 0.03)

  const lefts = all.map((p) => p.left)
  const low = Math.min(0, ...lefts)
  const high = Math.max(...lefts)
  const step = niceStep(high - low)
  const yMax = Math.max(step, Math.ceil(high / step) * step)
  const yMin = Math.floor(low / step) * step

  const plotW = width - M.left - M.right
  const plotH = H - M.top - M.bottom
  const x = (t: number) => M.left + ((t - t0) / (t1 - t0)) * plotW
  const y = (v: number) => M.top + ((yMax - v) / (yMax - yMin)) * plotH
  const line = (pts: Point[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.left).toFixed(1)}`).join('')

  const yTicks: number[] = []
  for (let v = yMin; v <= yMax + 1e-6; v += step) yTicks.push(v)
  const xTicks = monthTicks(t0, t1).filter((tick) => x(tick.t) > M.left + 16 && x(tick.t) < width - M.right - 16)

  const hoverLeft = hover === null ? null : valueAt(all, hover)
  const pick = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const share = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width))
    setHover(t0 + share * (t1 - t0))
  }

  const nowLeft = tl.actual[tl.actual.length - 1].left
  const showPayoff = tl.payoff !== null && tl.payoff <= t1
  const summary =
    `Still to pay off: ${usd(tl.actual[0].left)} in ${monthLabel(t0)}, ${usd(Math.max(0, nowLeft))} today` +
    (showPayoff ? `, estimated to reach $0 around ${monthLabel(tl.payoff as number)}.` : '.')

  return (
    <div className="sx-chart-wrap" ref={wrap}>
      <svg className="sx-chart" width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={summary}>
        <defs>
          <clipPath id="sx-plot-clip">
            <rect x={M.left} y={0} width={plotW} height={H} />
          </clipPath>
        </defs>

        {yTicks.map((v) => (
          <g key={v}>
            <line className={v === 0 ? 'sx-grid sx-zero' : 'sx-grid'} x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} />
            <text x={M.left - 8} y={y(v) + 4} textAnchor="end">
              {v < 0 ? `−${usd(-v)}` : usd(v)}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <text key={tick.t} x={x(tick.t)} y={H - 6} textAnchor="middle">
            {tick.label}
          </text>
        ))}

        <line className="sx-today" x1={x(tl.today)} x2={x(tl.today)} y1={M.top - 4} y2={M.top + plotH} />
        {!(showPayoff && Math.abs(x(tl.payoff as number) - x(tl.today)) < 90) && (
          <text x={x(tl.today)} y={M.top - 10} textAnchor="middle">
            Today
          </text>
        )}

        {showPayoff && (
          <g>
            <line className="sx-today" x1={x(tl.payoff as number)} x2={x(tl.payoff as number)} y1={M.top - 4} y2={y(0)} />
            <text x={x(tl.payoff as number)} y={M.top - 10} textAnchor={x(tl.payoff as number) > width - 70 ? 'end' : 'middle'} className="sx-chart-strong">
              Paid off ≈{monthLabel(tl.payoff as number)}
            </text>
          </g>
        )}

        <g clipPath="url(#sx-plot-clip)">
          <path className="sx-line-actual" d={line(tl.actual)} />
          {tl.projected.length > 0 && <path className="sx-line-projected" d={line(tl.projected)} />}
        </g>

        {showPayoff && <circle className="sx-dot" cx={x(tl.payoff as number)} cy={y(0)} r={4.5} />}

        {hover !== null && hoverLeft !== null && (
          <g className="sx-cross">
            <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + plotH} />
            <circle className="sx-dot" cx={x(hover)} cy={y(hoverLeft)} r={4.5} />
          </g>
        )}

        <rect
          className="sx-hit"
          x={M.left}
          y={M.top}
          width={plotW}
          height={plotH}
          onPointerDown={pick}
          onPointerMove={pick}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setHover(null)
          }}
        />
      </svg>

      {hover !== null && hoverLeft !== null && (
        <div className="sx-tip" style={{ left: Math.min(Math.max(x(hover) - 75, 0), width - 150) }}>
          <b>{monthLabel(hover)}</b>
          {hoverLeft > 0 ? `${usd(Math.round(hoverLeft))} left` : hoverLeft < 0 ? `${usd(Math.round(-hoverLeft))} ahead` : 'Paid off'}
          {hover > tl.today ? ' (estimate)' : ''}
        </div>
      )}
    </div>
  )
}

function niceStep(span: number) {
  for (const s of [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000]) if (span / s <= 4) return s
  return 100000
}

function monthTicks(t0: number, t1: number) {
  const months = (t1 - t0) / (30.44 * DAY)
  const every = months > 30 ? 12 : months > 12 ? 6 : months > 5 ? 3 : 1
  const ticks: { t: number; label: string }[] = []
  const first = new Date(t0)
  let year = first.getUTCFullYear()
  let m = first.getUTCMonth() + 1
  for (;;) {
    if (m > 11) {
      m = 0
      year++
    }
    const t = Date.UTC(year, m, 1)
    if (t > t1) break
    if (m % every === 0) ticks.push({ t, label: every === 12 ? String(year) : `${MONTHS[m]} ’${String(year).slice(2)}` })
    m++
  }
  return ticks
}

/** What's owed at time t, between the drawn points; after a step, the later value. */
function valueAt(points: Point[], t: number): number | null {
  if (points.length === 0) return null
  let i = -1
  for (let k = 0; k < points.length; k++) if (points[k].t <= t) i = k
  if (i < 0) return points[0].left
  if (i === points.length - 1) return points[i].left
  const a = points[i]
  const b = points[i + 1]
  return a.left + ((t - a.t) / (b.t - a.t)) * (b.left - a.left)
}
