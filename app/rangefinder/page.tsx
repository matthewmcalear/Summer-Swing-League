import dynamic from 'next/dynamic'

const RangeFinderClient = dynamic(() => import('./RangeFinderClient'), {
  ssr: false,
  loading: () => (
    <div className="card text-center py-20">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm text-gray-500">Loading map…</p>
    </div>
  ),
})

export default function RangeFinderPage() {
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📡 GPS Rangefinder</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Satellite map + live GPS — measure any distance on the course in real time.
        </p>
      </div>

      {/* ── Live map — first thing you see ── */}
      <RangeFinderClient />

      {/* ── How it works ── */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
          {[
            ['📍 Your position',      'A blue pulsing dot shows your live GPS location, updated continuously as you move around the course.'],
            ['🛰️ Satellite map',      'Uses Esri World Imagery — real satellite photos so you can see fairways, greens, bunkers, and water hazards clearly.'],
            ['📌 Drop a pin',         'Tap anywhere on the map — the flag, front of green, a bunker, a tree — to drop a red pin at that spot.'],
            ['📏 Instant distance',   'The moment you drop a pin, you get the distance in yards and feet, plus the compass bearing from your current position.'],
            ['⛰️ Elevation change',   'Automatically fetches the elevation at both your position and the pin. Shows uphill (↑) or downhill (↓) in feet.'],
            ['🔄 Keep measuring',     'Clear the pin and tap somewhere new to re-measure. Your GPS dot keeps updating as you move.'],
          ].map(([title, desc], i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50">
              <span className="step-num shrink-0">{i + 1}</span>
              <span><strong>{title}</strong> — {desc}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-500">
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold shrink-0">✓</span>
            <span><strong>No account needed</strong> — works for anyone with the link, even non-members.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold shrink-0">✓</span>
            <span><strong>No API key</strong> — satellite tiles and elevation data are fully free and open.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-500 font-bold shrink-0">⚠</span>
            <span><strong>Best outdoors</strong> — GPS accuracy is ±3–10 m outside, much worse indoors or on desktop.</span>
          </div>
        </div>
      </div>

      {/* ── My Bag integration ── */}
      <div className="card space-y-3">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><span>🎒</span> Club Recommendations &amp; Dispersion</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
          {[
            { icon: '🎯', title: 'Club recommendation', body: 'Set up your bag on the My Bag page with each club\'s stock yardage. Once saved, the rangefinder shows your best-fit club every time you drop a pin — using slope-adjusted distance when elevation is available.' },
            { icon: '◎', title: 'Dispersion circle', body: 'Tap "Dispersion OFF" below the info card to overlay a circle on the map showing your statistical shot spread. Drag the slider from tighter (low handicap) to wider to explore different skill scenarios.' },
            { icon: '⛰️', title: 'Play as yardage', body: 'When the target is uphill or downhill by more than 2 ft, a purple "play as" number appears. This is the slope-adjusted distance — the yardage you should actually club for, not the flat distance.' },
            { icon: '📐', title: 'How dispersion is sized', body: 'Based on Arccos/Shot Scope data: radius ≈ distance × (0.10 + hdcp/54 × 0.35). Scratch at 150 yds → ~15 yd radius. Hdcp 30 → ~50 yd radius. Circle shows roughly one standard deviation.' },
          ].map(({ icon, title, body }) => (
            <div key={title} className="flex gap-3 p-3 rounded-xl bg-gray-50">
              <span className="text-xl shrink-0">{icon}</span>
              <span><strong>{title}</strong> — {body}</span>
            </div>
          ))}
        </div>
        <a href="/my-bag" className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:underline">
          🎒 Set up your bag →
        </a>
      </div>

      {/* ── Tips ── */}
      <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
        <p className="text-sm font-semibold text-green-800 mb-2">💡 Tips for best results</p>
        <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
          <li>Allow browser location access when prompted — this is required for the blue dot to appear.</li>
          <li>Zoom in on the satellite map to precisely place your pin on the flag or target.</li>
          <li>Pinch to zoom on mobile, scroll wheel on desktop.</li>
          <li>The elevation fetch takes 1–2 seconds after you drop the pin — wait for the uphill/downhill reading.</li>
          <li>Tap <strong>Re-center</strong> if the map has drifted away from your position.</li>
          <li>Set up your bag on <a href="/my-bag" className="underline font-medium">My Bag</a> to get club recommendations and personalised dispersion circles.</li>
        </ul>
      </div>

    </div>
  )
}
