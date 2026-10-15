// Steven's schedule as the family sees it: revealed events only, the one
// being played now highlighted, and a count of what's still secret.

interface PublicEvent {
  id: number
  seq: number
  name: string
  description: string | null
  islandOpen: boolean
  copperCup: boolean
}

export function EventTags({
  event,
  className = 'text-xs',
}: {
  event: Pick<PublicEvent, 'islandOpen' | 'copperCup'>
  className?: string
}) {
  return (
    <span className={`flex flex-wrap gap-x-3 gap-y-0.5 font-medium ${className}`}>
      <span className={event.islandOpen ? 'text-pd-island' : 'text-pd-no'}>
        {event.islandOpen ? '🏝 Island open' : '🚫 No island'}
      </span>
      {event.copperCup && <span className="text-pd-gold">🥉 Copper Cup</span>}
    </span>
  )
}

export function EventsCard({
  visible,
  current,
  hidden,
  total,
}: {
  visible: PublicEvent[]
  current: PublicEvent | null
  hidden: number
  total: number
}) {
  if (!total) return null
  const past = visible.filter((e) => e !== current && (!current || e.seq < current.seq))
  const ahead = visible.filter((e) => current && e.seq > current.seq)
  return (
    <section className="pd-card space-y-3 p-4">
      <h2 className="pd-eyebrow">Events · {total}</h2>
      {current && (
        <div className="rounded-lg border-[1.5px] border-pd-gold bg-pd-surface-2 p-3">
          <p className="pd-eyebrow text-pd-gold">Now · event {current.seq}</p>
          <p className="mt-0.5 font-pd-display text-xl font-semibold uppercase tracking-wide">{current.name}</p>
          {current.description && <p className="text-sm text-pd-muted">{current.description}</p>}
          <div className="mt-1.5">
            <EventTags event={current} />
          </div>
        </div>
      )}
      {(past.length > 0 || ahead.length > 0 || hidden > 0) && (
        <ol className="space-y-1.5 text-sm">
          {[...past].reverse().map((e) => (
            <li key={e.id} className="flex items-baseline gap-2 text-pd-muted">
              <span className="pd-num w-6 text-right">{e.seq}</span>
              <span className="line-through decoration-pd-line-strong">{e.name}</span>
            </li>
          ))}
          {ahead.map((e) => (
            <li key={e.id} className="flex items-baseline gap-2">
              <span className="pd-num w-6 text-right text-pd-muted">{e.seq}</span>
              <span className="font-medium">{e.name}</span>
              <EventTags event={e} />
            </li>
          ))}
          {hidden > 0 && (
            <li className="flex items-baseline gap-2 text-pd-muted">
              <span className="w-6 text-right">🔒</span>
              {hidden} more event{hidden > 1 ? 's' : ''} to be revealed as people go out
            </li>
          )}
        </ol>
      )}
    </section>
  )
}

export function CopperCard({ rows, final }: { rows: { id: number; name: string; points: number }[]; final: boolean }) {
  const scored = rows.filter((r) => r.points !== 0)
  if (!scored.length) return null
  return (
    <section className="pd-card p-4">
      <h2 className="pd-eyebrow mb-2">🥉 Copper Cup {final ? '· final' : '· standings'}</h2>
      <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {scored.slice(0, 10).map((r, i) => (
          <li key={r.id} className="flex gap-2">
            <span className="pd-num w-5 text-pd-muted">{i + 1}</span>
            <span className={i === 0 ? 'font-semibold' : ''}>{r.name}</span>
            <span className="pd-num ml-auto font-semibold">{r.points}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
