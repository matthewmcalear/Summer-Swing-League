'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SuccessContent() {
  const params  = useSearchParams()
  const type    = params.get('type')
  const isReg   = type === 'register'

  return (
    <div className="max-w-md mx-auto text-center py-20 space-y-6">
      <div className="text-6xl">🎉</div>
      <h1 className="text-3xl font-bold text-gray-900">
        {isReg ? 'You\'re registered!' : 'Score submitted!'}
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
  )
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
