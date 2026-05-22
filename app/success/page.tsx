'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, useCallback } from 'react'

function GolfAnimation({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <>
      <style>{`
        @keyframes ball-arc {
          0%   { transform: translate(0px, 0px)    scale(1);   opacity: 1; }
          35%  { transform: translate(90px, -130px) scale(0.85); opacity: 1; }
          70%  { transform: translate(185px, -40px) scale(0.6);  opacity: 1; }
          90%  { transform: translate(218px,  8px)  scale(0.3);  opacity: 0.6; }
          100% { transform: translate(224px,  14px) scale(0);   opacity: 0; }
        }
        @keyframes swing {
          0%   { transform: rotate(0deg);   }
          20%  { transform: rotate(-30deg); }
          40%  { transform: rotate(25deg);  }
          60%  { transform: rotate(0deg);   }
          100% { transform: rotate(0deg);   }
        }
        @keyframes flag-wave {
          0%, 100% { transform-origin: bottom left; transform: rotate(0deg);  }
          50%       { transform-origin: bottom left; transform: rotate(20deg); }
        }
        @keyframes hole-pop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes sparkle {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        .ball       { animation: ball-arc   1.6s cubic-bezier(.4,0,.6,1) 0.3s both; }
        .golfer-arm { animation: swing      0.45s ease-out 0.1s both; transform-origin: bottom center; }
        .flag       { animation: flag-wave  0.4s ease-in-out 1.9s infinite; }
        .hole-star  { animation: hole-pop   0.35s ease-out var(--delay) both; }
        .sp1 { --tx:-18px; --ty:-22px; --delay:1.85s; animation: sparkle 0.5s ease-out var(--delay) both; }
        .sp2 { --tx: 12px; --ty:-28px; --delay:1.90s; animation: sparkle 0.5s ease-out var(--delay) both; }
        .sp3 { --tx: 22px; --ty:-10px; --delay:1.95s; animation: sparkle 0.5s ease-out var(--delay) both; }
        .sp4 { --tx:-10px; --ty:-18px; --delay:2.00s; animation: sparkle 0.5s ease-out var(--delay) both; }
      `}</style>

      <div className="relative mx-auto" style={{ width: 300, height: 180 }}>
        {/* Green ground */}
        <div className="absolute bottom-0 left-0 right-0 h-10 rounded-xl bg-green-600" />
        <div className="absolute bottom-10 left-0 right-0 h-1 bg-green-700 opacity-40" />

        {/* Golfer */}
        <div className="absolute left-4 bottom-10 select-none" style={{ fontSize: 40, lineHeight: 1 }}>
          <div className="golfer-arm">🏌️</div>
        </div>

        {/* Ball */}
        <div
          className="ball absolute"
          style={{ left: 38, bottom: 38, width: 18, height: 18,
            background: 'white', borderRadius: '50%',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
        />

        {/* Flag pole */}
        <div className="absolute" style={{ right: 52, bottom: 10 }}>
          <div style={{ width: 2, height: 70, background: '#d1d5db', margin: '0 auto' }} />
          {/* Flag */}
          <div className="flag absolute" style={{ top: 0, left: 2, width: 28, height: 18, background: '#ef4444', borderRadius: '0 3px 3px 0' }} />
          {/* Hole */}
          <div style={{ width: 28, height: 8, background: '#111', borderRadius: '50%', margin: '0 auto', marginTop: 2 }} />
        </div>

        {/* Sparkles on landing */}
        <div className="absolute" style={{ right: 56, bottom: 20 }}>
          <div className="hole-star sp1 absolute" style={{ '--delay': '1.85s' } as React.CSSProperties}>✦</div>
          <div className="hole-star sp2 absolute" style={{ '--delay': '1.90s', color: '#fbbf24' } as React.CSSProperties}>✦</div>
          <div className="hole-star sp3 absolute" style={{ '--delay': '1.95s', color: '#86efac' } as React.CSSProperties}>✦</div>
          <div className="hole-star sp4 absolute" style={{ '--delay': '2.00s', color: '#f9a8d4' } as React.CSSProperties}>✦</div>
          <div className="sp1 absolute text-yellow-400 text-xs">✦</div>
          <div className="sp2 absolute text-green-400 text-xs">✦</div>
          <div className="sp3 absolute text-pink-400  text-xs">✦</div>
          <div className="sp4 absolute text-white     text-xs">✦</div>
        </div>
      </div>
    </>
  )
}

function SuccessContent() {
  const params  = useSearchParams()
  const type    = params.get('type')
  const isReg   = type === 'register'
  const [done, setDone] = useState(isReg)
  const onDone  = useCallback(() => setDone(true), [])

  return (
    <div className="max-w-md mx-auto text-center py-16 space-y-6">
      {!isReg && !done && <GolfAnimation onDone={onDone} />}

      <div
        className="space-y-6 transition-all duration-700"
        style={{ opacity: done ? 1 : 0, transform: done ? 'translateY(0)' : 'translateY(12px)' }}
      >
        <div className="text-6xl">{isReg ? '🎉' : '⛳'}</div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isReg ? "You're registered!" : 'Round submitted!'}
        </h1>
        <p className="text-gray-500">
          {isReg
            ? 'Welcome to Summer Swing League 2026. Get out there and play!'
            : 'Your round has been recorded. Check the standings to see where you rank.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/standings" className="btn-primary">View Standings</Link>
          {!isReg && <Link href="/submit-score" className="btn-secondary">Submit Another Round</Link>}
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
