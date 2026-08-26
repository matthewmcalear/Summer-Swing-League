'use client';

import { useState, useEffect, useMemo } from 'react';
import { westmountPlayers, WestmountPlayer } from '@/data/westmount-players';
import { ChevronDown, ChevronUp, RotateCcw, Zap, Info, TrendingUp } from 'lucide-react';

type Team = 'Yeti' | 'Devils' | 'Kings' | 'Flyers' | 'Hawks';
type FilterType = 'all' | 'available' | 'F' | 'D' | 'G' | 'no-stats' | 'yeti' | 'assumed';
type Position = 'F' | 'D' | 'G';
type ViewMode = 'board' | 'teams';

interface DraftState {
  rosters: Record<Team, string[]>;
  pickHistory: Array<{ team: Team; player: string }>;
  yetiPickSlot: number;
  keepFamily: boolean;
}

const TEAMS: Team[] = ['Yeti', 'Devils', 'Kings', 'Flyers', 'Hawks'];

// Calculate player value for draft with non-linear surplus scoring
function calculateValue(p: WestmountPlayer): number {
  if (p.role === 'goalie') {
    // 4 goalies, 5 teams. A starter is a first-round asset.
    const ageAdj = Math.max(0, 40 - (p.age || 25)) * 0.6;
    return 52 + ageAdj;
  }
  if (!p.returning) {
    // New skaters: placeholder ~8 (negative vs 18 pt replacement)
    return 8 + Math.max(0, 28 - (p.age || 25)) * 0.3;
  }
  
  // Returning skaters: blend last-year stats as raw expected points
  let raw = (p.pts || 0) * 0.6 + (p.ppg || 0) * (p.gp || 0) * 0.4;
  
  // Discount for players who missed half+ and likely to miss again (expected 10/32 GP)
  if (p.missedHalf) {
    raw *= (10 / 32); // Expected GP ratio
  }
  
  // Replacement level: 18 pts / 28 GP (0.64 P/G)
  const replacement = 18;
  const surplus = raw - replacement;
  
  // Non-linear scoring: elites and duds swing games more than linear points
  let score: number;
  if (surplus >= 0) {
    // Above replacement: convex bonus for elites
    score = surplus + 0.008 * surplus * surplus;
  } else {
    // Below replacement: penalty for duds (1.4x)
    score = surplus * 1.4;
  }
  
  return score;
}

// Determine position from player data
function getPosition(p: WestmountPlayer): Position {
  if (p.role === 'goalie') return 'G';
  if (p.ly_pos === 'D') return 'D';
  return 'F';
}

// Calculate need-based adjustment for teams with communal reunion preferences
function needBump(p: WestmountPlayer, roster: string[], team: Team): number {
  const players = roster.map(name => westmountPlayers.find(pl => pl.name === name)).filter(Boolean) as WestmountPlayer[];
  const dCount = players.filter(x => getPosition(x) === 'D').length;
  const gCount = players.filter(x => getPosition(x) === 'G').length;
  const pos = getPosition(p);
  
  let bump = 0;
  
  // Positional needs (universal)
  if (pos === 'G' && gCount === 0) bump += 18;  // take a starter early
  if (pos === 'G' && gCount >= 1) bump -= 25;  // don't stockpile
  if (pos === 'D' && dCount === 0) bump += 8;   // need a defenseman
  
  // MAIN AFFINITY: Reunion - captains re-draft last year's teammates
  if (p.ly_team === team) {
    bump += 8; // Last-year teammate reunion
  }
  
  // SPECIFIC EXCEPTIONS layered on top:
  
  // Yeti/Steven: extra bump for McAlear family
  if (team === 'Yeti' && p.name.includes('McAlear')) {
    bump += 18; // Total +26 if also last-year Yeti, or +18 if not
  }
  
  // Hawks/Ciampini: extra bump for his guys
  if (team === 'Hawks') {
    if (p.name.includes('Angelini') || p.name.includes('Orsini') || p.name.includes('Ciampini')) {
      bump += 10; // Total +18 if also last-year Hawks, or +10 if not
    }
  }
  
  // Devils/Phil: extra bump for Yarrow goalie specifically
  if (team === 'Devils' && p.name.includes('Yarrow') && p.role === 'goalie') {
    bump += 22; // Total +30 if also last-year Devils, or +22 if not (Phil takes Yarrow)
  }
  
  return bump;
}

export default function WestmountDraftPage() {
  const [state, setState] = useState<DraftState>({
    rosters: {
      Yeti: ['McAlear, Steven'],
      Devils: [],
      Kings: [],
      Flyers: [],
      Hawks: [],
    },
    pickHistory: [],
    yetiPickSlot: 4, // Last year's position
    keepFamily: false,
  });
  
  const [filter, setFilter] = useState<FilterType>('all');
  const [showHelp, setShowHelp] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('wsl-draft-v1');
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load draft state', e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('wsl-draft-v1', JSON.stringify(state));
  }, [state]);

  // Get team order for a given round/pick
  // Last year order: Kings-Hawks-Devils-Yeti-Flyers
  const getTeamOrder = useMemo(() => {
    return (pickNum: number, yetiPickSlot: number): Team => {
      const round = Math.floor((pickNum - 1) / 5) + 1;
      const posInRound = ((pickNum - 1) % 5) + 1;
      
      let pickOrder: number[];
      if (round % 2 === 1) {
        pickOrder = [1, 2, 3, 4, 5];
      } else {
        pickOrder = [5, 4, 3, 2, 1];
      }
      
      const teamOrder: Team[] = [];
      for (let slot of pickOrder) {
        if (slot === yetiPickSlot) {
          teamOrder.push('Yeti');
        } else {
          const others = TEAMS.filter(t => t !== 'Yeti');
          const otherSlots = [1, 2, 3, 4, 5].filter(s => s !== yetiPickSlot);
          const idx = otherSlots.indexOf(slot);
          teamOrder.push(others[idx]);
        }
      }
      
      return teamOrder[posInRound - 1];
    };
  }, []);

  // Calculate current pick
  const currentPick = useMemo(() => {
    const { pickHistory, yetiPickSlot } = state;
    const pickNum = pickHistory.length + 1;
    const round = Math.floor((pickNum - 1) / 5) + 1;
    
    return {
      pickNum,
      round,
      team: getTeamOrder(pickNum, yetiPickSlot),
    };
  }, [state.pickHistory, state.yetiPickSlot, getTeamOrder]);

  // Get drafted players
  const draftedPlayers = useMemo(() => {
    return new Set(Object.values(state.rosters).flat());
  }, [state.rosters]);

  // Team standings with projections
  const standings = useMemo(() => {
    // Simulate remaining picks to calculate projected values
    const simulateDraft = () => {
      const simRosters = { ...state.rosters };
      Object.keys(simRosters).forEach(team => {
        simRosters[team as Team] = [...simRosters[team as Team]];
      });
      
      const drafted = new Set(Object.values(simRosters).flat());
      const totalPicks = westmountPlayers.length;
      
      for (let pickNum = state.pickHistory.length + 1; pickNum <= totalPicks; pickNum++) {
        const team = getTeamOrder(pickNum, state.yetiPickSlot);
        const available = westmountPlayers.filter(p => !drafted.has(p.name));
        
        if (available.length === 0) break;
        
        // BPA with needBump
        const scoredPlayers = available.map(p => {
          let score = calculateValue(p);
          score += needBump(p, simRosters[team], team);
          return { player: p, score };
        });
        
        scoredPlayers.sort((a, b) => b.score - a.score);
        const pick = scoredPlayers[0].player;
        
        simRosters[team].push(pick.name);
        drafted.add(pick.name);
      }
      
      return simRosters;
    };
    
    const projectedRosters = simulateDraft();
    
    const teamStats = TEAMS.map(team => {
      const roster = state.rosters[team];
      const projRoster = projectedRosters[team];
      const players = roster.map(name => westmountPlayers.find(p => p.name === name)).filter(Boolean) as WestmountPlayer[];
      const projPlayers = projRoster.map(name => westmountPlayers.find(p => p.name === name)).filter(Boolean) as WestmountPlayer[];
      
      const nowValue = players.reduce((sum, p) => sum + calculateValue(p), 0);
      const projValue = projPlayers.reduce((sum, p) => sum + calculateValue(p), 0);
      const lastYearPts = players.reduce((sum, p) => sum + (p.pts || 0), 0);
      
      const goalies = players.filter(p => p.role === 'goalie');
      const goalieName = goalies.length > 0 ? goalies[0].name.split(', ').reverse().join(' ') : null;
      
      return {
        team,
        nowValue,
        projValue,
        lastYearPts,
        goalie: goalieName,
        rosterSize: roster.length,
      };
    });
    
    // Calculate win probabilities using softmax
    const expValues = teamStats.map(t => Math.exp(t.projValue / 80));
    const sumExp = expValues.reduce((a, b) => a + b, 0);
    const winProbs = expValues.map(v => Math.round((v / sumExp) * 100));
    
    const withProbs = teamStats.map((t, i) => ({ ...t, winPct: winProbs[i] }));
    withProbs.sort((a, b) => b.projValue - a.projValue);
    
    return withProbs;
  }, [state.rosters, state.pickHistory, state.yetiPickSlot, getTeamOrder]);

  // Calculate recommendations for current pick
  const recommendations = useMemo(() => {
    const available = westmountPlayers.filter(p => !draftedPlayers.has(p.name));
    if (available.length === 0) return [];
    
    const team = currentPick.team;
    const roster = state.rosters[team];
    
    // Score all available players with needBump
    const scored = available.map(p => {
      let score = calculateValue(p);
      const bump = needBump(p, roster, team);
      score += bump;
      
      // Keep family bonus if enabled and Yeti is picking
      if (team === 'Yeti' && state.keepFamily && p.name.includes('McAlear')) {
        score += 5;
      }
      
      // Determine why this is recommended
      let why = 'Best value';
      const pos = getPosition(p);
      const rosterPlayers = roster.map(name => westmountPlayers.find(pl => pl.name === name)).filter(Boolean) as WestmountPlayer[];
      const gCount = rosterPlayers.filter(x => getPosition(x) === 'G').length;
      const dCount = rosterPlayers.filter(x => getPosition(x) === 'D').length;
      
      if (team === 'Yeti' && p.name.includes('McAlear') && bump >= 18) why = 'Family';
      else if (pos === 'G' && gCount === 0 && bump > 15) why = 'Need a goalie';
      else if (pos === 'D' && dCount === 0 && bump > 5) why = 'Need a D';
      else if (p.ly_team === team) why = `Last-year ${team}`;
      else if (bump > 5) why = 'Positional need';
      
      return { player: p, score, why };
    });
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3); // Top 3 recommendations
  }, [draftedPlayers, currentPick.team, state.rosters, state.keepFamily]);

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let players = westmountPlayers.filter(p => {
      if (draftedPlayers.has(p.name)) return false;
      
      if (filter === 'available') return true;
      if (filter === 'F') return getPosition(p) === 'F';
      if (filter === 'D') return getPosition(p) === 'D';
      if (filter === 'G') return p.role === 'goalie';
      if (filter === 'no-stats') return !p.returning;
      if (filter === 'yeti') return p.ly_team === 'Yeti';
      if (filter === 'assumed') return p.assumed === true;
      return true;
    });
    
    // Sort by value descending
    return players.sort((a, b) => calculateValue(b) - calculateValue(a));
  }, [filter, draftedPlayers]);

  // Draft a player
  const draftPlayer = (playerName: string) => {
    setState(prev => ({
      ...prev,
      rosters: {
        ...prev.rosters,
        [currentPick.team]: [...prev.rosters[currentPick.team], playerName],
      },
      pickHistory: [...prev.pickHistory, { team: currentPick.team, player: playerName }],
    }));
  };

  // Undo last pick
  const undoLastPick = () => {
    if (state.pickHistory.length === 0) return;
    
    const lastPick = state.pickHistory[state.pickHistory.length - 1];
    setState(prev => ({
      ...prev,
      rosters: {
        ...prev.rosters,
        [lastPick.team]: prev.rosters[lastPick.team].filter(p => p !== lastPick.player),
      },
      pickHistory: prev.pickHistory.slice(0, -1),
    }));
  };

  // Reset draft
  const resetDraft = () => {
    if (confirm('Reset the entire draft? This cannot be undone.')) {
      setState({
        rosters: {
          Yeti: ['McAlear, Steven'],
          Devils: [],
          Kings: [],
          Flyers: [],
          Hawks: [],
        },
        pickHistory: [],
        yetiPickSlot: state.yetiPickSlot,
        keepFamily: state.keepFamily,
      });
    }
  };

  // Mock draft (CPU picks)
  const mockDraft = () => {
    setState(prev => {
      const newState = { ...prev };
      const maxPicks = westmountPlayers.length;
      
      while (newState.pickHistory.length < maxPicks) {
        const pickNum = newState.pickHistory.length + 1;
        const team = getTeamOrder(pickNum, newState.yetiPickSlot);
        const drafted = new Set(Object.values(newState.rosters).flat());
        const available = westmountPlayers.filter(p => !drafted.has(p.name));
        
        if (available.length === 0) break;
        
        // CPU logic: BPA with positional need and political preferences
        const scoredPlayers = available.map(p => {
          let score = calculateValue(p);
          
          // Apply need bump for ALL teams with political preferences
          score += needBump(p, newState.rosters[team], team);
          
          // Keep family logic (only if toggle is ON and Yeti is picking)
          if (team === 'Yeti' && newState.keepFamily && p.name.includes('McAlear')) {
            score += 5;
          }
          
          return { player: p, score };
        });
        
        scoredPlayers.sort((a, b) => b.score - a.score);
        const pick = scoredPlayers[0].player;
        
        newState.rosters[team] = [...newState.rosters[team], pick.name];
        newState.pickHistory.push({ team, player: pick.name });
      }
      
      return newState;
    });
  };

  return (
    <div className="min-h-screen bg-stone-50 text-gray-900 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-center text-gray-900">Westmount Senior B Draft</h1>
          <div className="text-center text-sm text-gray-600 mt-1">
            Pick {currentPick.pickNum} · Round {currentPick.round} · <span className="text-green-700 font-semibold">{currentPick.team}</span> on the clock
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 justify-center mt-2">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                viewMode === 'board'
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode('teams')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                viewMode === 'teams'
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Teams
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            <button
              onClick={undoLastPick}
              disabled={state.pickHistory.length === 0}
              className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs font-medium transition text-gray-700"
            >
              <RotateCcw className="inline w-3 h-3 mr-1" /> Undo
            </button>
            <button
              onClick={mockDraft}
              className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded text-xs font-medium transition text-gray-700"
            >
              <Zap className="inline w-3 h-3 mr-1" /> Mock
            </button>
            <button
              onClick={resetDraft}
              className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded text-xs font-medium transition text-gray-700"
            >
              Reset
            </button>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded text-xs font-medium transition text-gray-700"
            >
              <Info className="inline w-3 h-3 mr-1" /> Info
            </button>
          </div>
          
          {/* Settings */}
          <div className="mt-3 flex flex-wrap gap-4 justify-center text-sm">
            <label className="flex items-center gap-2">
              <span className="text-gray-400">Yeti picks at:</span>
              <select
                value={state.yetiPickSlot}
                onChange={(e) => setState(prev => ({ ...prev, yetiPickSlot: Number(e.target.value) }))}
                disabled={state.pickHistory.length > 0}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white disabled:opacity-50"
              >
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={state.keepFamily}
                onChange={(e) => setState(prev => ({ ...prev, keepFamily: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-gray-400">Keep McAlear family together</span>
            </label>
          </div>
          
          {/* Help Text */}
          {showHelp && (
            <div className="mt-3 p-3 bg-gray-700 rounded text-xs space-y-2">
              <p><strong>Value Formula:</strong></p>
              <ul className="ml-4 space-y-1 text-gray-300">
                <li>• Skaters (returning): 0.6×PTS + 0.4×P/G×GP (last year)</li>
                <li>• Skaters (new): 8 + 0.3×max(0, 28-age)</li>
                <li>• Goalies: 52 + 0.6×max(0, 40-age), because 4 G / 5 teams</li>
              </ul>
              <p><strong>Draft Adjustments (all teams):</strong></p>
              <ul className="ml-4 space-y-1 text-gray-300">
                <li>• Empty-net teams get +18 to grab a starter</li>
                <li>• Second goalies get -25 (don't stockpile)</li>
                <li>• Teams without D get +8</li>
              </ul>
              <p className="mt-2"><strong>Projections:</strong></p>
              <ul className="ml-4 space-y-1 text-gray-300">
                <li>• Model win% = projected chance of finishing 1st (not betting odds)</li>
                <li>• Proj value = current + simulated remaining picks (BPA + needBump)</li>
                <li>• Win% = softmax(exp(projValue/80))</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Recommendation Card - Compact */}
      {recommendations.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 mt-3">
          <div className="bg-white border-2 border-green-600 rounded-lg p-3 shadow-md">
            <div className="text-xs text-gray-500 font-medium mb-1">Suggested Pick:</div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-gray-900 truncate">
                  {recommendations[0].player.name.split(', ').reverse().join(' ')}
                  {recommendations[0].player.traded && <span className="ml-2 text-xs text-purple-600">↔</span>}
                  {recommendations[0].player.missedHalf && <span className="ml-2 text-xs text-red-600">½</span>}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {getPosition(recommendations[0].player)} · {calculateValue(recommendations[0].player).toFixed(1)} · {recommendations[0].why}
                </div>
              </div>
              <button
                onClick={() => draftPlayer(recommendations[0].player.name)}
                className="px-4 py-2 bg-green-700 text-white rounded font-bold text-sm hover:bg-green-800 transition whitespace-nowrap shadow-sm"
              >
                PICK
              </button>
            </div>
            {recommendations.length > 1 && (
              <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-1 text-xs">
                {recommendations.slice(1).map((rec, idx) => (
                  <button
                    key={rec.player.name}
                    onClick={() => draftPlayer(rec.player.name)}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
                  >
                    {idx + 2}. {rec.player.name.split(', ').pop()} ({calculateValue(rec.player).toFixed(0)})
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Standings Strip - Compact */}
      <div className="max-w-4xl mx-auto px-4 mt-3">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">Team</th>
                <th className="px-2 py-1.5 text-center font-medium">Win%</th>
                <th className="px-2 py-1.5 text-right font-medium">Proj</th>
                <th className="px-2 py-1.5 text-center font-medium">G</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, idx) => (
                <tr
                  key={s.team}
                  className={`border-t border-gray-100 ${s.team === 'Yeti' ? 'bg-green-50' : ''} ${currentPick.team === s.team ? 'bg-yellow-50' : ''}`}
                >
                  <td className="px-2 py-1.5 font-medium text-gray-900">{idx + 1}. {s.team}</td>
                  <td className="px-2 py-1.5 text-center text-green-700 font-semibold">{s.winPct}%</td>
                  <td className="px-2 py-1.5 text-right text-gray-700">{s.projValue.toFixed(0)}</td>
                  <td className="px-2 py-1.5 text-center text-gray-500">{s.goalie ? s.goalie.split(' ').pop() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewMode === 'board' ? (
        <>
          {/* Filters */}
          <div className="max-w-4xl mx-auto px-4 mt-3">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {(['all', 'available', 'F', 'D', 'G', 'yeti'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-1 rounded transition ${
                    filter === f
                      ? 'bg-green-700 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'available' ? 'Available' : f === 'yeti' ? 'Yeti' : f}
                </button>
              ))}
            </div>
          </div>

          {/* Player Board */}
          <div className="max-w-4xl mx-auto px-4 mt-2">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium">Name</th>
                      <th className="px-2 py-1.5 text-center font-medium">Pos</th>
                      <th className="px-2 py-1.5 text-center font-medium">Val</th>
                      <th className="px-2 py-1.5 text-center font-medium">PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((p, idx) => {
                      const value = calculateValue(p);
                      const isRecommended = recommendations.length > 0 && recommendations[0].player.name === p.name;
                      
                      return (
                        <tr
                          key={p.name}
                          onClick={() => draftPlayer(p.name)}
                          className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition ${
                            isRecommended ? 'bg-green-50 border-l-4 border-l-green-600' : ''
                          }`}
                        >
                          <td className="px-3 py-1.5 text-gray-900">
                            {isRecommended && <span className="mr-1 text-green-600">★</span>}
                            {p.name}
                            {p.ly_adp && <span className="ml-1 text-gray-400">{p.ly_adp}</span>}
                            {p.traded && <span className="ml-1 text-purple-600">↔</span>}
                            {p.missedHalf && <span className="ml-1 text-red-600">½</span>}
                          </td>
                          <td className="px-2 py-1.5 text-center text-gray-600">{getPosition(p)}</td>
                          <td className="px-2 py-1.5 text-center font-semibold text-green-700">{value.toFixed(1)}</td>
                          <td className="px-2 py-1.5 text-center text-gray-600">{p.pts || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Teams View */
        <div className="max-w-4xl mx-auto px-4 mt-3">
          <div className="space-y-3">
            {standings.map((s) => {
              const roster = state.rosters[s.team];
              const players = roster.map(name => westmountPlayers.find(p => p.name === name)).filter(Boolean) as WestmountPlayer[];
              const hasGoalie = players.some(p => p.role === 'goalie');
              
              return (
                <div 
                  key={s.team} 
                  className={`bg-white rounded-lg border p-3 shadow-sm ${s.team === 'Yeti' ? 'border-green-500 bg-green-50' : 'border-gray-200'} ${currentPick.team === s.team ? 'border-yellow-500 bg-yellow-50' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{s.team}</h3>
                      <div className="text-xs text-gray-600">
                        #{standings.findIndex(st => st.team === s.team) + 1} · 
                        {s.winPct}% · 
                        Proj {s.projValue.toFixed(0)}
                      </div>
                    </div>
                    {!hasGoalie && roster.length > 0 && (
                      <div className="bg-red-100 border border-red-300 px-2 py-0.5 rounded text-xs font-semibold text-red-700">
                        NO G
                      </div>
                    )}
                  </div>
                  
                  {roster.length === 0 ? (
                    <p className="text-gray-400 text-xs italic">No players drafted</p>
                  ) : (
                    <div className="space-y-1">
                      {players.map((p, idx) => {
                        const value = calculateValue(p);
                        
                        return (
                          <div key={idx} className="text-xs flex justify-between items-center py-0.5 border-t border-gray-100">
                            <span className="text-gray-900">
                              {idx + 1}. {p.name.split(', ').reverse().join(' ')}
                              {p.traded && <span className="ml-1 text-purple-600">↔</span>}
                              {p.missedHalf && <span className="ml-1 text-red-600">½</span>}
                            </span>
                            <span className="text-gray-600">
                              {getPosition(p)} · {value.toFixed(0)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
