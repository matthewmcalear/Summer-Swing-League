'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Math helpers ───────────────────────────────────────────────────────────────

function haversineYards(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R  = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a)) * 1.09361
}


async function fetchElevation(lat: number, lon: number): Promise<number | null> {
  try {
    const res  = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`)
    const data = await res.json()
    return typeof data.elevation?.[0] === 'number' ? data.elevation[0] : null
  } catch {
    return null
  }
}

// ── Custom map markers ─────────────────────────────────────────────────────────

const userIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:24px;height:24px">
    <div class="rf-pulse" style="position:absolute;inset:0;background:rgba(59,130,246,0.3);border-radius:50%"></div>
    <div style="position:absolute;top:4px;left:4px;width:16px;height:16px;background:#2563eb;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(37,99,235,0.55)"></div>
  </div>`,
  iconSize:   [24, 24],
  iconAnchor: [12, 12],
})

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="text-align:center">
    <div style="width:22px;height:22px;background:#dc2626;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,0.35);margin:0 auto"></div>
  </div>`,
  iconSize:   [22, 28],
  iconAnchor: [11, 26],
})

// ── Map sub-components ─────────────────────────────────────────────────────────

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) })
  return null
}

// ── Club recommendation ────────────────────────────────────────────────────────

interface Club { id: string; club_name: string; yards: number }

function recommendClub(targetYards: number, clubs: Club[]): { club: Club; diff: number } | null {
  if (!clubs.length) return null
  let best = clubs[0]
  let bestDiff = Math.abs(clubs[0].yards - targetYards)
  for (const c of clubs) {
    const d = Math.abs(c.yards - targetYards)
    if (d < bestDiff) { bestDiff = d; best = c }
  }
  return { club: best, diff: Math.round(targetYards - best.yards) }
}

// dispersionYards: scales with distance and handicap (based on Arccos/Shot Scope data)
function dispersionYards(yards: number, handicap: number): number {
  const factor = 0.10 + (Math.min(Math.max(handicap, 0), 54) / 54) * 0.35
  return yards * factor
}

// ── Main component ─────────────────────────────────────────────────────────────

type Pos = { lat: number; lon: number }
interface Member { id: string; full_name: string }

export default function RangeFinderClient({ members = [] }: { members?: Member[] }) {
  const mapRef                      = useRef<L.Map | null>(null)
  const [userPos,    setUserPos]    = useState<(Pos & { accuracy: number }) | null>(null)
  const [targetPos,  setTargetPos]  = useState<Pos | null>(null)
  const [userElev,   setUserElev]   = useState<number | null>(null)
  const [targetElev, setTargetElev] = useState<number | null>(null)
  const [gpsError,   setGpsError]   = useState<string | null>(null)
  const [elevLoading, setElevLoading] = useState(false)
  const [bagClubs,      setBagClubs]      = useState<Club[]>([])
  const [showDispersion, setShowDispersion] = useState(true)
  const [dispersionHcap, setDispersionHcap] = useState(20)
  const [memberId,      setMemberId]      = useState<string>('')

  // Load persisted member from localStorage, then fetch their bag
  useEffect(() => {
    const saved = localStorage.getItem('ssl_member_id')
    if (saved && members.find((m) => m.id === saved)) {
      setMemberId(saved)
    }
  }, [members])

  // Reload bag + handicap whenever selected member changes
  useEffect(() => {
    if (!memberId) { setBagClubs([]); return }
    localStorage.setItem('ssl_member_id', memberId)
    fetch(`/api/my-bag?memberId=${memberId}`)
      .then((r) => r.json())
      .then(({ clubs, handicap }) => {
        if (Array.isArray(clubs)) setBagClubs(clubs)
        if (typeof handicap === 'number') setDispersionHcap(Math.round(handicap))
      })
      .catch(() => {})
  }, [memberId])

  // GPS watch
  useEffect(() => {
    if (!navigator.geolocation) { setGpsError('Geolocation not supported.'); return }
    const id = navigator.geolocation.watchPosition(
      (p) => { setUserPos({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }); setGpsError(null) },
      (e) => setGpsError(e.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  // Fetch user elevation when position changes meaningfully (~11 m precision)
  const latKey = userPos?.lat.toFixed(4)
  const lonKey = userPos?.lon.toFixed(4)
  useEffect(() => {
    if (!userPos) return
    fetchElevation(userPos.lat, userPos.lon).then(setUserElev)
  }, [latKey, lonKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch target elevation on pin placement
  useEffect(() => {
    if (!targetPos) return
    setElevLoading(true)
    fetchElevation(targetPos.lat, targetPos.lon).then((e) => { setTargetElev(e); setElevLoading(false) })
  }, [targetPos])

  const handleMapClick = useCallback((lat: number, lon: number) => {
    setTargetPos({ lat, lon })
    setTargetElev(null)
  }, [])

  const clearPin = () => { setTargetPos(null); setTargetElev(null) }
  const recenter = () => { if (userPos) mapRef.current?.setView([userPos.lat, userPos.lon], mapRef.current.getZoom()) }

  // Computed stats
  const yards    = userPos && targetPos ? haversineYards(userPos.lat, userPos.lon, targetPos.lat, targetPos.lon) : null
  const elevDiff = userElev != null && targetElev != null ? (targetElev - userElev) * 3.28084 : null
  const playAs   = yards != null && elevDiff != null && Math.abs(elevDiff) > 2
    ? Math.round(yards + elevDiff / 3)
    : yards != null ? Math.round(yards) : null
  const clubRec  = playAs != null ? recommendClub(playAs, bagClubs) : null

  // ── Loading / error states ─────────────────────────────────────────────────

  if (gpsError && !userPos) return (
    <div className="card text-center py-20 space-y-2">
      <div className="text-4xl">📍</div>
      <p className="font-semibold text-gray-800">GPS access required</p>
      <p className="text-sm text-gray-500">{gpsError}</p>
      <p className="text-xs text-gray-400">Allow location access in your browser to use the rangefinder.</p>
    </div>
  )

  if (!userPos) return (
    <div className="card text-center py-20 space-y-3">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-sm text-gray-500">Acquiring GPS signal…</p>
    </div>
  )

  const center: [number, number] = [userPos.lat, userPos.lon]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Pulse keyframe + leaflet z-index fix */}
      <style>{`
        @keyframes rf-pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50%       { transform: scale(2.2); opacity: 0; }
        }
        .rf-pulse { animation: rf-pulse 2s ease-in-out infinite; }
        .leaflet-control-zoom { border: none !important; }
        .leaflet-control-zoom a {
          border-radius: 8px !important; border: 1px solid #e5e7eb !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.12) !important;
          font-size: 16px !important; color: #374151 !important;
        }
      `}</style>

      {/* ── Player selector ───────────────────────────────────────────────── */}
      {members.length > 0 && (
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-2.5">
          <span className="text-sm font-semibold text-gray-600 shrink-0">👤 Player</span>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="form-input flex-1 py-1.5 text-sm"
          >
            <option value="">Select player…</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          {memberId && bagClubs.length === 0 && (
            <span className="text-xs text-gray-400 shrink-0">No bag set up</span>
          )}
          {memberId && bagClubs.length > 0 && (
            <span className="text-xs text-green-600 font-medium shrink-0">{bagClubs.length} clubs</span>
          )}
        </div>
      )}

      {/* ── Info card ─────────────────────────────────────────────────────── */}
      {yards !== null ? (
        <div className="card py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Stats row — wraps freely without displacing the button */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-8 flex-1 min-w-0">

              <div className="text-center">
                <div className="text-5xl font-extrabold text-green-700 tabular-nums">{Math.round(yards)}</div>
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">yards</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700 tabular-nums">{Math.round(yards * 0.9144)}</div>
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">meters</div>
              </div>

              {elevDiff !== null && (
                <>
                  <div className="text-center">
                    <div className={`text-2xl font-bold tabular-nums ${elevDiff > 2 ? 'text-red-500' : elevDiff < -2 ? 'text-blue-500' : 'text-gray-500'}`}>
                      {elevDiff > 2 ? '↑' : elevDiff < -2 ? '↓' : '→'} {Math.abs(Math.round(elevDiff))} ft
                    </div>
                    <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">
                      {elevDiff > 2 ? 'uphill' : elevDiff < -2 ? 'downhill' : 'flat'}
                    </div>
                  </div>
                  {Math.abs(elevDiff) > 2 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 tabular-nums">
                        {Math.round(yards + elevDiff / 3)}
                      </div>
                      <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">play as (yd)</div>
                    </div>
                  )}
                </>
              )}

              {clubRec && (
                <div className="text-center">
                  <div className="text-lg font-extrabold text-green-800 leading-tight">{clubRec.club.club_name}</div>
                  <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">
                    {clubRec.diff === 0 ? 'perfect' : clubRec.diff > 0 ? `+${clubRec.diff} over` : `${clubRec.diff} under`}
                  </div>
                </div>
              )}

              {elevLoading && (
                <div className="text-xs text-gray-400 flex items-center gap-1.5">
                  <div className="w-3 h-3 border border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                  elevation…
                </div>
              )}
            </div>

            {/* Clear button — always pinned to the right, never pushed to a new line */}
            <button onClick={clearPin} className="shrink-0 btn-secondary text-xs px-3 py-1.5">
              ✕ Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 py-3 text-sm text-gray-400 text-center">
          Tap anywhere on the map to drop a pin and measure distance
        </div>
      )}

      {/* ── Dispersion control bar ────────────────────────────────────────── */}
      {yards !== null && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-2.5 space-y-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDispersion((d) => !d)}
              className={`flex items-center gap-1.5 font-semibold text-xs px-2.5 py-1.5 rounded-lg transition-colors shrink-0 ${
                showDispersion ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'text-gray-500 hover:bg-gray-100 border border-transparent'
              }`}
            >
              ◎ Dispersion {showDispersion ? 'ON' : 'OFF'}
            </button>
            {showDispersion && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5 tabular-nums ml-auto">
                {dispersionHcap === 0 ? 'Scratch' : `Hdcp ${dispersionHcap}`}
                <span className="text-amber-500 font-normal hidden sm:inline"> · ≈{Math.round(dispersionYards(yards, dispersionHcap))} yd</span>
              </span>
            )}
          </div>
          {showDispersion && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 shrink-0">Tighter</span>
              <input
                type="range"
                min={0}
                max={54}
                value={dispersionHcap}
                onChange={(e) => setDispersionHcap(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <span className="text-xs text-gray-400 shrink-0">Wider</span>
            </div>
          )}
        </div>
      )}

      {/* ── Map ───────────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-md border border-gray-200"
        style={{ height: 'clamp(500px, calc(100svh - 200px), 860px)' }}
      >
        <MapContainer
          center={center}
          zoom={17}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          {/* Esri World Imagery — free satellite tiles, no API key */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP"
            maxZoom={19}
          />

          <ClickHandler onMapClick={handleMapClick} />

          {/* User position */}
          <Marker position={[userPos.lat, userPos.lon]} icon={userIcon} />

          {/* Target pin + shot line + dispersion */}
          {targetPos && (
            <>
              <Marker position={[targetPos.lat, targetPos.lon]} icon={pinIcon} />
              <Polyline
                positions={[[userPos.lat, userPos.lon], [targetPos.lat, targetPos.lon]]}
                pathOptions={{ color: '#16a34a', weight: 2, dashArray: '8 6', opacity: 0.75 }}
              />
              {showDispersion && yards !== null && (
                <Circle
                  center={[targetPos.lat, targetPos.lon]}
                  radius={dispersionYards(yards, dispersionHcap) * 0.9144}
                  pathOptions={{ color: '#f59e0b', fillColor: '#fcd34d', fillOpacity: 0.18, weight: 1.5, dashArray: '6 4' }}
                />
              )}
            </>
          )}
        </MapContainer>

        {/* Overlaid map buttons */}
        <div className="absolute bottom-4 left-3 z-[1000] flex gap-2">
          <button
            onClick={recenter}
            className="bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-white border border-gray-200 transition-colors"
          >
            📍 Re-center
          </button>
        </div>
      </div>

      {/* GPS metadata */}
      <p className="text-xs text-center text-gray-400">
        GPS accuracy ±{Math.round(userPos.accuracy)} m
        {userElev != null && ` · Your elevation ${Math.round(userElev * 3.28084)} ft`}
        {gpsError && <span className="text-amber-500 ml-2">⚠ {gpsError}</span>}
      </p>
    </>
  )
}
