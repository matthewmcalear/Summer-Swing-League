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
assertEquals(state.config.captainRounds.Yeti, 3, 'Yeti captain round is 3');
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
assert(PROJECTIONS.Yeti[3] === 'McAlear, Steven', 'Yeti R3 projection correct (captain)');
assert(PROJECTIONS.Yeti[5] === 'McAlear, Peter', 'Yeti R5 projection correct');
assert(PROJECTIONS.Coyotes[1] === 'Kelly-Menard, Keane', 'Coyotes R1 projection correct (captain)');

// Test 5: Verify recommend function works with projections
console.log('\nTest 5: Recommendation with projections');
const rec = E.recommend(state, PLAYERS, PROJECTIONS);
assert(rec !== null, 'Recommendation generated');
assert(rec.player !== null, 'Recommended player exists');
assertEquals(rec.player.id, 'Angelini, Christopher', 'First pick follows Hawks projection');

// Test 6: Verify mock draft uses projections
console.log('\nTest 6: Mock draft with projections');
let mockState = E.createState();
for (let i = 0; i < 5; i++) {
  const team = E.currentTeam(mockState);
  const round = E.roundOf(mockState.history.length);
  const rec = E.recommend(mockState, PLAYERS, PROJECTIONS);
  
  if (rec && team !== 'Yeti' && PROJECTIONS[team] && PROJECTIONS[team][round]) {
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

// Test 7: Verify captain self-picks in projected rounds
console.log('\nTest 7: Captain self-picks');
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

// Test 8: Run a simulation with projections
console.log('\nTest 8: Simulation with projections');
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
