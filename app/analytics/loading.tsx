export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card text-center">
            <div className="h-7 w-12 bg-gray-200 rounded animate-pulse mx-auto" />
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mx-auto mt-2" />
          </div>
        ))}
      </div>
      <div className="card lg:col-span-2 h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ))}
      </div>
    </div>
  )
}
