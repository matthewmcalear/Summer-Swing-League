import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, CalendarDays, Clock, Info, LayoutGrid, Share2, Sparkles, Undo2, Users } from 'lucide-react'
import { SKILLS, SKILL_POINTS, type Skill } from '@/lib/yeti/model'
import { YetiMark } from '../ui'

export const metadata: Metadata = {
  title: 'How Yeti Lines works',
  description: 'A guide to every screen of Yeti Lines: lines, roster, games and the team sheet, and what everything on them means.',
}

function Pips({ skill }: { skill: Skill }) {
  return (
    <span className="yt-pips" aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <i key={i} data-on={i <= SKILL_POINTS[skill] || undefined} />
      ))}
    </span>
  )
}

/** A static, non-interactive player card for the examples. */
function SampleChip({ name, number, skill, pos, maybe, fit }: { name: string; number: string; skill: Skill; pos: string; maybe?: boolean; fit?: 'stretch' }) {
  return (
    <span className="yt-chip yt-help-chip" data-skill={skill} data-fit={fit} data-att={maybe ? 'maybe' : 'in'} aria-hidden="true">
      <span className="yt-chip-top">
        <span className="yt-chip-num">{number}</span>
        <Pips skill={skill} />
      </span>
      <span className="yt-chip-name">{name}</span>
      <span className="yt-chip-pos" data-fit={fit}>
        {pos}
        {fit ? ' ↺' : ''}
      </span>
      {maybe && <span className="yt-chip-maybe">?</span>}
    </span>
  )
}

export default function YetiHelpPage() {
  return (
    <>
      <header className="yt-header">
        <div className="yt-header-inner">
          <Link href="/yeti" className="yt-back" aria-label="Back to the lines">
            <ArrowLeft size={20} aria-hidden="true" />
            <YetiMark />
            <span>YETI</span>
          </Link>
          <span className="yt-header-title">How it works</span>
        </div>
      </header>

      <div className="yt-main yt-help">
        <h1>How Yeti Lines works</h1>
        <p className="yt-help-lead">
          One shared board for setting the Yeti’s lines every game. Everyone who opens <b>sslgolf.com/yeti</b> sees the same board, and a change on one phone
          shows up on the others within a few seconds. There’s nothing to save — every change is saved as you make it.
        </p>

        <nav className="yt-help-toc" aria-label="On this page">
          <a href="#top-bar">Top bar</a>
          <a href="#lines">Lines</a>
          <a href="#cards">Player cards</a>
          <a href="#strength">Line strength</a>
          <a href="#warnings">Warnings</a>
          <a href="#tools">Auto lines &amp; sharing</a>
          <a href="#roster">Roster</a>
          <a href="#games">Games</a>
          <a href="#privacy">Who sees what</a>
        </nav>

        <section id="top-bar">
          <h2>The top bar</h2>
          <dl className="yt-help-list">
            <dt>Game button</dt>
            <dd>Shows the game you’re working on (date and opponent). Tap it to pick another game. The page always opens on today’s game, or the next one.</dd>
            <dt>
              <span className="yt-help-dot" data-status="live" /> Sync dot
            </dt>
            <dd>
              <b>Green</b> — saved and live. <b>Blue, pulsing</b> — saving. <b>Amber</b> — no connection; your changes are kept on your phone and sent when you’re back online.{' '}
              <b>Red</b> — a change couldn’t be saved (it’s undone automatically).
            </dd>
            <dt>
              <Undo2 size={16} aria-hidden="true" /> Undo
            </dt>
            <dd>Takes back your own last changes, one at a time. It switches off when someone else changes the board, so you can never wipe out their work.</dd>
          </dl>
        </section>

        <section id="lines">
          <h2>
            <LayoutGrid size={19} aria-hidden="true" /> Lines
          </h2>
          <p>The main screen. From the top:</p>
          <ul>
            <li>
              <Clock size={14} aria-hidden="true" /> <b>Game details</b> — puck drop, rink, opponent, and whether the Yeti are <b>Home</b> or <b>Away</b> (“vs” = home, “@” = away).
            </li>
            <li>
              <b>Attendance</b> — how many are <span className="yt-help-att" data-att="in">in</span>, <span className="yt-help-att" data-att="maybe">unconfirmed</span> and{' '}
              <span className="yt-help-att" data-att="out">out</span>, and how many spots are filled.
            </li>
            <li>
              <b>Warnings</b> — things to fix (see below). Tap one about a player to pick that player up.
            </li>
            <li>
              <b>Forwards</b> — lines L1–L3, each Left wing, Centre, Right wing. <b>Defence</b> — pairs D1–D2, Left D and Right D. <b>Goalie</b>.
            </li>
            <li>
              <b>Bench and Out</b> (bottom of the screen) — <i>Bench</i> is everyone available who isn’t in a spot; <i>Out</i> is everyone not coming to this game.
            </li>
          </ul>
          <h3>Moving players</h3>
          <ul>
            <li>
              <b>Drag:</b> press and hold a player for a moment, then drag him to a spot. A quick swipe still scrolls the page.
            </li>
            <li>
              <b>Tap:</b> tap a player (he lifts up), then tap the spot. Tap him again to put him down.
            </li>
            <li>Dropping on another player swaps the two. Dropping on an empty spot moves him there.</li>
            <li>
              While dragging, the bottom turns into two targets: <b>Bench</b> (take him out of the lineup) and <b>Out</b> (mark him out for this game, which also frees his spot).
              After a tap, the same choices are buttons, plus <b>Edit</b> for his details.
            </li>
            <li>Dragging someone from Out into a spot marks him in.</li>
            <li>
              Tap a line’s name (<b>L1</b>, <b>D2</b>…) to move the whole line up or down, or clear it.
            </li>
          </ul>
        </section>

        <section id="cards">
          <h2>Player cards</h2>
          <div className="yt-help-cards">
            <SampleChip name="Owen" number="–" skill="Elite" pos="F" />
            <SampleChip name="Steven" number="13" skill="Good" pos="F/D" />
            <SampleChip name="Jeff" number="15" skill="Mid" pos="D" />
            <SampleChip name="Liam" number="18" skill="Low" pos="F" />
          </div>
          <ul>
            <li>
              <b>Number</b> top left, <b>name</b>, and <b>position</b>: F forward, D defence, F/D either, G goalie.
            </li>
            <li>
              <b>Color and dots = skill.</b> {SKILLS.map((s, i) => `${s} ${'●'.repeat(SKILL_POINTS[s])}${i < SKILLS.length - 1 ? ', ' : ''}`)}. On a light screen darker is stronger; in
              dark mode brighter is stronger. The dots always tell you.
            </li>
          </ul>
          <div className="yt-help-cards">
            <SampleChip name="Matt" number="3" skill="Good" pos="F/D" maybe />
            <SampleChip name="Hugo" number="5" skill="Low" pos="D" fit="stretch" />
          </div>
          <ul>
            <li>
              An orange <b>?</b> means he hasn’t confirmed for this game.
            </li>
            <li>
              An amber outline and <b>↺</b> means he’s out of position (a D playing forward, or an F on D). Red means a goalie skating or a skater in net.
            </li>
          </ul>
        </section>

        <section id="strength">
          <h2>Line strength</h2>
          <p>
            Each skill level is worth points: <b>Elite 4 · Good 3 · Mid 2 · Low 1</b>. A line’s strength is the <b>average</b> of the players on it — the number and bar under
            L1, L2… An average (rather than a total) keeps a line with an empty spot comparable to a full one.
          </p>
          <p>
            Next to Forwards and Defence, <span className="yt-spread" data-level="even">Even</span> means the strongest and weakest lines are within half a point;{' '}
            <span className="yt-spread" data-level="uneven">Gap 1.0</span> shows the difference when they aren’t.
          </p>
        </section>

        <section id="warnings">
          <h2>Warnings</h2>
          <dl className="yt-help-list">
            <dt>
              <AlertTriangle size={15} aria-hidden="true" /> “… is in but not in the lineup”
            </dt>
            <dd>He said he’s coming but has no spot (this was the “Allocated” column in the old spreadsheet).</dd>
            <dt>
              <AlertTriangle size={15} aria-hidden="true" /> “… isn’t in net” / “No goalie”
            </dt>
            <dd>The net is empty. If no goalie is available, find a sub.</dd>
            <dt>
              <Info size={15} aria-hidden="true" /> “… is playing up front / on D”
            </dt>
            <dd>Someone is out of position — fine if it’s on purpose.</dd>
            <dt>
              <Info size={15} aria-hidden="true" /> “Open spots and nobody left on the bench”
            </dt>
            <dd>Not enough players for every spot — a line plays short, or change the number of lines.</dd>
            <dt>
              <Info size={15} aria-hidden="true" /> “L1 is much stronger than L3”
            </dt>
            <dd>The lines are uneven by a point or more.</dd>
            <dt>
              <Info size={15} aria-hidden="true" /> “… haven’t confirmed”
            </dt>
            <dd>Players in the lineup who are still unconfirmed for this game.</dd>
          </dl>
          <p>The red number on the Lines tab counts the red warnings; the one on Roster counts unconfirmed players.</p>
        </section>

        <section id="tools">
          <h2>Auto lines and sharing</h2>
          <dl className="yt-help-list">
            <dt>
              <Sparkles size={15} aria-hidden="true" /> Auto lines
            </dt>
            <dd>
              <b>Fill open spots</b> keeps everyone where they are and puts bench players in the holes. <b>Rebuild all lines</b> re-balances every line from scratch: it keeps
              positions (F/D can go anywhere), evens out line strength, prefers confirmed players and moves as few people as it can. <b>Clear the lineup</b> sends everyone to
              the bench. All of them can be undone.
            </dd>
            <dt>
              <Users size={15} aria-hidden="true" /> Team sheet
            </dt>
            <dd>
              The lines with just names and numbers — no skill levels, colors, strength or warnings — sized to fit one phone screen. Take a screenshot and post it in the team
              WhatsApp. Tap the ✕ to go back.
            </dd>
            <dt>
              <Share2 size={15} aria-hidden="true" /> Share text
            </dt>
            <dd>The same lines as plain text (also no skill levels), to copy or send.</dd>
            <dt>3F · 2D</dt>
            <dd>How many forward lines (2–4) and D pairs (2–3) this game has. Removing a line sends its players to the bench.</dd>
            <dt>New game with no lines</dt>
            <dd>A card offers to copy the last game’s lines (anyone marked out is left off) or build them with Auto lines.</dd>
          </dl>
        </section>

        <section id="roster">
          <h2>
            <Users size={19} aria-hidden="true" /> Roster
          </h2>
          <ul>
            <li>
              Everyone on the team with <b>In / ? / Out</b> for the game you’re on. “?” means not confirmed yet. <b>Mark everyone unconfirmed as in</b> does it in one tap.
            </li>
            <li>
              Under each name: skill, position and where he’s playing (e.g. “L2 C”). <span className="yt-help-warn">Not in the lineup</span> in red means he’s in but has no spot.
            </li>
            <li>
              <b>Tap a player</b> to change his name, number, skill or position, mark him in or out, take him out of the lineup, or remove him from the roster (removing takes
              him off every game; you can undo).
            </li>
            <li>
              <b>Add a player or sub</b> at the bottom. He appears on the bench, ready to drag in.
            </li>
            <li>Sort by lines, skill, number or name.</li>
          </ul>
        </section>

        <section id="games">
          <h2>
            <CalendarDays size={19} aria-hidden="true" /> Games
          </h2>
          <ul>
            <li>
              The rest of the 2026-27 regular season is loaded from the league schedule, by month, with time, rink, opponent and Home/Away. <b>Today</b> marks tonight’s game.
            </li>
            <li>
              Every game keeps its own attendance and lines, so you can plan Thursday while Tuesday stays as it was. New games start with everyone unconfirmed and no lines.
            </li>
            <li>Tap a game to open it; tap the pencil to change its date, time, rink, opponent or home/away, or delete it.</li>
            <li>
              <b>New game</b> is for playoffs or anything extra.
            </li>
            <li>League rule: players need 60% of regular-season games (23 of 38) to play in the playoffs.</li>
          </ul>
        </section>

        <section id="privacy">
          <h2>Who sees what</h2>
          <ul>
            <li>
              Anyone with the link can see and change everything here, including skill levels — so keep <b>sslgolf.com/yeti</b> between the people setting the lines.
            </li>
            <li>
              For the wider group, post a <b>Team sheet</b> screenshot or the <b>Share text</b>; neither shows skill levels.
            </li>
            <li>The page is hidden from search engines and isn’t linked from the rest of the site.</li>
          </ul>
        </section>

        <p className="yt-help-back">
          <Link href="/yeti" className="yt-btn" data-primary>
            <ArrowLeft size={17} aria-hidden="true" /> Back to the lines
          </Link>
        </p>
      </div>
    </>
  )
}
