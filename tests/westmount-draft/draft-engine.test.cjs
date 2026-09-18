'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../public/westmount-draft/draft-engine.js');
const { PLAYERS } = require('../../public/westmount-draft/data.js');

const clone = value => JSON.parse(JSON.stringify(value));
const ORDER = ['Hawks', 'Kings', 'Coyotes', 'Devils', 'Yeti', 'Lightning'];
const CAPTAIN_IDS = {
  Yeti: 'McAlear, Steven',
  Devils: 'Murciano, Emile',
  Kings: 'Mashaal, Alexander',
  Lightning: 'Martin, Philippe',
  Hawks: 'Ciampini, Adam',
  Coyotes: 'Kelly-Menard, Keane',
};

function fixtures({ skaters = 90, goalies = 8 } = {}) {
  return [
    ...Object.values(CAPTAIN_IDS).map((id, index) => ({
      id, name: id, role: 'skater', pos: 'F', gp: 30, pts: 30 + index,
      ppg: (30 + index) / 30, y5gp: 100, y5pts: 90 + index,
      returning: true, age: 30,
    })),
    ...E.DEFAULT_TARGETS.map(id => ({
      id, name: id, role: 'skater', pos: 'F', gp: 30, pts: 35,
      ppg: 35 / 30, y5gp: 100, y5pts: 110, returning: true, age: 30,
    })),
    ...Array.from({ length: skaters }, (_, index) => ({
      id: `Skater ${String(index).padStart(3, '0')}`,
      name: `Skater ${String(index).padStart(3, '0')}`,
      role: 'skater', pos: index % 4 === 0 ? 'D' : 'F', gp: 30,
      pts: 90 - index, ppg: (90 - index) / 30, y5gp: 100,
      y5pts: 200 - index, returning: true, age: 30,
    })),
    ...Array.from({ length: goalies }, (_, index) => ({
      id: `Goalie ${index}`, name: `Goalie ${index}`, role: 'goalie',
      pos: 'G', gp: 30, gaa: 2 + index / 10, returning: true,
    })),
  ];
}

// Construct expected order without using any engine helpers. This detects the
// end-of-round double turns that are easy to lose in next-pick calculations.
function expectedSnake(order, rounds = 14) {
  const snake = Array.from({ length: rounds }, (_, round) =>
    round % 2 === 0 ? [...order] : [...order].reverse()).flat();
  
  // Apply Yeti↔Kings swap for rounds 1–4 only (indices 0–23) in the 2026-27 order
  const DEFAULT_ORDER = ['Lightning', 'Kings', 'Coyotes', 'Devils', 'Yeti', 'Hawks'];
  const is2026Order = JSON.stringify(order) === JSON.stringify(DEFAULT_ORDER);
  if (is2026Order) {
    for (let i = 0; i < Math.min(24, snake.length); i++) {
      if (snake[i] === 'Yeti') snake[i] = 'Kings';
      else if (snake[i] === 'Kings') snake[i] = 'Yeti';
    }
  }
  
  return snake;
}

test('six teams and all six registered captains match the supplied season', () => {
  assert.equal(E.TEAMS.length, 6);
  assert.deepEqual(new Set(E.TEAMS), new Set(ORDER));
  assert.deepEqual(E.CAPTAIN_IDS, CAPTAIN_IDS);
  for (const id of Object.values(CAPTAIN_IDS)) {
    assert.equal(PLAYERS.filter(player => player.id === id).length, 1, id);
  }
});

test('snake order and strict next turn are correct for every team in every slot', () => {
  for (let offset = 0; offset < 6; offset++) {
    const order = [...ORDER.slice(offset), ...ORDER.slice(0, offset)];
    const expected = expectedSnake(order, 16);
    for (let pick = 0; pick < 84; pick++) {
      assert.equal(E.teamAtPick(pick, order), expected[pick], `pick ${pick + 1}`);
      assert.equal(E.roundOf(pick), Math.floor(pick / 6) + 1);
      for (const team of order) {
        const next = expected.findIndex((value, index) => index > pick && value === team);
        assert.equal(E.nextPickIndex(team, pick, order), next,
          `${team} after pick ${pick + 1}, order ${order.join(',')}`);
      }
    }
  }
});

test('snake endpoints receive consecutive picks on each reversal', () => {
  assert.equal(E.teamAtPick(5, ORDER), 'Lightning');
  assert.equal(E.teamAtPick(6, ORDER), 'Lightning');
  assert.equal(E.nextPickIndex('Lightning', 5, ORDER), 6);
  assert.equal(E.teamAtPick(11, ORDER), 'Hawks');
  assert.equal(E.teamAtPick(12, ORDER), 'Hawks');
  assert.equal(E.nextPickIndex('Hawks', 11, ORDER), 12);
});

test('unknown skater and goalie statistics still produce finite scores', () => {
  const examples = [
    { id: 'New forward', name: 'New forward', role: 'skater', pos: 'F' },
    { id: 'New unknown', name: 'New unknown', role: 'skater', pos: '', gp: 0, pts: 0 },
    { id: 'Missing data', name: 'Missing data', role: 'skater', gp: null, pts: null },
    { id: 'New goalie', name: 'New goalie', role: 'goalie', pos: 'G' },
    { id: 'Pending goalie', name: 'Pending goalie', role: 'goalie', gp: null, gaa: null },
  ];
  for (const player of [...examples, ...PLAYERS]) {
    assert.ok(Number.isFinite(E.score(player, PLAYERS)), player.name);
  }
});

function stateWith(config = {}) {
  const state = E.createState();
  Object.assign(state.config, { order: [...ORDER] }, config);
  return state;
}

function advance(state, players, count, avoidIds = []) {
  const avoided = new Set(avoidIds);
  let current = clone(state);
  while (current.history.length < count) {
    const candidates = E.eligible(current, players);
    const choice = candidates.find(player => !avoided.has(player.id)) || candidates[0];
    assert.ok(choice, `fixture cannot reach pick ${count}`);
    current = E.pickPlayer(current, players, choice.id);
  }
  return current;
}

function assertLegalCompletedDraft(state, players) {
  assert.ok(state.history.length <= state.config.rounds * 6);
  assert.equal(E.isComplete(state, players), true);
  const picks = state.history.filter(entry => entry.id != null);
  assert.equal(new Set(picks.map(entry => entry.id)).size, picks.length, 'no duplicate players');
  for (let index = 0; index < state.history.length; index++) {
    assert.equal(state.history[index].pick, index + 1);
    assert.equal(state.history[index].team, E.teamAtPick(index, state.config.order));
  }
  for (const team of E.TEAMS) {
    const roster = E.roster(state, players, team);
    assert.ok(roster.length <= state.config.rounds, `${team} roster cap`);
    assert.ok(roster.filter(player => player.role === 'goalie').length <= 1, `${team} goalie cap`);
    assert.equal(roster.filter(player => player.id === CAPTAIN_IDS[team]).length, 1, `${team} captain`);
    assert.ok(roster.every(player => !Object.values(CAPTAIN_IDS).includes(player.id)
      || player.id === CAPTAIN_IDS[team]), `${team} may only draft its own captain`);
  }
  assert.deepEqual(E.validateState(state, players), state);
}

test('captains are reserved for their own teams with all preference options off', () => {
  const players = fixtures();
  const state = stateWith({ prioritizeTargets: false, useHistory: false });
  for (const team of E.TEAMS) {
    const choices = E.eligible(state, players, team);
    assert.ok(choices.every(player => !Object.values(CAPTAIN_IDS).includes(player.id)
      || player.id === CAPTAIN_IDS[team]), team);
  }
  const before = clone(state);
  assert.throws(() => E.pickPlayer(state, players, CAPTAIN_IDS.Yeti));
  assert.deepEqual(state, before, 'rejected pick must not mutate the live draft');
});

test('Keane must draft himself in round one from every possible snake slot', () => {
  const players = fixtures();
  for (let slot = 0; slot < 6; slot++) {
    const order = ORDER.filter(team => team !== 'Coyotes');
    order.splice(slot, 0, 'Coyotes');
    const state = advance(stateWith({ order, prioritizeTargets: false, useHistory: false }), players, slot);
    assert.equal(E.currentTeam(state), 'Coyotes');
    assert.deepEqual(E.eligible(state, players).map(player => player.id), [CAPTAIN_IDS.Coyotes]);
    const suggestion = E.recommend(state, players);
    assert.equal(suggestion.player.id, CAPTAIN_IDS.Coyotes);
    assert.equal(suggestion.forced, true);
    assert.throws(() => E.pickPlayer(state, players, 'Skater 001'));
    assert.throws(() => E.skipTurn(state, players));
    const next = E.pickPlayer(state, players, CAPTAIN_IDS.Coyotes);
    assert.equal(next.history[slot].id, CAPTAIN_IDS.Coyotes);
  }
});

test('confirmed captain round means that team’s round, not an overall pick number', () => {
  const players = fixtures();
  let state = stateWith();
  state.config.captainRounds.Hawks = 9;
  state.config.confirmedCaptainRounds.Hawks = true;
  // Hawks is first in the order: R9 is overall pick 49, not overall pick 9.
  state = advance(state, players, 0, [CAPTAIN_IDS.Hawks]);
  assert.throws(() => E.pickPlayer(state, players, CAPTAIN_IDS.Hawks));
  state = advance(state, players, 48, [CAPTAIN_IDS.Hawks]);
  assert.equal(E.currentTeam(state), 'Hawks');
  assert.equal(E.roundOf(state.history.length), 9);
  assert.equal(E.recommend(state, players).player.id, CAPTAIN_IDS.Hawks);
  assert.deepEqual(E.eligible(state, players).map(player => player.id), [CAPTAIN_IDS.Hawks]);
  assert.throws(() => E.pickPlayer(state, players, E.available(state, players)
    .find(player => !Object.values(CAPTAIN_IDS).includes(player.id)).id));
  assert.equal(E.pickPlayer(state, players, CAPTAIN_IDS.Hawks).history[48].id, CAPTAIN_IDS.Hawks);
});

test('unconfirmed historical captain rounds remain a plan that live picks can defer', () => {
  const players = fixtures();
  const initial = stateWith();
  initial.config.confirmedCaptainRounds.Yeti = false;
  const state = advance(initial, players, 7, [CAPTAIN_IDS.Yeti]);
  assert.equal(E.currentTeam(state), 'Yeti');
  assert.equal(E.roundOf(state.history.length), 2);
  assert.equal(E.recommend(state, players).player.id, CAPTAIN_IDS.Yeti);
  const other = E.eligible(state, players).find(player => !Object.values(CAPTAIN_IDS).includes(player.id));
  assert.ok(other);
  const next = E.pickPlayer(state, players, other.id);
  assert.equal(next.history[7].id, other.id);
  assert.deepEqual(E.validateState(next, players), next);
});

test('manual picks reject nonexistent players, duplicates and a second goalie', () => {
  const players = fixtures();
  let state = stateWith();
  assert.throws(() => E.pickPlayer(state, players, 'not a registered player'));
  state = E.pickPlayer(state, players, 'Goalie 0');
  assert.throws(() => E.pickPlayer(state, players, 'Goalie 0'));
  state = advance(state, players, 11);
  assert.equal(E.currentTeam(state), 'Hawks');
  const unusedGoalie = E.available(state, players).find(player => player.role === 'goalie');
  assert.ok(unusedGoalie);
  const before = clone(state);
  assert.throws(() => E.pickPlayer(state, players, unusedGoalie.id));
  assert.deepEqual(state, before);
});

test('cannot skip a turn while a legal player is available', () => {
  const state = E.createState();
  assert.throws(() => E.skipTurn(state, fixtures()));
  assert.deepEqual(state.history, []);
});

test('mock drafts enforce exact confirmed self rounds, one goalie and roster capacity', () => {
  const players = fixtures();
  for (let offset = 0; offset < 6; offset++) {
    const order = [...ORDER.slice(offset), ...ORDER.slice(0, offset)];
    const state = stateWith({ order, prioritizeTargets: false, useHistory: false });
    for (const team of E.TEAMS) state.config.confirmedCaptainRounds[team] = true;
    const before = clone(state);
    const completed = E.runMock(state, players);
    assert.deepEqual(state, before, 'mock must return a new state');
    assertLegalCompletedDraft(completed, players);
    for (const team of E.TEAMS) {
      const captain = completed.history.find(entry => entry.id === CAPTAIN_IDS[team]);
      assert.equal(E.roundOf(captain.pick - 1), state.config.captainRounds[team], team);
      assert.equal(E.roster(completed, players, team).length, 14, team);
      assert.equal(E.roster(completed, players, team).filter(player => player.role === 'goalie').length, 1, team);
    }
    assert.throws(() => E.pickPlayer(completed, players, E.available(completed, players)[0].id));
  }
});

test('mock and simulated continuations preserve recorded picks and leave input untouched', () => {
  const players = fixtures();
  const state = advance(stateWith(), players, 17);
  const before = clone(state);
  for (const completed of [E.runMock(state, players), E.runSimulation(state, players, 1),
    E.runSimulation(state, players, 817), E.runSimulation(state, players, 903)]) {
    assert.deepEqual(completed.history.slice(0, 17), state.history);
    assert.deepEqual(state, before);
    assertLegalCompletedDraft(completed, players);
  }
});

test('all simulation seeds honor captain obligations and the same roster limits as mocks', () => {
  const players = fixtures();
  const state = stateWith({ prioritizeTargets: false, useHistory: false });
  for (const team of E.TEAMS) state.config.confirmedCaptainRounds[team] = true;
  for (const seed of [1, 2, 3, 7, 51, 99]) {
    const completed = E.runSimulation(state, players, seed);
    assertLegalCompletedDraft(completed, players);
    for (const team of E.TEAMS) {
      const captain = completed.history.find(entry => entry.id === CAPTAIN_IDS[team]);
      assert.equal(E.roundOf(captain.pick - 1), state.config.captainRounds[team]);
    }
  }
});

test('missing goalies do not create placeholders or block each team from drafting its captain', () => {
  for (const goalies of [0, 4]) {
    const players = fixtures({ goalies });
    const completed = E.runMock(stateWith(), players);
    assertLegalCompletedDraft(completed, players);
    assert.equal(completed.history.filter(entry => entry.id != null).length, 84);
    const draftedGoalies = completed.history.filter(entry =>
      players.find(player => player.id === entry.id)?.role === 'goalie');
    assert.equal(draftedGoalies.length, goalies);
  }
});

test('manual deferral still reserves enough roster slots for the captain and goalie', () => {
  const players = fixtures();
  const state = stateWith({ rounds: 2 });
  for (const team of E.TEAMS) state.config.captainRounds[team] = team === 'Coyotes' ? 1 : 2;
  const completed = advance(state, players, 12, Object.values(CAPTAIN_IDS));
  assertLegalCompletedDraft(completed, players);
  for (const team of E.TEAMS) {
    assert.equal(E.roster(completed, players, team).filter(player => player.role === 'goalie').length, 1, team);
  }
});

test('real registered pool completes with only real players and no goalie duplication', () => {
  const result = E.runMock(E.createState(), PLAYERS);
  assertLegalCompletedDraft(result, PLAYERS);
  assert.equal(result.history.filter(entry => entry.id != null).length, PLAYERS.length);
  assert.ok(result.history.filter(entry => entry.id != null)
    .every(entry => PLAYERS.some(player => player.id === entry.id)));
});

test('survival is 100% when Steven has consecutive open turns', () => {
  const order = ['Coyotes', 'Devils', 'Kings', 'Lightning', 'Hawks', 'Yeti'];
  const state = stateWith({ order });
  state.config.captainRounds.Yeti = 5;
  const current = advance(state, PLAYERS, 5, state.config.targets);
  const outlook = E.targetOutlook(current, PLAYERS).filter(target => target.status === 'available');
  assert.ok(outlook.length > 0);
  for (const target of outlook) {
    assert.equal(target.nextPick, 7);
    assert.equal(target.survival, 1, target.id);
  }
  assert.equal(E.recommend(current, PLAYERS).nextPick, 7);
});

test('target survival skips Steven’s pending self-pick before his next open turn', () => {
  const order = ['Coyotes', 'Devils', 'Kings', 'Lightning', 'Hawks', 'Yeti'];
  for (const confirmed of [false, true]) {
    const state = stateWith({ order });
    state.config.captainRounds.Yeti = 2;
    state.config.confirmedCaptainRounds.Yeti = confirmed;
    const current = advance(state, PLAYERS, 5, state.config.targets);
    assert.equal(E.nextPickIndex('Yeti', 5, order), 6);
    assert.equal(E.nextUsablePickIndex(current, PLAYERS, 'Yeti', 5), 17);
    const ot = E.targetOutlook(current, PLAYERS).find(target => target.id === 'Ong Tone, Christopher');
    assert.ok(ot, 'OT must resolve to Christopher Ong Tone');
    assert.equal(ot.nextPick, 18);
    assert.ok(ot.survival < 1, 'opponents can draft OT before the next usable turn');
  }
});

test('drafted captain no longer consumes a future planned self-pick in target outlook', () => {
  const order = ['Coyotes', 'Devils', 'Kings', 'Lightning', 'Hawks', 'Yeti'];
  const initial = stateWith({ order });
  initial.config.captainRounds.Yeti = 2;
  initial.config.confirmedCaptainRounds.Yeti = false;
  const current = advance(initial, PLAYERS, 5, initial.config.targets);
  const drafted = E.pickPlayer(current, PLAYERS, CAPTAIN_IDS.Yeti);
  assert.equal(E.nextUsablePickIndex(drafted, PLAYERS, 'Yeti', 5), 6);
});

test('default reunion targets use exact registered IDs for OT, DT and all four McAlears', () => {
  assert.deepEqual(new Set(E.DEFAULT_TARGETS), new Set([
    'Ong Tone, Christopher', 'Toledano, David', 'McAlear, Matthew',
    'McAlear, Daniel', 'McAlear, Thomas', 'McAlear, Peter',
  ]));
  for (const id of E.DEFAULT_TARGETS) assert.ok(PLAYERS.some(player => player.id === id), id);
  assert.ok(!E.DEFAULT_TARGETS.includes('Angelini, Christopher'));
});

test('saved state validation rejects corrupt orders, IDs, team ownership and pick history', () => {
  const players = fixtures();
  const legal = advance(stateWith(), players, 8);
  assert.deepEqual(E.validateState(clone(legal), players), legal);
  const corruptions = [
    state => { state.config.order[0] = state.config.order[1]; },
    state => { state.config.order[0] = 'unknown team'; },
    state => { state.history[0].id = 'unknown player'; },
    state => { state.history[0].team = 'unknown team'; },
    state => { state.history[0].team = 'Yeti'; },
    state => { state.history[1].id = state.history[0].id; },
    state => { state.history[0].pick = 99; },
    state => { state.history[0].id = null; },
    state => { state.history = {}; },
    state => { state.config.rounds = -1; },
    state => { state.config.rounds = 3.5; },
    state => { state.config.captainRounds.Coyotes = 2; },
    state => { state.config.confirmedCaptainRounds.Coyotes = false; },
  ];
  for (const corrupt of corruptions) {
    const state = clone(legal);
    corrupt(state);
    assert.throws(() => E.validateState(state, players), String(corrupt));
  }
  for (const invalid of [null, [], 'not JSON', { history: [] }]) {
    assert.throws(() => E.validateState(invalid, players));
  }
});

test('configuration changes cannot silently invalidate existing draft history', () => {
  const players = fixtures();
  const state = advance(stateWith(), players, 17);
  const reordered = clone(state);
  [reordered.config.order[0], reordered.config.order[1]] = [reordered.config.order[1], reordered.config.order[0]];
  assert.throws(() => E.validateState(reordered, players));
  const shortened = clone(state);
  shortened.config.rounds = 2;
  assert.throws(() => E.validateState(shortened, players));
  const retroactive = clone(state);
  retroactive.config.captainRounds.Hawks = 2;
  retroactive.config.confirmedCaptainRounds.Hawks = true;
  assert.throws(() => E.validateState(retroactive, players));
  const preferences = clone(state);
  preferences.config.prioritizeTargets = !preferences.config.prioritizeTargets;
  preferences.config.useHistory = !preferences.config.useHistory;
  assert.deepEqual(E.validateState(preferences, players).history, state.history);
});

test('saved reunion targets must identify registered non-captain players', () => {
  const players = fixtures();
  const legal = stateWith();
  for (const id of ['not a registered player', ...Object.values(CAPTAIN_IDS)]) {
    const invalid = clone(legal);
    invalid.config.targets = [id];
    assert.throws(() => E.validateState(invalid, players), id);
  }
  const goalieTarget = clone(legal);
  goalieTarget.config.targets = ['Goalie 7'];
  assert.deepEqual(E.validateState(goalieTarget, players), goalieTarget,
    'a registered goalie is a valid target before Steven has a goalie');
});

test('final mandatory goalie turn is available to a goalie target but not a skater target', () => {
  const players = fixtures();
  const initial = stateWith({ targets: ['Ong Tone, Christopher', 'Goalie 7'] });
  // Avoid every goalie and reunion target while recording 12 complete rounds
  // plus the first three turns of R13. Steven already drafted himself in R1.
  const avoid = [...E.DEFAULT_TARGETS, ...players.filter(player => player.role === 'goalie').map(player => player.id)];
  const current = advance(initial, players, 76, avoid);
  assert.equal(E.currentTeam(current), 'Yeti');
  assert.equal(E.roster(current, players, 'Yeti').some(player => player.role === 'goalie'), false);
  assert.ok(E.roster(current, players, 'Yeti').some(player => player.id === CAPTAIN_IDS.Yeti));
  const outlook = E.targetOutlook(current, players);
  const skater = outlook.find(target => target.id === 'Ong Tone, Christopher');
  const goalie = outlook.find(target => target.id === 'Goalie 7');
  assert.equal(skater.nextPick, null, 'Steven’s final slot must be used on a goalie');
  assert.equal(skater.survival, null);
  assert.equal(goalie.nextPick, 80, 'a goalie can still be taken on Steven’s final turn');
  assert.ok(goalie.survival >= 0 && goalie.survival <= 1);

  const goalieNow = E.pickPlayer(current, players, 'Goalie 0');
  const afterGoalie = E.targetOutlook(goalieNow, players).find(target => target.id === 'Ong Tone, Christopher');
  assert.equal(afterGoalie.nextPick, 80, 'taking a goalie now makes the final slot available to a skater');
  assert.ok(afterGoalie.survival >= 0 && afterGoalie.survival <= 1);
});

test('goalie targets have no future legal pick once Steven already has a goalie', () => {
  const players = fixtures();
  const initial = stateWith({ targets: ['Goalie 7', 'Ong Tone, Christopher'] });
  const current = advance(initial, players, 4, initial.config.targets);
  assert.equal(E.currentTeam(current), 'Yeti');
  const drafted = E.pickPlayer(current, players, 'Goalie 0');
  const outlook = E.targetOutlook(drafted, players);
  const goalie = outlook.find(target => target.id === 'Goalie 7');
  assert.equal(goalie.status, 'available', 'still on the league board');
  assert.equal(goalie.nextPick, null, 'cannot take a second goalie');
  assert.equal(goalie.survival, null);
  assert.notEqual(outlook.find(target => target.id === 'Ong Tone, Christopher').nextPick, null);
});

test('a deferred captain consumes the final turn even when the unconfirmed plan is later', () => {
  const players = fixtures();
  const initial = stateWith({ targets: ['Ong Tone, Christopher'] });
  initial.config.captainRounds.Yeti = 30;
  let state = advance(initial, players, 4, initial.config.targets);
  state = E.pickPlayer(state, players, 'Goalie 0');
  state = advance(state, players, 76, [...E.DEFAULT_TARGETS, CAPTAIN_IDS.Yeti]);
  assert.equal(E.currentTeam(state), 'Yeti');
  assert.equal(E.roster(state, players, 'Yeti').some(player => player.id === CAPTAIN_IDS.Yeti), false);
  const target = E.targetOutlook(state, players).find(row => row.id === 'Ong Tone, Christopher');
  assert.equal(target.nextPick, null);
  assert.equal(target.survival, null);
});

test('pending captain and goalie occupy both final turns regardless of which is drafted first', () => {
  const players = fixtures();
  const initial = stateWith({ targets: ['Ong Tone, Christopher'] });
  initial.config.captainRounds.Yeti = 14;
  initial.config.confirmedCaptainRounds.Yeti = false;
  const avoid = [...E.DEFAULT_TARGETS, CAPTAIN_IDS.Yeti,
    ...players.filter(player => player.role === 'goalie').map(player => player.id)];
  const current = advance(initial, players, 76, avoid);
  assert.ok(E.eligible(current, players).every(player => player.id === CAPTAIN_IDS.Yeti || player.role === 'goalie'));
  for (const state of [current, E.pickPlayer(current, players, CAPTAIN_IDS.Yeti),
    E.pickPlayer(current, players, 'Goalie 0')]) {
    const target = E.targetOutlook(state, players).find(row => row.id === 'Ong Tone, Christopher');
    assert.equal(target.nextPick, null);
    assert.equal(target.survival, null);
  }
});

test('opponents forced to take goalies cannot reduce a skater’s survival before Steven’s next turn', () => {
  const players = fixtures();
  const initial = stateWith({ targets: ['Ong Tone, Christopher'] });
  const avoid = [...E.DEFAULT_TARGETS,
    ...players.filter(player => player.role === 'goalie').map(player => player.id)];
  let state = advance(initial, players, 76, avoid);
  state = E.pickPlayer(state, players, 'Goalie 0');
  state = advance(state, players, 78, avoid);
  assert.equal(E.currentTeam(state), 'Lightning');
  assert.ok(E.eligible(state, players).every(player => player.role === 'goalie'));
  const target = E.targetOutlook(state, players).find(row => row.id === 'Ong Tone, Christopher');
  assert.equal(target.nextPick, 80);
  assert.equal(target.survival, 1, 'both intervening teams must fill their goalie slots');
});
