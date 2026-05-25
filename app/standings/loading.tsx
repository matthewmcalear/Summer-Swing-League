export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-72 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="bg-green-50 px-3 py-3 grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-green-100 rounded animate-pulse" />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border-t border-gray-100 px-3 py-3 grid grid-cols-4 gap-4 items-center">
            <div className="h-5 w-6 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-10 bg-gray-100 rounded animate-pulse hidden sm:block" />
            <div className="h-5 w-12 bg-green-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
