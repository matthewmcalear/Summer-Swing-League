'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface GroupPin {
  name: string
  code: string
  lat: number
  lon: number
  teams: { name: string; net_total: number; holes_played: number }[]
}

export default function EventMap({ groups }: { groups: GroupPin[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const markersRef   = useRef<L.Marker[]>([])

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      zoomControl:       true,
      attributionControl: false,
    })
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    ).addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Update markers whenever group locations change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear old markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    if (groups.length === 0) return

    const bounds: [number, number][] = []

    groups.forEach((g) => {
      bounds.push([g.lat, g.lon])
      const scoreLines = g.teams
        .map((t) => t.holes_played > 0
          ? `<div style="font-size:11px;color:#d1fae5">${t.name}: <strong>${t.net_total}</strong> (${t.holes_played}/18)</div>`
          : `<div style="font-size:11px;color:#6ee7b7">${t.name}: not started</div>`
        ).join('')

      const icon = L.divIcon({
        className: '',
        html: `<div style="background:rgba(0,0,0,0.78);border:2px solid #f59e0b;border-radius:10px;padding:5px 8px;white-space:nowrap;pointer-events:none">
          <div style="font-size:12px;font-weight:800;color:#fbbf24;margin-bottom:2px">${g.name}</div>
          ${scoreLines}
        </div>`,
        iconAnchor: [0, 0],
        iconSize:   [0, 0],
      })

      const marker = L.marker([g.lat, g.lon], { icon }).addTo(map)
      // Dot under the label
      L.circleMarker([g.lat, g.lon], {
        radius: 6, color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 1, weight: 2,
      }).addTo(map)
      markersRef.current.push(marker)
    })

    if (bounds.length === 1) {
      map.setView(bounds[0], 16)
    } else {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] })
    }
  }, [groups])

  return (
    <div
      ref={containerRef}
      style={{ height: 280, width: '100%', borderRadius: 16, overflow: 'hidden' }}
    />
  )
}
