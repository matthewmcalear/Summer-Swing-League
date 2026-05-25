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
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📡 Rangefinder</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Tap anywhere on the satellite map to measure distance from your position.
        </p>
      </div>
      <RangeFinderClient />
    </div>
  )
}
