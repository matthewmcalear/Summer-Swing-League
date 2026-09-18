#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { PLAYERS } = require('../public/westmount-draft/data.js');
const E = require('../public/westmount-draft/draft-engine.js');

const draftJson = JSON.parse(
  fs.readFileSync('/home/ubuntu/.cursor/projects/workspace/uploads/westmount-final-2026_52e5.json', 'utf8')
);

// Manual corrections for names that don't match exactly
const nameCorrections = {
  'Nicholas Unthoff': 'Uhthoff, Nicholas',
  'Christopher Ong Tone': 'Ong Tone, Christopher',
  'Richard Gottlieb August': 'Gottlieb August, Richard',
  'Jean-Francois Pilon': 'Pilon, Jean-François',
  'Marco Morganti': 'MORGANTI, MARCO',
};

function findPlayerId(name) {
  if (nameCorrections[name]) {
    name = nameCorrections[name];
  }
  
  let player = PLAYERS.find(p => p.name === name || p.id === name);
  if (player) return player.id;
  
  const parts = name.split(' ');
  if (parts.length >= 2) {
    const reversed = parts[parts.length - 1] + ', ' + parts.slice(0, -1).join(' ');
    player = PLAYERS.find(p => p.name === reversed || p.id === reversed);
    if (player) return player.id;
  }
  
  throw new Error(`Could not find player ID for '${name}'`);
}

// Create the history array from the draft JSON
const allPicks = [];
for (const [team, picks] of Object.entries(draftJson.teams)) {
  for (const [pickNum, name] of picks) {
    const id = findPlayerId(name);
    allPicks.push({
      pick: parseInt(pickNum, 10),
      team,
      id,
      name,
    });
  }
}

// Sort by pick number
allPicks.sort((a, b) => a.pick - b.pick);

// Validate we have 84 picks
if (allPicks.length !== 84) {
  throw new Error(`Expected 84 picks, got ${allPicks.length}`);
}

// Create the state object
const state = E.createState();
state.history = allPicks.map(p => ({ id: p.id, team: p.team, pick: p.pick }));

console.log('Generated locked draft state with 84 picks');
console.log('Pick order:', state.config.order.join(', '));
console.log('\nFirst 10 picks:');
allPicks.slice(0, 10).forEach(p => {
  console.log(`  #${p.pick}: ${p.name} (${p.team})`);
});

// Generate analysis
console.log('\n=== DRAFT ANALYSIS ===\n');

// Team model values
const teamValues = E.TEAMS.map(team => {
  const roster = E.roster(state, PLAYERS, team);
  const totalValue = roster.reduce((sum, p) => sum + E.score(p, PLAYERS), 0);
  return { team, totalValue, roster };
}).sort((a, b) => b.totalValue - a.totalValue);

console.log('Team Model Values (ranked):');
teamValues.forEach((t, i) => {
  console.log(`  ${i + 1}. ${t.team}: ${t.totalValue.toFixed(1)}`);
});

// Find value picks and reaches
const pickAnalysis = allPicks.map(p => {
  const player = PLAYERS.find(pl => pl.id === p.id);
  const value = E.score(player, PLAYERS);
  const pickNum = p.pick;
  const expectedPick = value > 30 ? Math.max(1, Math.round((50 - value) * 2)) :
                       value > 20 ? Math.round((40 - value) * 3) :
                       Math.round((30 - value) * 4);
  const delta = expectedPick - pickNum;
  return { ...p, value, expectedPick, delta, player };
}).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

console.log('\nTop 5 Value Picks:');
pickAnalysis
  .filter(p => p.delta > 0)
  .slice(0, 5)
  .forEach(p => {
    const pts = p.player.pts !== undefined && p.player.gp > 0 ? ` (${p.player.pts} pts/${p.player.gp} GP)` : '';
    console.log(`  #${p.pick} ${p.name}: ${p.value.toFixed(1)} value${pts}`);
  });

console.log('\nTop 5 Reaches:');
pickAnalysis
  .filter(p => p.delta < 0)
  .slice(0, 5)
  .forEach(p => {
    const pts = p.player.pts !== undefined && p.player.gp > 0 ? ` (${p.player.pts} pts/${p.player.gp} GP)` : '';
    console.log(`  #${p.pick} ${p.name}: ${p.value.toFixed(1)} value${pts}`);
  });

// Yeti analysis
const yetiPicks = allPicks.filter(p => p.team === 'Yeti');
const yetiRoster = E.roster(state, PLAYERS, 'Yeti');
const yetiValue = yetiRoster.reduce((sum, p) => sum + E.score(p, PLAYERS), 0);

console.log('\nYeti Team Analysis:');
console.log('  First 3 picks (plan was Owen, Steven, Euan):');
yetiPicks.slice(0, 3).forEach(p => {
  console.log(`    #${p.pick}: ${p.name}`);
});

const reunionTargets = [
  { name: 'Peter', id: 'McAlear, Peter' },
  { name: 'Toledano', id: 'Toledano, David' },
  { name: 'Thomas', id: 'McAlear, Thomas' },
  { name: 'Matthew', id: 'McAlear, Matthew' },
  { name: 'Daniel', id: 'McAlear, Daniel' },
];

console.log('  Reunion targets:');
reunionTargets.forEach(t => {
  const pick = allPicks.find(p => p.id === t.id);
  if (pick) {
    console.log(`    ${t.name}: #${pick.pick} (${pick.team})`);
  }
});

// Position shape
console.log('\nPosition Shape per Team:');
E.TEAMS.forEach(team => {
  const roster = E.roster(state, PLAYERS, team);
  const forwards = roster.filter(p => p.pos === 'F' || (p.pos && p.pos.includes('F'))).length;
  const defense = roster.filter(p => p.pos === 'D' || (p.pos && p.pos.includes('D') && !p.pos.includes('F'))).length;
  const goalies = roster.filter(p => p.role === 'goalie').length;
  const unknown = roster.filter(p => !p.pos || p.pos === '').length;
  console.log(`  ${team}: ${forwards}F / ${defense}D / ${goalies}G${unknown > 0 ? ` / ${unknown}?` : ''}`);
});

// Export the state
const output = {
  state,
  analysis: {
    teamValues: teamValues.map(t => ({ team: t.team, value: t.totalValue })),
    topValuePicks: pickAnalysis.filter(p => p.delta > 0).slice(0, 5).map(p => ({
      pick: p.pick,
      name: p.name,
      team: p.team,
      value: p.value,
      pts: p.player.pts,
      gp: p.player.gp,
    })),
    topReaches: pickAnalysis.filter(p => p.delta < 0).slice(0, 5).map(p => ({
      pick: p.pick,
      name: p.name,
      team: p.team,
      value: p.value,
      pts: p.player.pts,
      gp: p.player.gp,
    })),
  },
};

fs.writeFileSync(
  path.join(__dirname, '../public/westmount-draft/locked-draft-2026.json'),
  JSON.stringify(output, null, 2)
);

console.log('\n✓ Locked draft state saved to public/westmount-draft/locked-draft-2026.json');
