'use client'

import { useState } from 'react'
import './chartConfig'   // registers Chart.js plugins + global defaults
import OverviewTab from './OverviewTab'
import PlayerTab from './PlayerTab'
import CompareTab from './CompareTab'
import BagsTab from './BagsTab'
import type { Analytics } from './types'

// Re-export so existing imports (e.g. page.tsx) keep working
export type { Analytics, PlayerTimeline, RoundScore, BagEntry } from './types'

type Tab = 'overview' | 'player' | 'compare' | 'bags'

export default function AnalyticsClient({
  data,
  initialTab,
  initialPlayerId,
}: {
  data: Analytics
  initialTab?: string
  initialPlayerId?: string
}) {
  const validTabs: Tab[] = ['overview', 'player', 'compare', 'bags']
  const [tab, setTab]           = useState<Tab>(validTabs.includes(initialTab as Tab) ? (initialTab as Tab) : 'overview')
  // Default to the top 5 by season score — keeps the overview charts readable.
  // Players can toggle anyone else on via the filter chips.
  const [selected, setSelected] = useState<string[]>(() =>
    [...data.playerTimelines]
      .filter((p) => p.scores.length > 0)
      .sort((a, b) => b.seasonScore - a.seasonScore)
      .slice(0, 5)
      .map((p) => p.id)
  )

  const withScores = data.playerTimelines.filter((p) => p.scores.length > 0)
  const tabs = [
    { key: 'overview' as Tab, label: 'League Overview' },
    { key: 'player'   as Tab, label: 'Player Profile'  },
    ...(withScores.length >= 2 ? [{ key: 'compare' as Tab, label: 'Compare' }] : []),
    { key: 'bags' as Tab, label: '🎒 Bags' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {data.totalRounds} rounds · avg {data.avgPoints} pts · best round {data.maxPoints} pts
        </p>
      </div>

      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex gap-0 whitespace-nowrap">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === key
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && <OverviewTab data={data} selected={selected} setSelected={setSelected} />}
      {tab === 'player'   && <PlayerTab   data={data} initialPlayerId={initialPlayerId} />}
      {tab === 'compare'  && <CompareTab  data={data} />}
      {tab === 'bags'     && <BagsTab     data={data} />}
    </div>
  )
}
