'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChartSeries } from '@/lib/polydan/queries'

// Step-line chart of each outcome's price over time (prices only change on
// trades and results). ≤4 series, fixed slot order, direct labels at the
// line ends + a legend, crosshair tooltip listing every series.
//
// `fill` (the TV): the chart takes its parent's height and scales its text
// and spacing with the surrounding font size instead of a fixed 220px.

const SLOTS = ['var(--pd-series-1)', 'var(--pd-series-2)', 'var(--pd-series-3)', 'var(--pd-series-4)']
const BASE_H = 220

function fmtTime(t: number, spanMs: number) {
  const d = new Date(t)
  return spanMs < 36 * 3600e3
    ? d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export function PriceChart({
  series,
  binaryLabel,
  fill = false,
}: {
  series: ChartSeries[]
  binaryLabel?: string
  fill?: boolean
}) {
  const plot = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ w: number; h: number; k: number } | null>(null)
  const measured = box != null
  const w = box?.w ?? 0
  const H = box?.h ?? BASE_H
  const k = box?.k ?? 1 // text/spacing scale
  const PAD = { top: 12 * k, right: 96 * k, bottom: 26 * k, left: 36 * k }
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = plot.current
    if (!el) return
    const ro = new ResizeObserver(([e]) =>
      setBox({
        w: Math.max(280, e.contentRect.width),
        h: fill ? Math.max(60, Math.floor(e.contentRect.height)) : BASE_H,
        k: fill ? (parseFloat(getComputedStyle(el).fontSize) || 13) / 13 : 1,
      }),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [fill])

  const times = series[0]?.points.map((p) => p.t) ?? []
  const t0 = times[0] ?? 0
  const t1 = Math.max(times.at(-1) ?? 1, t0 + 60_000)
  const innerW = w - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  // Fill mode zooms the y-axis to the data (a 21-way race lives under 30%),
  // in steps that keep the gridlines on round percentages.
  const peak = Math.max(0, ...series.flatMap((s) => s.points.map((pt) => pt.p)))
  const yMax = fill ? ([0.2, 0.4, 0.6, 0.8].find((m) => peak * 1.1 <= m) ?? 1) : 1
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * innerW
  const y = (p: number) => PAD.top + (1 - p / yMax) * innerH

  const paths = useMemo(
    () =>
      series.map((s) =>
        s.points
          .map((pt, i) => {
            const X = x(pt.t).toFixed(1)
            const Y = y(pt.p).toFixed(1)
            if (i === 0) return `M${X},${Y}`
            return `H${X}V${Y}` // step: hold the old price until the trade
          })
          .join(''),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, w, H, k, yMax],
  )

  // Direct labels at the right edge, nudged apart so they never collide.
  const labels = useMemo(() => {
    const ends = series
      .map((s, i) => ({ i, label: binaryLabel ?? s.label, p: s.points.at(-1)?.p ?? 0, y: y(s.points.at(-1)?.p ?? 0) }))
      .sort((a, b) => a.y - b.y)
    const gap = 15 * k
    for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + gap)
    // Pushed past the bottom of the plot? Stack them back up from the bottom.
    const floor = PAD.top + innerH
    for (let i = ends.length - 1; i >= 0; i--) ends[i].y = Math.min(ends[i].y, floor - (ends.length - 1 - i) * gap)
    return ends
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, w, H, k, yMax, binaryLabel])

  if (!series.length) return null

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const t = t0 + ((e.clientX - rect.left) / rect.width) * (t1 - t0)
    let idx = 0
    for (let i = 0; i < times.length; i++) if (times[i] <= t) idx = i
    setHover(idx)
  }

  const hv = hover != null ? hover : null
  const hx = hv != null ? x(times[hv]) : 0

  return (
    <div className={`w-full select-none ${fill ? 'flex h-full min-h-0 flex-col' : ''}`}>
      {measured && series.length > 1 && (
        <ul
          className={
            fill
              ? 'mb-[0.5em] flex flex-wrap gap-x-[1.2em] gap-y-[0.2em] text-[0.85em] text-pd-ink-2'
              : 'mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pd-ink-2'
          }
        >
          {series.map((s, i) => (
            <li key={s.outcomeId} className="flex items-center gap-[0.4em]">
              <span className="inline-block h-[0.15em] w-[1.3em] rounded" style={{ background: SLOTS[i] }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div ref={plot} className={`relative ${fill ? 'min-h-0 flex-1' : ''}`} style={fill ? undefined : { minHeight: BASE_H }}>
        {measured && (
          <>
          <svg width={w} height={H} role="img" aria-label="Price history chart" className="block">
            {[0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax).map((g) => (
              <g key={g}>
                <line x1={PAD.left} x2={PAD.left + innerW} y1={y(g)} y2={y(g)} stroke="var(--pd-grid)" strokeWidth={1} />
                <text x={PAD.left - 6 * k} y={y(g) + 4 * k} textAnchor="end" fontSize={11 * k} fill="var(--pd-muted)" className="pd-num">
                  {Math.round(g * 100)}%
                </text>
              </g>
            ))}
            <text x={PAD.left} y={H - 6 * k} fontSize={11 * k} fill="var(--pd-muted)">
              {fmtTime(t0, t1 - t0)}
            </text>
            <text x={PAD.left + innerW} y={H - 6 * k} fontSize={11 * k} fill="var(--pd-muted)" textAnchor="end">
              Now
            </text>
            {paths.map((d, i) => (
              <path
                key={series[i].outcomeId}
                d={d}
                fill="none"
                stroke={SLOTS[i]}
                strokeWidth={2 * k}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {series.map((s, i) => (
              <circle
                key={s.outcomeId}
                cx={x(s.points.at(-1)!.t)}
                cy={y(s.points.at(-1)!.p)}
                r={4 * k}
                fill={SLOTS[i]}
                stroke="var(--pd-surface)"
                strokeWidth={2 * k}
              />
            ))}
            {labels.map((l) => (
              <text key={l.i} x={PAD.left + innerW + 10 * k} y={l.y + 4 * k} fontSize={12 * k} fill="var(--pd-ink)">
                <tspan fontWeight={600} className="pd-num">
                  {Math.round(l.p * 100)}%
                </tspan>
                <tspan fill="var(--pd-ink-2)"> {l.label.length > 9 ? `${l.label.slice(0, 8)}…` : l.label}</tspan>
              </text>
            ))}
            {hv != null && (
              <line x1={hx} x2={hx} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--pd-line-strong)" strokeWidth={1} />
            )}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={innerW}
              height={innerH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
          {hv != null && (
            <div
              className="pointer-events-none absolute top-8 z-10 min-w-36 rounded-lg border border-pd-line bg-pd-surface px-3 py-2 text-xs shadow-lg"
              style={{ left: Math.min(Math.max(hx - 70, 0), w - 160) }}
            >
              <p className="mb-1 text-pd-muted">{new Date(times[hv]).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
              {series.map((s, i) => (
                <p key={s.outcomeId} className="flex items-center gap-2">
                  <span className="inline-block h-0.5 w-3 rounded" style={{ background: SLOTS[i] }} />
                  <span className="font-semibold pd-num">{Math.round(s.points[hv].p * 100)}%</span>
                  <span className="text-pd-ink-2">{binaryLabel ?? s.label}</span>
                </p>
              ))}
            </div>
          )}
          </>
        )}
      </div>
    </div>
  )
}
