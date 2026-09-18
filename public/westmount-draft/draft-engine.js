/*
 * Westmount draft model. No DOM, storage, network, or external dependencies.
 * Rules: six-team snake; captains belong to their own teams and cost a pick;
 * Keane is a confirmed round-one self-pick. Other self-pick rounds are editable
 * planning assumptions until confirmed. A team may draft at most one goalie.
 * Estimates: scoring is a scouting aid, not a prediction of season wins. Last
 * year's five-team draft is a weak prior, not ADP. Unknown players receive a
 * neutral positional prior. Target survival is an uncalibrated market model.
 */
(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.DraftEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TEAMS = Object.freeze(['Kings', 'Hawks', 'Devils', 'Yeti', 'Lightning', 'Coyotes']);
  const CAPTAIN_IDS = Object.freeze({
    Yeti: 'McAlear, Steven', Devils: 'Murciano, Emile', Kings: 'Mashaal, Alexander',
    Lightning: 'Martin, Philippe', Hawks: 'Ciampini, Adam', Coyotes: 'Kelly-Menard, Keane',
  });
  const DEFAULT_TARGETS = Object.freeze([
    'Ong Tone, Christopher', 'Toledano, David', 'McAlear, Peter',
    'McAlear, Thomas', 'McAlear, Matthew', 'McAlear, Daniel',
  ]);
  const OWNERS = new Map(Object.entries(CAPTAIN_IDS).map(([team, id]) => [id, team]));
  const DEFAULT_ORDER = ['Lightning', 'Kings', 'Coyotes', 'Devils', 'Yeti', 'Hawks'];
  const models = new WeakMap();
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const isNumber = value => typeof value === 'number' && Number.isFinite(value);
  const clone = value => JSON.parse(JSON.stringify(value));
  const isGoalie = p => p.role === 'goalie' || p.pos === 'G';
  const shortName = p => (p.name || p.id).split(',').reverse().map(s => s.trim()).join(' ');

  function createState() {
    return {
      version: 2,
      config: {
        order: DEFAULT_ORDER.slice(), rounds: 14,
        captainRounds: { Yeti: 2, Kings: 3, Hawks: 9, Devils: 11, Lightning: 10, Coyotes: 1 },
        confirmedCaptainRounds: { Yeti: true, Kings: true, Hawks: true, Devils: true, Lightning: true, Coyotes: true },
        targets: DEFAULT_TARGETS.slice(), prioritizeTargets: true, useHistory: true,
      },
      history: [],
    };
  }

  function teamAtPick(index, order = DEFAULT_ORDER) {
    if (!Number.isInteger(index) || index < 0) return null;
    const round = Math.floor(index / TEAMS.length), slot = index % TEAMS.length;
    let team = order[round % 2 ? TEAMS.length - 1 - slot : slot];
    // Yeti↔Kings swap for rounds 1–4 only (indices 0–23) in the 2026-27 order
    const is2026Order = JSON.stringify(order) === JSON.stringify(DEFAULT_ORDER);
    if (is2026Order && index < 24) {
      if (team === 'Yeti') team = 'Kings';
      else if (team === 'Kings') team = 'Yeti';
    }
    return team;
  }
  function roundOf(index) { return Math.floor(index / TEAMS.length) + 1; }
  // Accept the documented team-first form and index-first form used by callers.
  function nextPickIndex(team, index, order = DEFAULT_ORDER) {
    if (typeof team === 'number') [team, index] = [index, team];
    if (!order.includes(team)) return null;
    for (let i = index + 1; i <= index + 2 * TEAMS.length; i++) {
      if (teamAtPick(i, order) === team) return i;
    }
    return null;
  }
  function currentTeam(state) {
    return state.history.length >= state.config.rounds * TEAMS.length
      ? null : teamAtPick(state.history.length, state.config.order);
  }
  function available(state, players) {
    const taken = new Set(state.history.map(entry => entry.id));
    return players.filter(p => !taken.has(p.id));
  }
  function roster(state, players, team) {
    const byId = model(players).byId;
    return state.history.filter(entry => entry.team === team && entry.id != null)
      .map(entry => byId.get(entry.id)).filter(Boolean);
  }
  function isComplete(state, players) {
    return state.history.length >= state.config.rounds * TEAMS.length || available(state, players).length === 0;
  }
  function remainingTurns(state, team) {
    let count = 0;
    for (let i = state.history.length; i < state.config.rounds * TEAMS.length; i++) {
      if (teamAtPick(i, state.config.order) === team) count++;
    }
    return count;
  }
  function captainOwner(id) { return OWNERS.get(id) || null; }

  function eligible(state, players, team = currentTeam(state)) {
    if (!team || state.history.length >= state.config.rounds * TEAMS.length || !remainingTurns(state, team)) return [];
    const own = roster(state, players, team), hasG = own.some(isGoalie);
    let pool = available(state, players).filter(p => (!OWNERS.has(p.id) || OWNERS.get(p.id) === team) && (!isGoalie(p) || !hasG));
    const captain = pool.find(p => p.id === CAPTAIN_IDS[team]);
    const round = roundOf(state.history.length);
    const planned = team === 'Coyotes' ? 1 : state.config.captainRounds[team];
    const confirmed = team === 'Coyotes' || state.config.confirmedCaptainRounds[team];
    if (captain && confirmed) {
      if (round >= planned) return [captain];
      pool = pool.filter(p => p !== captain);
    }
    const remaining = remainingTurns(state, team);
    // A pending captain has priority if too few slots remain for captain + G.
    if (captain && remaining === 1) return [captain];
    const goalies = pool.filter(isGoalie);
    if (!hasG && goalies.length && remaining <= (captain ? 2 : 1)) {
      return pool.filter(p => isGoalie(p) || p.id === CAPTAIN_IDS[team]);
    }
    return pool;
  }

  function median(values, fallback) {
    if (!values.length) return fallback;
    const sorted = values.slice().sort((a, b) => a - b), i = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
  }
  function observedRate(p) {
    const recent = isNumber(p.gp) && p.gp > 0 && isNumber(p.pts) ? Math.max(0, p.pts / p.gp) : null;
    const career = isNumber(p.y5gp) && p.y5gp > 0 && isNumber(p.y5pts) ? Math.max(0, p.y5pts / p.y5gp) : null;
    if (recent == null) return career;
    if (career == null) return recent;
    // The five-year window may contain last year; this is a blend, not two
    // independent samples. More recent games give the recent season more weight.
    const weight = clamp(p.gp / (p.gp + 16), 0.35, 0.75);
    return recent * weight + career * (1 - weight);
  }
  function position(p) { return p.pos === 'D' ? 'D' : p.pos === 'F' ? 'F' : '?'; }
  function model(players) {
    if (models.has(players)) return models.get(players);
    const rates = { F: [], D: [], '?': [] };
    for (const p of players) {
      const rate = observedRate(p);
      if (!isGoalie(p) && rate != null) rates[position(p)].push(rate);
    }
    const all = [...rates.F, ...rates.D, ...rates['?']];
    const prior = { F: median(rates.F, median(all, 0.7)), D: median(rates.D, median(all, 0.6)) };
    prior['?'] = (prior.F + prior.D) / 2;
    const gaa = players.filter(p => isGoalie(p) && isNumber(p.gaa) && p.gaa > 0).map(p => p.gaa);
    const m = { byId: new Map(players.map(p => [p.id, p])), prior, goaliePrior: median(gaa, 3.5), scores: new Map() };
    models.set(players, m);
    for (const p of players) m.scores.set(p.id, scoreUncached(p, m));
    m.ranked = players.slice().sort((a, b) => m.scores.get(b.id) - m.scores.get(a.id) || a.id.localeCompare(b.id));
    return m;
  }
  function scoreUncached(p, m) {
    if (isGoalie(p)) {
      const gaa = isNumber(p.gaa) && p.gaa > 0 ? p.gaa : m.goaliePrior;
      return 12 + (m.goaliePrior - gaa) * 28;
    }
    const slot = position(p), observed = observedRate(p);
    let rate = observed == null ? m.prior[slot] : observed;
    // Showcase edits may supply a value on this same score scale.
    if (isNumber(p.scoutingScore)) return p.scoutingScore;
    if (p.playedD && observed != null) rate *= 1.15;
    return 12 + (rate - m.prior[slot]) * 28;
  }
  function score(player, players) {
    const m = model(players);
    const result = m.byId.get(player.id) === player ? m.scores.get(player.id) : scoreUncached(player, m);
    return Number.isFinite(result) ? result : 12;
  }
  function historyPick(p) {
    if (isNumber(p.lyPick) && p.lyPick > 0) return p.lyPick * 6 / 5;
    if (isNumber(p.lyRound) && p.lyRound > 0) return ((p.lyRound - 1) * 5 + 3) * 6 / 5;
    return null;
  }
  function marketValue(p, state, players, team) {
    let value = score(p, players);
    const own = roster(state, players, team);
    if (p.pos === 'D') {
      const ds = own.filter(x => x.pos === 'D' || x.pos === 'F/D').length;
      value += ds < 3 ? 3 + Math.min(4, roundOf(state.history.length) / 3) : -2;
    }
    if (isGoalie(p)) {
      // A goalie is needed, but early choices compare its quality gap with the
      // other available nets. Late roster reservations are hard eligibility rules.
      const otherG = available(state, players).filter(x => isGoalie(x) && x.id !== p.id);
      const fallback = otherG.length ? Math.max(...otherG.map(x => score(x, players))) : 0;
      value = score(p, players) - fallback + Math.min(12, roundOf(state.history.length));
    }
    if (state.config.useHistory) {
      const historical = historyPick(p), m = model(players);
      if (historical != null) {
        const rank = clamp(Math.round(historical) - 1, 0, m.ranked.length - 1);
        const historicalValue = score(m.ranked[rank], players);
        value = value * 0.8 + historicalValue * 0.2;
      }
      if (p.lyDraftTeam === team || p.lyTeam === team) value += 1.5;
    }
    return value;
  }

  function plannedCaptain(state, players, team = currentTeam(state)) {
    if (!team) return null;
    const captain = eligible(state, players, team).find(p => p.id === CAPTAIN_IDS[team]);
    return captain && roundOf(state.history.length) >= state.config.captainRounds[team] ? captain : null;
  }
  function modelCandidates(state, players, team) {
    const pool = eligible(state, players, team);
    // Unconfirmed rounds permit a captain to record an early self-pick manually.
    // The model still follows that captain's plan when comparing other players.
    if (roundOf(state.history.length) < state.config.captainRounds[team]) {
      const others = pool.filter(p => p.id !== CAPTAIN_IDS[team]);
      if (others.length) return others;
    }
    return pool;
  }
  function nextUsablePickIndex(state, players, team, afterIndex, target = null) {
    let next = nextPickIndex(team, afterIndex, state.config.order);
    const captainAvailable = available(state, players).some(p => p.id === CAPTAIN_IDS[team]);
    let selfPickPending = captainAvailable;
    let hasGoalie = roster(state, players, team).some(isGoalie);
    const goalieAvailable = available(state, players).some(isGoalie);
    const goalieTarget = target != null && isGoalie(target);
    if (goalieTarget && hasGoalie) return null;
    // When this turn's required/planned selection is the captain, it will no
    // longer consume a later turn. This matters when forecasting before a pick.
    if (teamAtPick(afterIndex, state.config.order) === team && afterIndex === state.history.length) {
      const currentChoices = modelCandidates(state, players, team);
      if (plannedCaptain(state, players, team) || (currentChoices.length === 1 && currentChoices[0].id === CAPTAIN_IDS[team])) selfPickPending = false;
      else if (currentChoices.length && currentChoices.every(isGoalie)) hasGoalie = true;
    }
    while (next != null && next < state.config.rounds * TEAMS.length) {
      const slots = state.config.rounds - roundOf(next) + 1;
      if (selfPickPending && (roundOf(next) >= state.config.captainRounds[team] || slots === 1)) {
        selfPickPending = false;
        next = nextPickIndex(team, next, state.config.order);
        continue;
      }
      if (goalieTarget && hasGoalie) return null;
      // A final goalie reservation is a usable turn for a goalie target, but
      // cannot be advertised as another chance to select an ordinary skater.
      if (!hasGoalie && goalieAvailable && slots <= (selfPickPending ? 2 : 1)) {
        if (goalieTarget) return next;
        hasGoalie = true;
        next = nextPickIndex(team, next, state.config.order);
        continue;
      }
      return next;
    }
    return null;
  }

  function targetSurvival(state, players, p, team, horizon) {
    if (horizon == null) return 0;
    const start = state.history.length;
    const poolAvailable = available(state, players);
    const pending = new Set(TEAMS.filter(t => poolAvailable.some(x => x.id === CAPTAIN_IDS[t])));
    const hasGoalie = new Set(TEAMS.filter(t => roster(state, players, t).some(isGoalie)));
    let goalieCount = poolAvailable.filter(isGoalie).length;
    let rivalPicks = 0;
    for (let i = start; i < horizon; i++) {
      const rival = teamAtPick(i, state.config.order);
      if (rival === team) continue;
      const slots = state.config.rounds - roundOf(i) + 1;
      if (pending.has(rival) && (roundOf(i) >= state.config.captainRounds[rival] || slots === 1)) {
        pending.delete(rival);
        continue;
      }
      if (isGoalie(p) && hasGoalie.has(rival)) continue;
      if (!hasGoalie.has(rival) && goalieCount && slots <= (pending.has(rival) ? 2 : 1)) {
        // Condition on this target still being available: if it is the only
        // goalie, a rival's mandatory goalie pick makes survival impossible.
        if (isGoalie(p) && goalieCount === 1) return 0;
        hasGoalie.add(rival);
        goalieCount--;
        if (!isGoalie(p)) continue;
      }
      rivalPicks++;
    }
    if (!rivalPicks) return 1;
    if (OWNERS.has(p.id)) return OWNERS.get(p.id) === team ? 1 : 0;
    const pool = available(state, players).filter(x => !OWNERS.has(x.id));
    const rivalTeams = TEAMS.filter(t => t !== team);
    const demand = x => rivalTeams.reduce((sum, rival) => sum + marketValue(x, state, players, rival), 0) / rivalTeams.length;
    const targetValue = demand(p);
    const rank = 1 + pool.filter(x => x.id !== p.id && demand(x) > targetValue).length;
    // Historical pick order influences demand weakly above, then uncertainty
    // broadens estimates for unscouted players rather than marking them weak.
    const unknown = observedRate(p) == null && !isGoalie(p);
    const spread = Math.max(1.7, Math.sqrt(rank) * 0.65, unknown ? 3.5 : 0);
    const logistic = z => 1 / (1 + Math.exp(-clamp(z, -60, 60)));
    // Conditional survival given that the player is still on today's board.
    const survival = logistic((rank - rivalPicks - 0.5) / spread) / logistic((rank - 0.5) / spread);
    return clamp(survival, 0, 1);
  }
  function targetOutlook(state, players) {
    const team = 'Yeti', current = state.history.length;
    const after = currentTeam(state) === team ? current : current - 1;
    return state.config.targets.map(id => {
      const p = model(players).byId.get(id);
      if (!p) return null;
      const next = isComplete(state, players) ? null : nextUsablePickIndex(state, players, team, after, p);
      const taken = state.history.find(entry => entry.id === id);
      if (taken) return { id, status: taken.team === team ? 'yeti' : 'taken', team: taken.team, nextPick: next == null ? null : next + 1, survival: null, reason: taken.team === team ? 'Already on Steven’s roster.' : `Drafted by ${taken.team}.` };
      const survival = next == null ? null : targetSurvival(state, players, p, team, next);
      const reason = isGoalie(p) && roster(state, players, team).some(isGoalie)
        ? 'Steven’s goalie slot is already filled; this player cannot be drafted by Yeti.'
        : next == null ? 'No later open pick remains for this player; captain and goalie reservations still apply.'
          : 'Model estimate until Steven’s next open pick; skips planned self-picks and required goalie turns. Uses current value and a weak prior from last year’s five-team draft.';
      return { id, status: 'available', nextPick: next == null ? null : next + 1, survival,
        reason };
    }).filter(Boolean);
  }

  function utility(p, state, players, team, outlook) {
    let value = marketValue(p, state, players, team);
    if (team === 'Yeti' && state.config.prioritizeTargets && state.config.targets.includes(p.id)) {
      const estimate = outlook && outlook.find(t => t.id === p.id);
      const risk = estimate && estimate.survival != null ? 1 - estimate.survival : 1;
      value += 5 + 20 * risk;
    }
    return value;
  }
  function projectedPlayer(state, players, team, projections) {
    if (!projections || !projections[team]) return null;
    const round = roundOf(state.history.length);
    const playerId = projections[team][round];
    if (!playerId) return null;
    const player = model(players).byId.get(playerId);
    const pool = modelCandidates(state, players, team);
    return player && pool.some(p => p.id === playerId) ? player : null;
  }
  function recommend(state, players, projections) {
    if (isComplete(state, players)) return null;
    const team = currentTeam(state), pool = modelCandidates(state, players, team);
    if (!pool.length) return null;
    const captain = plannedCaptain(state, players, team);
    const projected = projectedPlayer(state, players, team, projections);
    const outlook = team === 'Yeti' && state.config.prioritizeTargets ? targetOutlook(state, players) : null;
    const ranked = pool.slice().sort((a, b) => utility(b, state, players, team, outlook) - utility(a, state, players, team, outlook) || a.id.localeCompare(b.id));
    const player = captain || projected || ranked[0], forced = !!captain || pool.length === 1;
    const later = nextPickIndex(team, state.history.length, state.config.order);
    const next = later < state.config.rounds * TEAMS.length ? later : null;
    let reason;
    if (captain) {
      reason = `${shortName(player)} drafts himself in ${state.config.confirmedCaptainRounds[team] ? 'confirmed' : 'planned'} round ${state.config.captainRounds[team]}; this uses a pick.`;
    } else if (projected) {
      reason = `Locked projection from captain's queue (Matthew's sheet, Sept 16). Captain and goalie rules still apply.`;
    } else if (pool.length === 1) reason = 'This is the only legal choice under the captain and goalie roster rules.';
    else if (outlook && state.config.targets.includes(player.id)) {
      const estimate = outlook.find(t => t.id === player.id);
      reason = `Reunion target with value ${score(player, players).toFixed(1)}. ${estimate && estimate.survival != null ? `Model estimates ${Math.round(estimate.survival * 100)}% still available at Steven’s next open pick (#${estimate.nextPick}).` : 'No later open Steven pick remains.'}`;
    } else if (isGoalie(player)) reason = 'Goalie quality versus the remaining nets, with one goalie slot per team.';
    else reason = `${shortName(player)} has the strongest estimated value after position needs${state.config.useHistory ? ' and a weak historical prior' : ''}.`;
    if (observedRate(player) == null && !isGoalie(player)) reason += ' No scoring history: uses a neutral positional estimate; scout at the showcase.';
    return { player, reason, alternatives: ranked.filter(p => p.id !== player.id).slice(0, 3), nextPick: next == null ? null : next + 1, picksBetween: next == null ? 0 : next - state.history.length - 1, forced };
  }

  function append(state, id) {
    return { ...state, config: clone(state.config), history: [...state.history, { id, team: currentTeam(state), pick: state.history.length + 1 }] };
  }
  function pickPlayer(state, players, id) {
    if (isComplete(state, players)) throw new Error('The draft is complete.');
    const p = model(players).byId.get(id);
    if (!p) throw new Error('That player is not in the registered player list.');
    if (state.history.some(entry => entry.id === id)) throw new Error('That player has already been drafted.');
    const team = currentTeam(state), owner = OWNERS.get(id);
    if (owner && owner !== team) throw new Error(`${shortName(p)} is reserved for his own team (${owner}).`);
    if (!eligible(state, players, team).some(x => x.id === id)) {
      if (isGoalie(p) && roster(state, players, team).some(isGoalie)) throw new Error('This team already has a goalie.');
      throw new Error('This pick conflicts with a confirmed captain round or a required remaining captain/goalie slot.');
    }
    return append(state, id);
  }
  function skipTurn(state, players) {
    if (isComplete(state, players)) throw new Error('The draft is complete.');
    if (eligible(state, players).length) throw new Error('A turn can only be passed when no legal players remain.');
    return append(state, null);
  }
  function runMock(state, players, projections) {
    let result = clone(state);
    while (!isComplete(result, players)) {
      const rec = recommend(result, players, projections);
      result = rec ? pickPlayer(result, players, rec.player.id) : skipTurn(result, players);
    }
    return result;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function runSimulation(state, players, projections, seed = 1) {
    let result = clone(state);
    const random = rng(seed);
    while (!isComplete(result, players)) {
      const team = currentTeam(result), pool = modelCandidates(result, players, team);
      if (!pool.length) { result = skipTurn(result, players); continue; }
      const captain = plannedCaptain(result, players, team);
      const projected = projectedPlayer(result, players, team, projections);
      let player = captain || projected;
      if (!player) {
        const outlook = team === 'Yeti' && result.config.prioritizeTargets ? targetOutlook(result, players) : null;
        let best = -Infinity;
        for (const p of pool) {
          // Gumbel choice noise yields different plausible drafts, not calibrated
          // opponent or season probabilities. Rules are never randomized away.
          const uncertainty = observedRate(p) == null && !isGoalie(p) ? 2 : 0;
          const temp = (team === 'Yeti' ? 2.5 : 4.5) + uncertainty;
          const noisy = utility(p, result, players, team, outlook) - temp * Math.log(-Math.log(clamp(random(), 1e-9, 1 - 1e-9)));
          if (noisy > best) { best = noisy; player = p; }
        }
      }
      result = pickPlayer(result, players, player.id);
    }
    return result;
  }
  function simulate(state, players, projections, n = 25) {
    const runs = clamp(Number.isFinite(Number(n)) ? Math.round(Number(n)) : 25, 1, 200);
    const teamStats = Object.fromEntries(TEAMS.map(team => [team, { team, avgScore: 0, firstShare: 0 }]));
    const targets = state.config.targets.filter(id => model(players).byId.has(id)).map(id => ({ id, yetiShare: 0, avgPick: null, picked: 0, pickSum: 0 }));
    for (let i = 0; i < runs; i++) {
      const result = runSimulation(state, players, projections, 104729 * (i + 1) + state.history.length);
      const values = TEAMS.map(team => ({ team, value: roster(result, players, team).reduce((sum, p) => sum + score(p, players), 0) }));
      const top = Math.max(...values.map(t => t.value)), winners = values.filter(t => Math.abs(t.value - top) < 1e-9);
      for (const t of values) teamStats[t.team].avgScore += t.value / runs;
      for (const t of winners) teamStats[t.team].firstShare += 1 / winners.length / runs;
      for (const target of targets) {
        const entry = result.history.find(h => h.id === target.id);
        if (entry) { target.picked++; target.pickSum += entry.pick; if (entry.team === 'Yeti') target.yetiShare += 1 / runs; }
      }
    }
    return { runs, teams: Object.values(teamStats).sort((a, b) => b.avgScore - a.avgScore), targets: targets.map(t => ({ id: t.id, yetiShare: t.yetiShare, avgPick: t.picked ? t.pickSum / t.picked : null })), note: 'Shares describe this draft model, not season-winning probabilities. Captain rounds and roster rules apply in every run.' };
  }

  function validateState(value, players) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 2 || !value.config || !Array.isArray(value.history)) throw new Error('Invalid saved draft format (expected version 2).');
    const c = value.config;
    if (!Array.isArray(c.order) || c.order.length !== TEAMS.length || new Set(c.order).size !== TEAMS.length || c.order.some(t => !TEAMS.includes(t))) throw new Error('Draft order must contain each of the six teams once.');
    if (!Number.isInteger(c.rounds) || c.rounds < 1 || c.rounds > 30) throw new Error('Roster rounds must be an integer from 1 to 30.');
    if (!c.captainRounds || !c.confirmedCaptainRounds || TEAMS.some(t => !Number.isInteger(c.captainRounds[t]) || c.captainRounds[t] < 1 || c.captainRounds[t] > 30 || typeof c.confirmedCaptainRounds[t] !== 'boolean')) throw new Error('Every captain needs a valid planned round and confirmation setting.');
    if (c.captainRounds.Coyotes !== 1 || c.confirmedCaptainRounds.Coyotes !== true) throw new Error('Keane must draft himself in confirmed round one.');
    if (TEAMS.some(t => c.confirmedCaptainRounds[t] && c.captainRounds[t] > c.rounds)) throw new Error('A confirmed captain round cannot exceed the roster size.');
    if (typeof c.prioritizeTargets !== 'boolean' || typeof c.useHistory !== 'boolean' || !Array.isArray(c.targets) || c.targets.some(id => typeof id !== 'string') || new Set(c.targets).size !== c.targets.length) throw new Error('Invalid draft strategy settings.');
    if (c.targets.some(id => !model(players).byId.has(id) || OWNERS.has(id))) throw new Error('Targets must be registered players who are not captains.');
    if (value.history.length > c.rounds * TEAMS.length) throw new Error('Recorded draft exceeds the configured roster size.');
    let checked = { version: 2, config: clone(c), history: [] };
    for (let i = 0; i < value.history.length; i++) {
      const entry = value.history[i];
      if (!entry || entry.pick !== i + 1 || entry.team !== currentTeam(checked) || !(entry.id === null || typeof entry.id === 'string')) throw new Error(`Invalid history at pick ${i + 1}.`);
      checked = entry.id === null ? skipTurn(checked, players) : pickPlayer(checked, players, entry.id);
    }
    return checked;
  }

  return { TEAMS, CAPTAIN_IDS, DEFAULT_TARGETS, createState, teamAtPick, roundOf, nextPickIndex, nextUsablePickIndex,
    roster, available, eligible, currentTeam, isComplete, score, captainOwner, recommend, pickPlayer, skipTurn,
    runMock, runSimulation, simulate, targetOutlook, validateState };
});
