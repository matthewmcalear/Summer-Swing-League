import Link from 'next/link'
import { Trophy } from 'lucide-react'

/** Shown in place of the round forms once the season is final and prizes are paid. */
export default function SeasonClosed() {
  return (
    <div className="max-w-xl mx-auto card text-center py-10 px-6">
      <span className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-brass-50 border border-brass-200 text-brass-600">
        <Trophy size={26} aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900">The 2026 season is closed</h1>
      <p className="mt-2 text-gray-600">
        Final standings are locked and prizes have been paid. Thanks for a great summer — see you in 2027.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2">
        <Link href="/standings" className="btn-primary">Final standings</Link>
        <Link href="/season" className="btn-secondary">Season recap</Link>
      </div>
    </div>
  )
}
