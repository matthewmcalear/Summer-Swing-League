/**
 * Tests for Westmount draft engine with projections support.
 * Run with: node draft-engine.test.js
 */

const { PLAYERS, PROJECTIONS } = require('./data.js');
const E = require('./draft-engine.js');

let failures = 0;
let passes = 0;

function assert(condition, message) {
  if (condition) {
    passes++;
    console.log(`✓ ${message}`);
  } else {
    failures++;
    console.error(`✗ ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual === expected) {
    passes++;
    console.log(`✓ ${message}`);
  } else {
    failures++;
    console.error(`✗ ${message}`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Actual:   ${actual}`);
  }
}

console.log('Running draft engine tests...\n');

// Test 1: Verify initial state has correct captain rounds
console.log('Test 1: Captain rounds and confirmations');
const state = E.createState();
assertEquals(state.config.captainRounds.Yeti, 2, 'Yeti captain round is 2');
assertEquals(state.config.captainRounds.Kings, 3, 'Kings captain round is 3');
assertEquals(state.config.captainRounds.Hawks, 9, 'Hawks captain round is 9');
assertEquals(state.config.captainRounds.Devils, 11, 'Devils captain round is 11');
assertEquals(state.config.captainRounds.Lightning, 10, 'Lightning captain round is 10');
assertEquals(state.config.captainRounds.Coyotes, 1, 'Coyotes captain round is 1');

// Test 2: All captain rounds are confirmed
console.log('\nTest 2: Confirmed captain rounds');
assert(state.config.confirmedCaptainRounds.Yeti === true, 'Yeti confirmed');
assert(state.config.confirmedCaptainRounds.Kings === true, 'Kings confirmed');
assert(state.config.confirmedCaptainRounds.Hawks === true, 'Hawks confirmed');
assert(state.config.confirmedCaptainRounds.Devils === true, 'Devils confirmed');
assert(state.config.confirmedCaptainRounds.Lightning === true, 'Lightning confirmed');
assert(state.config.confirmedCaptainRounds.Coyotes === true, 'Coyotes confirmed');

// Test 3: McAlear, Peter is in default targets
console.log('\nTest 3: Default targets');
assert(state.config.targets.includes('McAlear, Peter'), 'McAlear, Peter is in default targets');

// Test 4: Test projections structure
console.log('\nTest 4: Projections structure');
assert(PROJECTIONS !== null && typeof PROJECTIONS === 'object', 'PROJECTIONS exists');
assert(PROJECTIONS.Hawks[1] === 'Angelini, Christopher', 'Hawks R1 projection correct');
assert(PROJECTIONS.Kings[3] === 'Mashaal, Alexander', 'Kings R3 projection correct (captain)');
assert(PROJECTIONS.Yeti[1] === 'Semanyk, Owen', 'Yeti R1 projection correct (Owen Semanyk)');
assert(PROJECTIONS.Yeti[2] === 'McAlear, Steven', 'Yeti R2 projection correct (Steven - captain)');
assert(PROJECTIONS.Yeti[3] === 'Martin, Euan', 'Yeti R3 projection correct (Euan Martin)');
assert(PROJECTIONS.Yeti[5] === 'McAlear, Peter', 'Yeti R5 projection correct (Peter)');
assert(PROJECTIONS.Lightning[1] === 'Larose, Michael', 'Lightning R1 projection correct (Larose)');
assert(PROJECTIONS.Coyotes[1] === 'Kelly-Menard, Keane', 'Coyotes R1 projection correct (captain)');

// Test 5: Verify Owen Semanyk exists in PLAYERS
console.log('\nTest 5: Owen Semanyk player');
const owenSemanyk = PLAYERS.find(p => p.id === 'Semanyk, Owen');
assert(owenSemanyk !== undefined, 'Owen Semanyk exists in PLAYERS');
assert(owenSemanyk.role === 'skater', 'Owen Semanyk is a skater');
assert(owenSemanyk.returning === false, 'Owen Semanyk is a new player');
assert(owenSemanyk.scoutingScore === 72, 'Owen Semanyk has scoutingScore of 72');
assert(owenSemanyk.notes.includes('Senior A summer standout'), 'Owen Semanyk has Senior A note');

// Test 6: Yeti↔Kings pick swap for rounds 1-4
console.log('\nTest 6: Yeti↔Kings pick swap (rounds 1-4 only)');
// R1 straight: Lightning, Yeti, Coyotes, Devils, Kings, Hawks
assertEquals(E.teamAtPick(0), 'Lightning', 'R1 pick 1: Lightning');
assertEquals(E.teamAtPick(1), 'Yeti', 'R1 pick 2: Yeti (swapped from Kings)');
assertEquals(E.teamAtPick(2), 'Coyotes', 'R1 pick 3: Coyotes');
assertEquals(E.teamAtPick(3), 'Devils', 'R1 pick 4: Devils');
assertEquals(E.teamAtPick(4), 'Kings', 'R1 pick 5: Kings (swapped from Yeti)');
assertEquals(E.teamAtPick(5), 'Hawks', 'R1 pick 6: Hawks');

// R2 reverse: Hawks, Kings, Devils, Coyotes, Yeti, Lightning
assertEquals(E.teamAtPick(6), 'Hawks', 'R2 pick 1: Hawks');
assertEquals(E.teamAtPick(7), 'Kings', 'R2 pick 2: Kings (swapped from Yeti)');
assertEquals(E.teamAtPick(8), 'Devils', 'R2 pick 3: Devils');
assertEquals(E.teamAtPick(9), 'Coyotes', 'R2 pick 4: Coyotes');
assertEquals(E.teamAtPick(10), 'Yeti', 'R2 pick 5: Yeti (swapped from Kings)');
assertEquals(E.teamAtPick(11), 'Lightning', 'R2 pick 6: Lightning');

// R3 straight: Lightning, Yeti, Coyotes, Devils, Kings, Hawks
assertEquals(E.teamAtPick(12), 'Lightning', 'R3 pick 1: Lightning');
assertEquals(E.teamAtPick(13), 'Yeti', 'R3 pick 2: Yeti (swapped from Kings)');
assertEquals(E.teamAtPick(14), 'Coyotes', 'R3 pick 3: Coyotes');
assertEquals(E.teamAtPick(15), 'Devils', 'R3 pick 4: Devils');
assertEquals(E.teamAtPick(16), 'Kings', 'R3 pick 5: Kings (swapped from Yeti)');
assertEquals(E.teamAtPick(17), 'Hawks', 'R3 pick 6: Hawks');

// R4 reverse: Hawks, Kings, Devils, Coyotes, Yeti, Lightning
assertEquals(E.teamAtPick(18), 'Hawks', 'R4 pick 1: Hawks');
assertEquals(E.teamAtPick(19), 'Kings', 'R4 pick 2: Kings (swapped from Yeti)');
assertEquals(E.teamAtPick(20), 'Devils', 'R4 pick 3: Devils');
assertEquals(E.teamAtPick(21), 'Coyotes', 'R4 pick 4: Coyotes');
assertEquals(E.teamAtPick(22), 'Yeti', 'R4 pick 5: Yeti (swapped from Kings)');
assertEquals(E.teamAtPick(23), 'Lightning', 'R4 pick 6: Lightning');

// R5+ original order: Lightning, Kings, Coyotes, Devils, Yeti, Hawks
assertEquals(E.teamAtPick(24), 'Lightning', 'R5 pick 1: Lightning (original order)');
assertEquals(E.teamAtPick(25), 'Kings', 'R5 pick 2: Kings (original order, no swap)');
assertEquals(E.teamAtPick(26), 'Coyotes', 'R5 pick 3: Coyotes (original order)');
assertEquals(E.teamAtPick(27), 'Devils', 'R5 pick 4: Devils (original order)');
assertEquals(E.teamAtPick(28), 'Yeti', 'R5 pick 5: Yeti (original order, no swap)');
assertEquals(E.teamAtPick(29), 'Hawks', 'R5 pick 6: Hawks (original order)');

// Test 7: Verify recommend function works with projections
console.log('\nTest 7: Recommendation with projections');
const rec = E.recommend(state, PLAYERS, PROJECTIONS);
assert(rec !== null, 'Recommendation generated');
assert(rec.player !== null, 'Recommended player exists');
assertEquals(E.currentTeam(state), 'Lightning', 'Lightning picks first');
// Lightning R1 projection is Larose, Michael
assertEquals(rec.player.id, 'Larose, Michael', 'Lightning R1 recommends Larose per projection');

// Test 8: Verify mock draft uses projections with pick swap
console.log('\nTest 8: Mock draft with projections and pick swap');
let mockState = E.createState();
// First few picks with swap in effect:
// Pick 1 (R1): Lightning -> Larose (projection)
// Pick 2 (R1): Yeti (swapped) -> Semanyk, Owen (projection)
// Pick 3 (R1): Coyotes -> Kelly-Menard, Keane (captain projection)
for (let i = 0; i < 5; i++) {
  const team = E.currentTeam(mockState);
  const round = E.roundOf(mockState.history.length);
  const rec = E.recommend(mockState, PLAYERS, PROJECTIONS);
  
  if (rec && PROJECTIONS[team] && PROJECTIONS[team][round]) {
    assertEquals(
      rec.player.id,
      PROJECTIONS[team][round],
      `Pick ${i+1}: ${team} R${round} follows projection`
    );
  }
  
  if (rec) {
    mockState = E.pickPlayer(mockState, PLAYERS, rec.player.id);
  } else {
    mockState = E.skipTurn(mockState, PLAYERS);
  }
}

// Verify Yeti got pick 2 in round 1 (due to swap)
const yetiR1Pick = mockState.history.find(h => h.pick === 2);
assertEquals(yetiR1Pick.team, 'Yeti', 'Yeti got pick 2 in round 1 (swapped with Kings)');
assertEquals(yetiR1Pick.id, 'Semanyk, Owen', 'Yeti picked Owen Semanyk at pick 2');

// Test 9: Verify captain self-picks in projected rounds
console.log('\nTest 9: Captain self-picks');
let testState = E.createState();
// Advance to round 3 for Yeti/Kings captains
const targetHistory = 3 * 6; // End of round 3
while (testState.history.length < targetHistory) {
  const rec = E.recommend(testState, PLAYERS, PROJECTIONS);
  if (rec) {
    testState = E.pickPlayer(testState, PLAYERS, rec.player.id);
  } else {
    testState = E.skipTurn(testState, PLAYERS);
  }
}

const yetiPick = testState.history.find(h => h.id === 'McAlear, Steven');
const kingsPick = testState.history.find(h => h.id === 'Mashaal, Alexander');
assert(yetiPick && yetiPick.team === 'Yeti', 'Steven McAlear drafted by Yeti');
assert(kingsPick && kingsPick.team === 'Kings', 'Alex Mashaal drafted by Kings');
// Verify Yeti captain picked in round 2 (not round 3)
const yetiCaptainRound = E.roundOf(yetiPick.pick - 1);
assertEquals(yetiCaptainRound, 2, 'Steven McAlear picked in round 2 (captain round)');

// Test 10: Run a simulation with projections
console.log('\nTest 10: Simulation with projections');
try {
  const simResults = E.simulate(E.createState(), PLAYERS, PROJECTIONS, 5);
  assert(simResults.runs === 5, 'Simulation completed 5 runs');
  assert(simResults.teams.length === 6, 'Simulation has all 6 teams');
  assert(simResults.targets.length > 0, 'Simulation tracked targets');
} catch (error) {
  failures++;
  console.error(`✗ Simulation failed: ${error.message}`);
}

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passes} passed, ${failures} failed`);
if (failures === 0) {
  console.log('✓ All tests passed!');
  process.exit(0);
} else {
  console.error('✗ Some tests failed');
  process.exit(1);
}
