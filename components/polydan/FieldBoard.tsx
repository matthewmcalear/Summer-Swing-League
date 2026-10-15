import type { Standing } from '@/lib/polydan/standings'
import { formatOrdinal } from '@/lib/polydan/money'

interface Entry {
  id: number
  name: string
  standing: Standing
}

/** Who's still in, who's on Redemption Island, and the order people went out. */
export function FieldBoard({ field, idolHolders = [] }: { field: Entry[]; idolHolders?: number[] }) {
  const inGame = field.filter((c) => c.standing.status === 'IN')
  const island = field.filter((c) => c.standing.status === 'ISLAND')
  const out = field
    .filter((c) => c.standing.status === 'OUT')
    .sort((a, b) => a.standing.position! - b.standing.position!)

  return (
    <section className="pd-card space-y-4 p-4">
      <div>
        <p className="pd-eyebrow mb-2">Still standing · {inGame.length}</p>
        <div className="flex flex-wrap gap-1.5">
          {inGame.map((c) => (
            <span
              key={c.id}
              className={`rounded-full border px-2.5 py-1 text-sm ${
                c.standing.position === 1 ? 'border-pd-gold bg-pd-gold text-pd-on-gold font-semibold' : 'border-pd-line-strong'
              }`}
            >
              {c.standing.position === 1 ? `⚜ ${c.name}` : c.name}
              {idolHolders.includes(c.id) && <span title="Has the immunity idol"> 🗿</span>}
            </span>
          ))}
          {!inGame.length && <span className="text-sm text-pd-muted">Nobody yet</span>}
        </div>
      </div>
      {island.length > 0 && (
        <div>
          <p className="pd-eyebrow mb-2">Redemption Island · {island.length}</p>
          <div className="flex flex-wrap gap-1.5">
            {island.map((c) => (
              <span key={c.id} className="rounded-full bg-pd-island-soft px-2.5 py-1 text-sm text-pd-island">
                🏝 {c.name}
                {idolHolders.includes(c.id) && <span title="Has the immunity idol"> 🗿</span>}
              </span>
            ))}
          </div>
        </div>
      )}
      {out.length > 0 && (
        <div>
          <p className="pd-eyebrow mb-2">Out · {out.length}</p>
          <div className="flex flex-wrap gap-1.5">
            {out.map((c) => (
              <span key={c.id} className="rounded-full bg-pd-surface-2 px-2.5 py-1 text-sm text-pd-muted">
                <span className="pd-num">{formatOrdinal(c.standing.position!)}</span> {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {idolHolders.length > 0 && (
        <p className="text-sm">
          🗿 <span className="font-semibold">{field.filter((c) => idolHolders.includes(c.id)).map((c) => c.name).join(' & ')}</span>{' '}
          {idolHolders.length > 1 ? 'hold' : 'holds'} an immunity idol — safe from elimination for one round when played.
        </p>
      )}
    </section>
  )
}
