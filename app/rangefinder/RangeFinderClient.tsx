'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Polygon, useMap, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-rotate'

// ── Type augmentation for leaflet-rotate ───────────────────────────────────────

declare module 'leaflet' {
  interface Map {
    getBearing(): number
    setBearing(bearing: number): this
    rotateTo(bearing: number, options?: ZoomPanOptions): this
  }
  interface MapOptions {
    rotate?: boolean
    touchRotate?: boolean
    bearing?: number
  }
}

declare module 'react-leaflet' {
  interface MapContainerProps {
    rotate?: boolean
    touchRotate?: boolean
  }
}

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

// ── Geo helpers ───────────────────────────────────────────────────────────────

function bearingRad(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  return Math.atan2(
    Math.sin(Δλ) * Math.cos(φ2),
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ),
  )
}

function offsetLatLon(lat: number, lon: number, br: number, distM: number): [number, number] {
  const R    = 6371000
  const lat2 = Math.asin(
    Math.sin((lat * Math.PI) / 180) * Math.cos(distM / R) +
    Math.cos((lat * Math.PI) / 180) * Math.sin(distM / R) * Math.cos(br),
  )
  const lon2 = (lon * Math.PI) / 180 + Math.atan2(
    Math.sin(br) * Math.sin(distM / R) * Math.cos((lat * Math.PI) / 180),
    Math.cos(distM / R) - Math.sin((lat * Math.PI) / 180) * Math.sin(lat2),
  )
  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI]
}


function ellipsePoints(
  centerLat: number, centerLon: number,
  semiMajorM: number, semiMinorM: number,
  br: number,
  n = 72,
): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a     = (i / n) * 2 * Math.PI
    const northM = semiMajorM * Math.cos(a) * Math.cos(br) - semiMinorM * Math.sin(a) * Math.sin(br)
    const eastM  = semiMajorM * Math.cos(a) * Math.sin(br) + semiMinorM * Math.sin(a) * Math.cos(br)
    pts.push([
      centerLat + northM / 111320,
      centerLon + eastM  / (111320 * Math.cos((centerLat * Math.PI) / 180)),
    ])
  }
  return pts
}

function makeTextIcon(text: string) {
  return L.divIcon({
    className: '',
    html: `<div style="pointer-events:none;color:#fff;font-size:11px;font-weight:700;line-height:1;white-space:nowrap;transform:translate(-50%,-50%);text-shadow:0 1px 4px rgba(0,0,0,1),0 0 8px rgba(0,0,0,0.9)">${text}</div>`,
    iconSize:   [0, 0],
    iconAnchor: [0, 0],
  })
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
  const map = useMap()
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng)
    map.on('click', handler)
    return () => { map.off('click', handler) }
  }, [map, onMapClick])
  return null
}

function BearingSync({ onBearing }: { onBearing: (b: number) => void }) {
  const map = useMap()
  useEffect(() => {
    const handler = () => onBearing(map.getBearing?.() ?? 0)
    map.on('rotate', handler)
    return () => { map.off('rotate', handler) }
  }, [map, onBearing])
  return null
}

// ── Compass needle SVG ─────────────────────────────────────────────────────────

function CompassNeedle({ bearing }: { bearing: number }) {
  // Needle always points to geographic north — rotates opposite to map bearing
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="#374151" strokeWidth="1.5" />
      <g transform={`rotate(${-bearing}, 10, 10)`}>
        <polygon points="10,3 12,10 10,11 8,10" fill="#dc2626" />
        <polygon points="10,17 12,10 10,11 8,10" fill="#9ca3af" />
      </g>
      <circle cx="10" cy="10" r="1.5" fill="#374151" />
    </svg>
  )
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

// Calibrated to Arccos tracking data. Semi-axes at 150 yd:
//   scratch → lateral 7.5 yd, depth 6 yd
//   hdcp 15 → lateral 20 yd, depth 15 yd
function dispersionLateralYd(yards: number, hdcp: number): number {
  return yards * (0.05 + (Math.min(Math.max(hdcp, 0), 54) / 54) * 0.30)
}
function dispersionDepthYd(yards: number, hdcp: number): number {
  return yards * (0.04 + (Math.min(Math.max(hdcp, 0), 54) / 54) * 0.22)
}

// ── Main component ─────────────────────────────────────────────────────────────

type Pos = { lat: number; lon: number }
interface Member { id: string; full_name: string }

export default function RangeFinderClient({ members = [] }: { members?: Member[] }) {
  const mapRef                      = useRef<L.Map | null>(null)
  const mapWrapperRef               = useRef<HTMLDivElement>(null)
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
  const [bearing,       setBearing]       = useState(0)
  const [isFullscreen,  setIsFullscreen]  = useState(false)

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

  // Lock/unlock body scroll when in CSS fullscreen
  useEffect(() => {
    document.body.style.overflow = isFullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isFullscreen])

  const handleMapClick = useCallback((lat: number, lon: number) => {
    setTargetPos({ lat, lon })
    setTargetElev(null)
  }, [])

  const clearPin      = () => { setTargetPos(null); setTargetElev(null) }
  const recenter      = () => { if (userPos) mapRef.current?.setView([userPos.lat, userPos.lon], mapRef.current.getZoom()) }
  const resetNorth    = () => mapRef.current?.rotateTo(0, { animate: true })
  const rotateDelta   = (delta: number) => {
    if (!mapRef.current) return
    const cur        = mapRef.current.getBearing?.() ?? 0
    const next       = ((cur + delta) % 360 + 360) % 360
    mapRef.current.rotateTo(next, { animate: true })
  }
  const toggleFullscreen = () => {
    setIsFullscreen((fs) => {
      setTimeout(() => mapRef.current?.invalidateSize(), 100)
      return !fs
    })
  }

  // Computed stats
  const yards    = userPos && targetPos ? haversineYards(userPos.lat, userPos.lon, targetPos.lat, targetPos.lon) : null
  const elevDiff = userElev != null && targetElev != null ? (targetElev - userElev) * 3.28084 : null
  const playAs   = yards != null && elevDiff != null && Math.abs(elevDiff) > 2
    ? Math.round(yards + elevDiff / 3)
    : yards != null ? Math.round(yards) : null
  const clubRec  = playAs != null ? recommendClub(playAs, bagClubs) : null

  // ── Loading / error states ─────────────────────────────────────────────────

  if (gpsError && !userPos) {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
    return (
      <div className="card text-center py-16 space-y-3">
        <div className="text-4xl">📍</div>
        <p className="font-semibold text-gray-800">GPS access required</p>
        {!isHttps ? (
          <>
            <p className="text-sm text-red-600 font-medium">You're on an insecure connection (HTTP).</p>
            <p className="text-sm text-gray-600">
              Browsers block GPS on non-secure pages. Open the site using{' '}
              <a href={`https://${window.location.host}${window.location.pathname}`} className="text-green-700 font-semibold underline">
                https://sslgolf.com/rangefinder
              </a>{' '}
              instead.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">{gpsError}</p>
            <p className="text-sm text-gray-600">
              Tap the <strong>lock icon</strong> in your browser address bar, then tap{' '}
              <strong>Site settings → Location → Allow</strong> and reload.
            </p>
          </>
        )}
        <a
          href={`https://${typeof window !== 'undefined' ? window.location.host : 'sslgolf.com'}/rangefinder`}
          className="inline-block mt-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700"
        >
          Open on HTTPS →
        </a>
      </div>
    )
  }

  if (!userPos) return (
    <div className="card text-center py-20 space-y-3">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-sm text-gray-500">Acquiring GPS signal…</p>
    </div>
  )

  const center: [number, number] = [userPos.lat, userPos.lon]
  const isNorth = Math.abs(bearing) < 1

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
        .leaflet-control-zoom { border: none !important; box-shadow: none !important; }
        .leaflet-control-zoom a {
          border: 1px solid #e5e7eb !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.12) !important;
          font-size: 16px !important; color: #374151 !important;
          background: rgba(255,255,255,0.95) !important;
        }
        .leaflet-control-zoom-in  { border-radius: 8px 8px 4px 4px !important; }
        .leaflet-control-zoom-out { border-radius: 4px 4px 8px 8px !important; border-top: none !important; }
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

      {/* ── Map ───────────────────────────────────────────────────────────── */}
      <div
        ref={mapWrapperRef}
        className={`rf-map-wrapper overflow-hidden shadow-md ${
          isFullscreen
            ? 'fixed inset-0 z-[9999] rounded-none border-0'
            : 'relative rounded-2xl border border-gray-200'
        }`}
        style={{ height: isFullscreen ? '100dvh' : 'clamp(500px, calc(100svh - 200px), 860px)' }}
      >
        <MapContainer
          center={center}
          zoom={17}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
          rotate={true}
          touchRotate={true}
          zoomControl={false}
        >
          {/* Esri World Imagery — free satellite tiles, no API key */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP"
            maxZoom={19}
          />

          <ZoomControl position="bottomright" />
          <ClickHandler onMapClick={handleMapClick} />
          <BearingSync onBearing={setBearing} />

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
              {showDispersion && yards !== null && (() => {
                const lateralYd  = dispersionLateralYd(yards, dispersionHcap)
                const depthYd    = dispersionDepthYd(yards, dispersionHcap)
                const lateralM   = lateralYd * 0.9144
                const depthM     = depthYd   * 0.9144
                const br         = bearingRad(userPos.lat, userPos.lon, targetPos.lat, targetPos.lon)
                // br + π/2 → major axis perpendicular to shot (wider left/right)
                const ellipsePts = ellipsePoints(targetPos.lat, targetPos.lon, lateralM, depthM, br + Math.PI / 2)
                // Labels at the depth (along-shot) axis ends
                const shortPt  = offsetLatLon(targetPos.lat, targetPos.lon, br + Math.PI, depthM)
                const longPt   = offsetLatLon(targetPos.lat, targetPos.lon, br, depthM)
                const shortYd  = Math.max(0, Math.round(yards - depthYd))
                const longYd   = Math.round(yards + depthYd)
                return (
                  <>
                    <Polygon
                      positions={ellipsePts}
                      pathOptions={{ color: '#f59e0b', fillColor: '#fcd34d', fillOpacity: 0.18, weight: 1.5, dashArray: '6 4' }}
                    />
                    <Marker position={shortPt} icon={makeTextIcon(`${shortYd} yd`)} interactive={false} />
                    <Marker position={longPt}  icon={makeTextIcon(`${longYd} yd`)}  interactive={false} />
                  </>
                )
              })()}
            </>
          )}
        </MapContainer>

        {/* ── Map data overlay ───────────────────────────────────────────── */}
        {yards !== null && (
          <div className="absolute top-3 right-3 z-[1000] bg-black/65 backdrop-blur-sm rounded-xl px-3 py-2.5 text-white shadow-xl max-w-[200px]">
            {/* Distance */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tabular-nums leading-none">{Math.round(yards)}</span>
              <span className="text-xs text-white/60 font-semibold">yd</span>
              <span className="text-sm font-bold tabular-nums text-white/70">{Math.round(yards * 0.9144)}</span>
              <span className="text-xs text-white/50 font-semibold">m</span>
            </div>

            {/* Elevation */}
            {elevDiff !== null && Math.abs(elevDiff) > 2 && (
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <span className={elevDiff > 0 ? 'text-red-300' : 'text-blue-300'}>
                  {elevDiff > 0 ? '↑' : '↓'} {Math.abs(Math.round(elevDiff))} ft
                </span>
                <span className="text-white/40">·</span>
                <span className="text-purple-300 font-semibold tabular-nums">play {Math.round(yards + elevDiff / 3)} yd</span>
              </div>
            )}

            {/* Club recommendation */}
            {clubRec && (
              <div className="mt-1.5 pt-1.5 border-t border-white/15 flex items-center gap-1.5">
                <span className="text-green-300 text-xs">🏌</span>
                <span className="text-sm font-bold text-green-200 leading-tight">{clubRec.club.club_name}</span>
                {clubRec.diff !== 0 && (
                  <span className="text-[10px] text-white/50 ml-auto tabular-nums">
                    {clubRec.diff > 0 ? `+${clubRec.diff}` : clubRec.diff}
                  </span>
                )}
              </div>
            )}

            {elevLoading && (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-white/40">
                <div className="w-2.5 h-2.5 border border-white/30 border-t-white/70 rounded-full animate-spin" />
                elevation…
              </div>
            )}
          </div>
        )}

        {/* ── Map controls ──────────────────────────────────────────────── */}
        <div className="absolute bottom-4 left-3 z-[1000] flex gap-1.5 flex-wrap">
          {/* Re-center */}
          <button
            onClick={recenter}
            title="Re-center on my position"
            className="bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-white border border-gray-200 transition-colors flex items-center gap-1.5"
          >
            📍 <span className="hidden sm:inline">Center</span>
          </button>

          {/* Rotate CCW */}
          <button
            onClick={() => rotateDelta(-15)}
            title="Rotate left 15°"
            className="bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-white border border-gray-200 transition-colors"
          >
            ↺
          </button>

          {/* Compass — shows needle + resets to north */}
          <button
            onClick={resetNorth}
            title={isNorth ? 'North up' : `Bearing ${Math.round(bearing)}° — tap to reset`}
            className={`bg-white/95 backdrop-blur rounded-xl shadow-lg px-2.5 py-2 text-sm font-semibold border transition-colors flex items-center gap-1 ${
              isNorth
                ? 'text-gray-500 border-gray-200 hover:bg-white'
                : 'text-amber-700 border-amber-300 bg-amber-50/95 hover:bg-amber-100/95'
            }`}
          >
            <CompassNeedle bearing={bearing} />
            {!isNorth && (
              <span className="text-[11px] tabular-nums">{Math.round(bearing)}°</span>
            )}
          </button>

          {/* Rotate CW */}
          <button
            onClick={() => rotateDelta(15)}
            title="Rotate right 15°"
            className="bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-white border border-gray-200 transition-colors"
          >
            ↻
          </button>
        </div>

        {/* Fullscreen toggle — top-left */}
        <div className="absolute top-3 left-3 z-[1000]">
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="bg-white/95 backdrop-blur rounded-xl shadow-lg px-2.5 py-2 text-gray-700 hover:bg-white border border-gray-200 transition-colors"
          >
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 1v5H1M10 1v5h5M15 10h-5v5M1 10h5v5"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* GPS metadata */}
      <p className="text-xs text-center text-gray-400">
        GPS accuracy ±{Math.round(userPos.accuracy)} m
        {userElev != null && ` · Your elevation ${Math.round(userElev * 3.28084)} ft`}
        {gpsError && <span className="text-amber-500 ml-2">⚠ {gpsError}</span>}
      </p>

      {/* ── Info card ─────────────────────────────────────────────────────── */}
      {yards !== null ? (
        <div className="card py-3">
          <div className="flex items-center justify-between gap-3">
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
                <span className="text-amber-500 font-normal hidden sm:inline">
                  {' · ±'}{Math.round(dispersionLateralYd(yards, dispersionHcap))} yd L/R · ±{Math.round(dispersionDepthYd(yards, dispersionHcap))} yd depth
                </span>
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
    </>
  )
}
