import Link from 'next/link'

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="pd-card p-4 sm:p-5">
      <h2 className="flex items-baseline gap-3 font-pd-display text-xl font-semibold uppercase tracking-wide">
        <span className="pd-num text-pd-gold">{n}</span>
        {title}
      </h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-pd-ink-2">{children}</div>
    </section>
  )
}

const B = ({ children }: { children: React.ReactNode }) => <span className="font-semibold text-pd-ink">{children}</span>
const List = ({ children }: { children: React.ReactNode }) => <ol className="list-decimal space-y-1.5 pl-5">{children}</ol>
const Dots = ({ children }: { children: React.ReactNode }) => <ul className="list-disc space-y-1.5 pl-5">{children}</ul>

function T({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-pd-gold underline">
      {children}
    </Link>
  )
}

/** The admin's run sheet for the day of the event. Static; only admins reach this tab. */
export function GuideTab({ tabHref }: { tabHref: (tab: 'setup' | 'players' | 'markets' | 'results') => string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-sm text-pd-ink-2">
        Your run sheet for the day. The short version: <B>take money → record each round → settle → pay people</B>.
      </p>

      <Step n="1" title="Before the first event">
        <List>
          <li>
            Put the <Link href="/polydan/tv" className="font-semibold text-pd-gold underline">TV dashboard</Link> on the
            big screen from a laptop and press F for full screen. It updates on its own.
          </li>
          <li>
            Get people signed up: they open <B>sslgolf.com/polydan</B> on their phone, tap Join and pick a PIN. New
            accounts start at $0.
          </li>
          <li>
            As each person pays you, credit them in <T href={tabHref('players')}>Players &amp; money</T> (see “Tracking the money”
            below).
          </li>
          <li>
            When Steven announces event 1, tick <B>Revealed</B> on it in <T href={tabHref('setup')}>Setup</T> and save. Until then
            the family sees no event names.
          </li>
          <li>
            Check <T href={tabHref('markets')}>Markets</T> for suggestions waiting (red badge) and approve or reject them.
          </li>
        </List>
      </Step>

      <Step n="2" title="Every round">
        <p>
          All of this is in <T href={tabHref('results')}>Results</T>, which is where Admin opens once the event is live.
        </p>
        <List>
          <li>
            <B>Before the event starts:</B> if someone plays their immunity idol, log “played the idol” for this round.
            They then can’t be marked as losing it.
          </li>
          <li>
            <B>Optional:</B> pause “Who loses round N?” in <T href={tabHref('markets')}>Markets</T> when the event starts, so nobody
            bets while watching it.
          </li>
          <li>
            <B>When the event ends:</B> in “Record a round”, tap what happened to each person who lost:
            <Dots>
              <li>
                <B>Island</B> for a main-game loser while Redemption Island is open (events 1–7). A tie for last sends
                both.
              </li>
              <li>
                <B>Out</B> for someone eliminated for good, and <B>Returns</B> for an islander who gets back in.
              </li>
              <li>
                If two go out together, an order box appears. Leave it on “Shared place” unless Steven ranks them by
                score.
              </li>
            </Dots>
          </li>
          <li>
            Press <B>Record</B>. The standings, TV and odds update, decided markets lock, the next event is revealed,
            and “Who loses round N+1?” opens on its own.
          </li>
          <li>
            <B>Copper Cup events (1–6 and 11):</B> open that event in the Copper Cup box and type everyone’s points,
            including people who are out. The scoring rule is shown above the boxes.
          </li>
          <li>
            Press <B>Settle all decided</B> in <T href={tabHref('markets')}>Markets</T> whenever you like. It pays out every market
            whose result is in, so round winners get their money straight away.
          </li>
        </List>
        <p>
          After event 1, log “won the idol” for whoever Steven gives it to. Event 8 is the island finale: mark two
          islanders <B>Returns</B> and the other four <B>Out</B>; nobody in the main game is touched.
        </p>
      </Step>

      <Step n="3" title="Tracking the money">
        <Dots>
          <li>
            <B>Someone pays you:</B> <T href={tabHref('players')}>Players &amp; money</T> → open their name → Credit, type the
            amount. Add a note like “e-transfer” or “cash” if you want a record of how.
          </li>
          <li>
            <B>Someone wants cash back mid-event:</B> same place → Cash out, then hand them the money.
          </li>
          <li>
            <B>Where you stand:</B> the Settle up table at the top of that tab lists what each person put in, what
            they’re up or down, and what you’d pay them. The line under it says whether the house (you) is up or down.
          </li>
          <li>
            <B>Your exposure:</B> the House risk card in <T href={tabHref('markets')}>Markets</T> shows the worst case across open
            markets. After opening new markets, “Retune unbet markets” trims it.
          </li>
          <li>
            The money you’re holding should always equal the <B>Put in</B> total. If it doesn’t, a credit was missed or
            typed twice.
          </li>
        </Dots>
      </Step>

      <Step n="4" title="Ending the event">
        <List>
          <li>Record the final round. The champion is crowned and the edition is marked finished.</li>
          <li>
            Enter the last Copper Cup points and press <B>Finalize Copper Cup</B> in <T href={tabHref('results')}>Results</T>.
          </li>
          <li>
            In <T href={tabHref('markets')}>Markets</T>, pick the winner on any prop you settle by hand, then press{' '}
            <B>Settle all decided</B>. Void anything that can’t be decided; that refunds the stakes.
          </li>
          <li>
            In <T href={tabHref('players')}>Players &amp; money</T>, the Settle up table now shows a final <B>Pay them</B> amount for
            each person. Pay everyone.
          </li>
          <li>
            Press <B>Mark everyone as paid</B>. Balances go to $0 and the books are closed. It stays greyed out until
            every market is settled or voided.
          </li>
        </List>
      </Step>

      <Step n="5" title="When something goes wrong">
        <Dots>
          <li>
            <B>Recorded the wrong person:</B> “Undo last” at the top of the log in <T href={tabHref('results')}>Results</T> removes the
            last result, one at a time. Do it before settling: once a market has paid out, a change that would alter it
            is refused.
          </li>
          <li>
            <B>Forgot someone in a round:</B> set the round number back to that round and record just them.
          </li>
          <li>
            <B>Steven changes the event order:</B> use Move up / Move down in <T href={tabHref('setup')}>Setup</T>, then check
            Redemption Island is still ticked on events 1–7 only and Copper Cup on the right ones.
          </li>
          <li>
            <B>Someone forgot their PIN:</B> <T href={tabHref('players')}>Players &amp; money</T> → their name → Reset PIN.
          </li>
          <li>
            <B>A market is causing an argument:</B> “Pause trading” on it, or Void it to give everyone their stake back.
          </li>
          <li>
            <B>Credited the wrong amount:</B> cash out the difference on the same person.
          </li>
        </Dots>
      </Step>
    </div>
  )
}
