/** Placeholder for a page's live content while it streams in (usually a few ms). */
export default function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-gray-200" />
        <div className="h-9 w-56 rounded-lg bg-gray-200" />
      </div>
      <div className="card h-40" />
      <div className="card h-72" />
    </div>
  )
}
