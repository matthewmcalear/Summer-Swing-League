# Westmount draft room

Live app: https://sslgolf.com/westmount-draft.html

The static entry page is `public/westmount-draft.html`; scripts, styles and printable PDFs are under `public/westmount-draft/`. Script URLs have content-hash query strings to refresh cached copies after updates. Keep the deferred order: data, engine, app. The existing Heroku integration deploys GitHub `main`.

For a local preview run `python3 -m http.server 8765 --directory public` and open http://localhost:8765/westmount-draft.html. State is saved only in the current browser and origin; use Save backup / Restore backup to transfer a draft.

## Draft-night setup

1. Set the first-round order before recording picks. The existing order is provisional, and reverses on each round.
2. Keane must draft himself in round 1. Negotiate the other captains’ rounds, enter them under **Draft setup**, and mark **Agreed**. Unagreed defaults are planning assumptions; only previews and recommendations follow those defaults automatically.
3. Confirm the number of rounds. Fourteen is last year’s length, not an announced 2026 rule. With 82 listed players, there are fewer players than 84 slots.
4. Confirm goalie attendance. The workbook has six names, including Josh Pinto with “Waiting for info”; the admin email reports two vacancies. The planner includes all six listed goalies, with one goalie per team. Update `data.js` if registration changes before the draft.
5. Use explicit **Draft** buttons to record the actual selection. Undo reverses the last turn. Star players to edit Steve’s target list.

**Preview full draft** continues from current picks without changing the live draft. **Simulations** samples possible continuations under the same captain and roster rules. Both stop when the player pool or the configured rounds are exhausted. A turn can be passed only when no legal player remains for that team.

## Recommendation model

Captains are always reserved for their own teams, and each self-pick consumes a snake pick. Agreed rounds apply to manual selections, recommendations, simulations, and restored backups. A captain cannot be left out of his team’s final available slot.

Player values blend recent scoring rate with the existing five-year rate, adjust for position and attendance, and use neutral positional estimates for missing statistics. Goalie values use the gap from median GAA. These are comparison scores, not predicted season points. The five-year sample may contain the recent season; the two rates are blended as overlapping evidence, not counted as independent samples.

The previous five-team draft supplies a weak demand estimate after scaling historical overall picks by 6/5. Target urgency uses the actual number of opponent picks before Steve’s next open turn, accounting for scheduled self-picks and goalie reservations. The survival calculation is a conditional rank-based estimate, not an empirically calibrated probability. Targets receive a modest preference plus an additional urgency bonus when waiting is risky. There are no fixed rounds for Tom, Matt or Dan.

The default target IDs are Christopher Ong Tone (OT), David Toledano (DT), Peter, Thomas, Matthew and Daniel McAlear. DT is inferred from the supplied initials and last year’s Yeti roster. Other players can be added using the stars.

Simulation shares report who has the highest total model score in those simulated drafts. They do not estimate the chance of winning the league.

## Source and code notes

- `data.js`: all 82 names from **Updated - Senior Draft List.xlsx**, sheet **Senior Draft List**, rows 2–77 and 80–85; statistics retained from the previous app. Three “Any” positions now use F/D. Balazinski’s historical round is 14 from the supplied draft image; the conflicting workbook round 4 is noted in his record.
- `draft-engine.js`: pure draft rules, recommendations, simulations and saved-state validation.
- `app.js`, `styles.css`, `index.html`: browser interface and local backup/restore.
- The app reads `public/westmount-draft/data.js`. The updated printable cheat sheet and Steven’s guide are linked in the app.
- The linked Google Sheet was not accessible during this update. No live sync is performed.
- New drafts use storage key `wsl-draft-2026-v2`. Older `wsl-draft-v18`, `wsl-draft-v17`, and `wsl-draft-v16` entries are preserved and checked newest first. Compatible histories can migrate; histories violating the captain rules remain available for download instead of being silently accepted.

## Verification

```sh
node --test tests/westmount-draft/*.test.cjs
node --check public/westmount-draft/app.js
```

Tests cover every snake slot and round reversal, mandatory and negotiated self-picks, captain ownership, duplicate picks, goalie limits, final-slot obligations, target horizons, draft continuations, and saved-state validation.
