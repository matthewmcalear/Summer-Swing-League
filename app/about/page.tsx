import Link from 'next/link'

export default function About() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">About</h1>

      <div className="card space-y-5 text-gray-600 text-sm leading-relaxed">
        <p>
          <strong>Summer Swing League</strong> is a casual but competitive golf league that runs every summer.
          The goal is simple: get a group of friends out on the course as often as possible, track your progress,
          and walk away with some cash at the end of the season.
        </p>
        <p>
          The league is designed to be completely flexible. You can play any public or private course you want,
          anytime between April 15 and October 10. The only requirement is that at least one other registered
          member is in your group.
        </p>
        <p>
          The handicap system ensures everyone competes on a level playing field — whether you shoot 75 or 105,
          your adjusted points will reflect how well you played relative to your skill level.
        </p>
        <p>
          This is the <strong>2026 season</strong>. Check the standings, submit your rounds, and may the best
          golfer win!
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/register" className="btn-primary">Join the League</Link>
          <Link href="/rules"    className="btn-secondary">Read the Rules</Link>
        </div>
      </div>
    </div>
  )
}
