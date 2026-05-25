export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-9 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card text-center py-3">
            <div className="h-7 w-10 bg-gray-200 rounded animate-pulse mx-auto" />
            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse mx-auto mt-1.5" />
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-10 flex-1 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-10 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-10 w-44 bg-gray-100 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-0">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="w-14 h-14 bg-gray-200 rounded-xl animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
