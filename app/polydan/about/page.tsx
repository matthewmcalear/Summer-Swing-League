import Link from 'next/link'

export const metadata = { title: 'PolyDan · How it works' }

function Block({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="pd-card scroll-mt-24 space-y-2 p-4 sm:p-5">
      <h2 className="font-pd-display text-xl font-semibold uppercase tracking-wide">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-pd-ink-2">{children}</div>
    </section>
  )
}

const B = ({ children }: { children: React.ReactNode }) => <span className="font-semibold text-pd-ink">{children}</span>

// Static: no request data, so no auth check or Suspense boundary needed here.
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="pd-eyebrow">How it works</p>
        <h1 className="font-pd-display text-4xl font-bold uppercase tracking-wide">PolyDan in two minutes</h1>
        <p className="mt-1 text-sm text-pd-ink-2">
          PolyDan is the family&apos;s betting market for Iron Man. You bet real dollars on what happens: who wins, who
          goes out, who outlasts who.
        </p>
      </header>

      <Block title="Getting money in and out">
        <p>
          Pay Matt in real life and he adds it to your balance. Your balance is at the top right. At the end of the
          event every bet is paid out, and Matt pays you whatever your balance says.
        </p>
      </Block>

      <Block title="What a bet is">
        <p>
          Every market is a question with two or more answers. When you bet on an answer you buy <B>shares</B> in it.
          Each share pays <B>$1 if that answer is right</B> and $0 if it&apos;s wrong.
        </p>
        <p>
          The <B>price</B> of a share is the market&apos;s current chance for that answer. A 25% answer costs about 25¢
          a share, so a winning $10 bet pays about $40. The &quot;pays 4×&quot; next to each answer is that same
          number.
        </p>
        <p>The bet box shows exactly what you&apos;d win before you confirm.</p>
      </Block>

      <Block title="Why the odds move">
        <p>
          There&apos;s no bookie setting lines. <B>Every bet moves the price.</B> Money on an answer pushes its chance
          up and the others down, so the odds are always the family&apos;s combined opinion. Bigger bets move it more,
          which also means a big bet gets a slightly worse price than a small one.
        </p>
        <p>
          Opening odds come from past Iron Mans: how far each person usually gets, with recent years counting more and
          past champions getting a boost.
        </p>
      </Block>

      <Block title="Selling early">
        <p>
          You don&apos;t have to wait for the result. If the price has gone up since you bought, you can <B>sell</B> on
          the market page and take the profit now. If it&apos;s gone down you can sell to cut your loss.
        </p>
        <p>
          Your <Link href="/polydan/portfolio" className="text-pd-gold underline">portfolio</Link> values each bet at
          what it would sell for right now.
        </p>
      </Block>

      <Block title="The kinds of market">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <B>Winner:</B> pick who wins Iron Man. People who are out drop off and the rest get more likely.
          </li>
          <li>
            <B>How far they go:</B> will someone finish in the top 10, top 3 and so on. Bet yes or no.
          </li>
          <li>
            <B>Head to head:</B> which of two people lasts longer. If they finish level, each side pays half.
          </li>
          <li>
            <B>This round:</B> who loses the next event, who goes to Redemption Island first, who is out for good
            first. These settle as soon as the round is recorded. If two people lose together, each pays half.
          </li>
          <li>
            <B>Copper Cup:</B> who scores the most points across the Copper Cup events. It&apos;s a side prize;
            everyone plays those events, even people who are out.
          </li>
          <li>
            <B>Props:</B> anything else, settled by Matt. You can{' '}
            <Link href="/polydan/suggest" className="text-pd-gold underline">suggest your own</Link>.
          </li>
        </ul>
      </Block>

      <Block title="When bets lock and pay">
        <p>
          Betting stays open during the event. A market <B>locks the moment its result is certain</B>, for example when
          the person you bet on is knocked out, so nobody can bet on a sure thing.
        </p>
        <p>
          Winnings are added to your balance when Matt settles the market. If a market has to be cancelled, everyone
          gets their stake back.
        </p>
      </Block>

      <Block title="How Iron Man 10 runs">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>20 players, 17 events, last one standing wins. The events are secret until they&apos;re played.</li>
          <li>
            In events 1 to 7 the losers go to <B>Redemption Island</B>, where they play to stay alive. Event 8 is the
            island finale: two islanders get back into the game and the rest are out.
          </li>
          <li>From event 9 on, one person goes out each event until two are left for the final.</li>
          <li>
            Whoever does best in event 1 wins an <B>immunity idol</B>. It can be played before one of events 2 to 7 to
            be safe that round. It can&apos;t be given away or used on the island.
          </li>
          <li>People who go out in the same round share a place, unless Steven splits them by score.</li>
        </ul>
      </Block>

      <Block title="Fair play" id="rules">
        <p>
          <B>PolyDan is here to add to the fun.</B> It isn&apos;t for making anyone rich, and it isn&apos;t for
          exploiting the system or each other.
        </p>
        <p>
          Bet what you&apos;re happy to lose. Any question about a result goes to Steven; any question about money goes
          to Matt.
        </p>
        <p>
          <B>No manipulating markets.</B> Anyone found betting on themselves and purposely manipulating a market, for
          example betting that they&apos;ll lose and then throwing the event, will be <B>banned and will not get their
          money back</B>.
        </p>
      </Block>

      <Block title="The fine print">
        <p>
          PolyDan is a <B>prototype</B> and it may have bugs. Matt has the right to <B>cancel all bets and refund
          everyone, for any reason</B>.
        </p>
      </Block>
    </div>
  )
}
