export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-36 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card space-y-3">
            <div className="flex items-start justify-between">
              <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
              <div className="h-7 w-10 bg-green-100 rounded animate-pulse" />
            </div>
            <div className="h-3 w-36 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
