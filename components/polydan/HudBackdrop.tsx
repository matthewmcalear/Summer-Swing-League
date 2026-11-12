// The suit-HUD backdrop behind every PolyDan page: a targeting grid, glows,
// and a set of slowly counter-rotating instrument rings. Decoration only, so
// it's hidden from assistive tech and never takes pointer events.

const ticks = (count: number, r1: number, r2: number, every = 1) =>
  Array.from({ length: count }, (_, i) => i)
    .filter((i) => i % every === 0)
    .map((i) => {
      const a = (i / count) * Math.PI * 2
      const [c, s] = [Math.cos(a), Math.sin(a)]
      return `M${(500 + c * r1).toFixed(1)} ${(500 + s * r1).toFixed(1)}L${(500 + c * r2).toFixed(1)} ${(500 + s * r2).toFixed(1)}`
    })
    .join('')

/** An arc of a circle centred on the 1000×1000 canvas, from a0 to a1 degrees. */
const arc = (r: number, a0: number, a1: number) => {
  const p = (deg: number) => {
    const a = (deg * Math.PI) / 180
    return `${(500 + Math.cos(a) * r).toFixed(1)} ${(500 + Math.sin(a) * r).toFixed(1)}`
  }
  return `M${p(a0)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(a1)}`
}

export function HudBackdrop() {
  return (
    <div className="pd-hud" aria-hidden="true">
      <svg className="pd-hud-rings" viewBox="0 0 1000 1000" fill="none">
        <g className="pd-spin-slow" stroke="#5ad6ff" strokeOpacity="0.22">
          <circle cx="500" cy="500" r="470" strokeWidth="1" />
          <path d={ticks(180, 470, 482)} strokeWidth="1" />
          <path d={ticks(180, 470, 494, 15)} strokeWidth="2" />
        </g>
        <g className="pd-spin-rev" stroke="#5ad6ff" strokeOpacity="0.26">
          <path d={arc(410, 10, 110)} strokeWidth="10" strokeOpacity="0.1" />
          <path d={arc(410, 130, 170)} strokeWidth="3" />
          <path d={arc(410, 190, 300)} strokeWidth="10" strokeOpacity="0.1" />
          <path d={arc(410, 315, 350)} strokeWidth="3" />
          <circle cx="500" cy="500" r="392" strokeWidth="1" strokeDasharray="2 10" />
        </g>
        <g className="pd-spin-mid" strokeOpacity="0.3">
          <path d={arc(330, 0, 70)} stroke="#f2b632" strokeWidth="2" />
          <path d={arc(330, 120, 200)} stroke="#5ad6ff" strokeWidth="2" />
          <path d={arc(330, 240, 330)} stroke="#e5382b" strokeWidth="2" />
          <path d={ticks(60, 300, 316)} stroke="#5ad6ff" strokeWidth="1" strokeOpacity="0.2" />
        </g>
        <g stroke="#5ad6ff" strokeOpacity="0.14">
          <circle cx="500" cy="500" r="250" strokeWidth="1" />
          <path d="M500 20V200M500 800V980M20 500H200M800 500H980" strokeWidth="1" />
        </g>
      </svg>
    </div>
  )
}

/** The small glowing reactor mark next to the PolyDan name. */
export function ReactorMark({ className = '' }: { className?: string }) {
  return (
    <svg className={`pd-reactor ${className}`} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="18" stroke="#5ad6ff" strokeWidth="1.5" strokeOpacity="0.7" />
      <path d={ticksSmall} stroke="#5ad6ff" strokeWidth="2.4" />
      <circle cx="20" cy="20" r="8.5" stroke="#bff0ff" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="4.5" fill="#e9fbff" />
    </svg>
  )
}

// Ten coil segments between the inner and outer ring.
const ticksSmall = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2
  const [c, s] = [Math.cos(a), Math.sin(a)]
  return `M${(20 + c * 11).toFixed(2)} ${(20 + s * 11).toFixed(2)}L${(20 + c * 15.5).toFixed(2)} ${(20 + s * 15.5).toFixed(2)}`
}).join('')
