'use client'

import dynamic from 'next/dynamic'

// Leaflet touches `window` at import time — load it in the browser only.
// `ssr: false` must live in a Client Component.
const RangeFinderClient = dynamic(() => import('./RangeFinderClient'), {
  ssr: false,
  loading: () => (
    <div className="card text-center py-20">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm text-gray-500">Loading map…</p>
    </div>
  ),
})

export default RangeFinderClient
