'use client'

import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import type { PlayerTimeline } from './types'

// ── Gradient fill: replaces backgroundColor with a top→transparent gradient
//    for any line dataset with fill: true ──────────────────────────────────────
const gradientPlugin = {
  id: 'gradientFill',
  beforeDatasetsDraw(chart: ChartJS) {
    const { ctx, chartArea } = chart
    if (!chartArea) return
    chart.data.datasets.forEach((dataset, i) => {
      if (!(dataset as any).fill) return
      const meta = chart.getDatasetMeta(i)
      if (meta.type !== 'line' || typeof dataset.borderColor !== 'string') return
      const color = dataset.borderColor
      const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
      grad.addColorStop(0,   color + '40')
      grad.addColorStop(0.6, color + '0c')
      grad.addColorStop(1,   color + '00')
      ;(dataset as any).backgroundColor = grad
    })
  },
}

// ── Crosshair: vertical dashed line at the hovered x position ─────────────────
const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart: ChartJS) {
    const tooltip = chart.tooltip
    if (!tooltip || tooltip.getActiveElements().length === 0) return
    const { ctx, chartArea: { top, bottom } } = chart
    const x = tooltip.getActiveElements()[0].element.x
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.restore()
  },
}

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement,
  Title, Tooltip, Legend, Filler,
  gradientPlugin as any,
  crosshairPlugin as any,
)

// ── Global element defaults (apply to every chart on the page) ─────────────────
ChartJS.defaults.elements.point.radius        = 0
ChartJS.defaults.elements.point.hoverRadius   = 5
ChartJS.defaults.elements.point.hoverBorderWidth = 2
ChartJS.defaults.elements.line.borderWidth    = 2
ChartJS.defaults.elements.line.tension        = 0.4
;(ChartJS.defaults.elements.bar as any).borderRadius = 6
;(ChartJS.defaults.elements.bar as any).borderWidth  = 0
ChartJS.defaults.font.family = 'Inter, system-ui, sans-serif'
ChartJS.defaults.font.size   = 11

// ── Shared style building blocks ───────────────────────────────────────────────
export const scaleBase = {
  grid:   { color: 'rgba(0,0,0,0.05)', tickLength: 0 },
  border: { display: false },
  ticks:  { color: '#9ca3af', padding: 8 },
}

export const tooltipCfg = {
  backgroundColor: 'rgba(17,24,39,0.92)',
  titleColor:      '#f9fafb',
  bodyColor:       '#d1d5db',
  borderColor:     'rgba(255,255,255,0.08)',
  borderWidth:     1,
  padding:         10,
  cornerRadius:    8,
  usePointStyle:   true,
  boxWidth:        8,
  boxHeight:       8,
}

export const legendCfg = {
  position: 'bottom' as const,
  labels:   { color: '#6b7280', padding: 16, usePointStyle: true, pointStyleWidth: 16 },
}

export const noLegend = { display: false }

// ── Chart option presets ───────────────────────────────────────────────────────
export const lineOpts = {
  responsive:       true,
  aspectRatio:      2.2,
  interaction:      { mode: 'index' as const, intersect: false },
  plugins:          { legend: legendCfg, tooltip: tooltipCfg },
  scales:           { x: scaleBase, y: { ...scaleBase, beginAtZero: false } },
}

export const lineOptsRev = {
  responsive:       true,
  aspectRatio:      2.2,
  interaction:      { mode: 'index' as const, intersect: false },
  plugins:          { legend: legendCfg, tooltip: tooltipCfg },
  scales:           { x: scaleBase, y: { ...scaleBase, reverse: true } },
}

export const barOpts = {
  responsive:       true,
  aspectRatio:      1.8,
  interaction:      { mode: 'index' as const, intersect: false },
  plugins:          { legend: legendCfg, tooltip: tooltipCfg },
  scales:           { x: scaleBase, y: { ...scaleBase, beginAtZero: true } },
}

export const barOptsNoLegend = {
  ...barOpts,
  plugins: { legend: noLegend, tooltip: tooltipCfg },
}

// For charts where data is far from 0 — auto-scales to the data range
export const barOptsAutoScale = {
  ...barOpts,
  plugins: { legend: noLegend, tooltip: tooltipCfg },
  scales:  { x: scaleBase, y: { ...scaleBase, beginAtZero: false } },
}

export const lineOptsNoLegend = {
  ...lineOpts,
  plugins: { legend: noLegend, tooltip: tooltipCfg },
}

export const donutOpts = {
  responsive:  true,
  aspectRatio: 1.4,
  cutout:      '72%',
  plugins:     { legend: legendCfg, tooltip: tooltipCfg },
}

// ── Colour palette ─────────────────────────────────────────────────────────────
export const COLORS = [
  '#16a34a', '#2563eb', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#be185d', '#65a30d', '#ea580c', '#6366f1',
]

// Returns a y-axis min that sits below the lowest value so no bar is invisible
export function barFloor(values: number[]) {
  if (!values.length) return 0
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max(5, (max - min) * 0.5)
  return Math.max(0, Math.floor(min - pad))
}

export function consistencyLabel(stdDev: number) {
  if (stdDev === 0) return { label: '—',           cls: 'text-gray-400'   }
  if (stdDev < 2)   return { label: 'Elite',        cls: 'text-purple-700' }
  if (stdDev < 3.5) return { label: 'Consistent',   cls: 'text-green-700'  }
  if (stdDev < 5.5) return { label: 'Average',      cls: 'text-yellow-600' }
  return                   { label: 'Variable',     cls: 'text-red-600'    }
}

export function playerColor(timelines: PlayerTimeline[], id: string) {
  return COLORS[timelines.findIndex((p) => p.id === id) % COLORS.length]
}
