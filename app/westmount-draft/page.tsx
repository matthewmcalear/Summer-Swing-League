'use client';

import { useState, useEffect, useMemo } from 'react';
import { westmountPlayers, WestmountPlayer } from '@/data/westmount-players';
import { ChevronDown, ChevronUp, RotateCcw, Zap, Info, TrendingUp } from 'lucide-react';

type Team = 'McAlear' | 'Devils' | 'Kings' | 'Flyers' | 'Hawks';
type FilterType = 'all' | 'available' | 'F' | 'D' | 'G' | 'no-stats' | 'yeti';
type Position = 'F' | 'D' | 'G';
type ViewMode = 'board' | 'teams';

interface DraftState {
  rosters: Record<Team, string[]>;
  pickHistory: Array<{ team: Team; player: string }>;
  mcalearPickSlot: number;
  keepFamily: boolean;
}

const TEAMS: Team[] = ['McAlear', 'Devils', 'Kings', 'Flyers', 'Hawks'];

// Calculate player value for draft
function calculateValue(p: WestmountPlayer): number {
  if (p.role === 'goalie') {
    // 4 goalies, 5 teams. A starter is a first-round asset.
    const ageAdj = Math.max(0, 40 - (p.age || 25)) * 0.6;
    return 52 + ageAdj;
  }
  if (!p.returning) {
    return 8 + Math.max(0, 28 - (p.age || 25)) * 0.3;
  }
  return (p.pts || 0) * 0.6 + (p.ppg || 0) * (p.gp || 0) * 0.4;
}

// Determine position from player data
function getPosition(p: WestmountPlayer): Position {
  if (p.role === 'goalie') return 'G';
  if (p.ly_pos === 'D') return 'D';
  return 'F';
}

// Calculate need-based adjustment for teams
function needBump(p: WestmountPlayer, roster: string[]): number {
  const players = roster.map(name => westmountPlayers.find(pl => pl.name === name)).filter(Boolean) as WestmountPlayer[];
  const dCount = players.filter(x => getPosition(x) === 'D').length;
  const gCount = players.filter(x => getPosition(x) === 'G').length;
  const pos = getPosition(p);
  
  if (pos === 'G' && gCount === 0) return 18;  // take a starter early
  if (pos === 'G' && gCount >= 1) return -25;  // don't stockpile
  if (pos === 'D' && dCount === 0) return 8;   // need a defenseman
  return 0;
}

export default function WestmountDraftPage() {
  const [state, setState] = useState<DraftState>({
    rosters: {
      McAlear: ['McAlear, Steven'],
      Devils: [],
      Kings: [],
      Flyers: [],
      Hawks: [],
    },
    pickHistory: [],
    mcalearPickSlot: 3,
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
  const getTeamOrder = useMemo(() => {
    return (pickNum: number, mcalearPickSlot: number): Team => {
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
        if (slot === mcalearPickSlot) {
          teamOrder.push('McAlear');
        } else {
          const others = TEAMS.filter(t => t !== 'McAlear');
          const otherSlots = [1, 2, 3, 4, 5].filter(s => s !== mcalearPickSlot);
          const idx = otherSlots.indexOf(slot);
          teamOrder.push(others[idx]);
        }
      }
      
      return teamOrder[posInRound - 1];
    };
  }, []);

  // Calculate current pick
  const currentPick = useMemo(() => {
    const { pickHistory, mcalearPickSlot } = state;
    const pickNum = pickHistory.length + 1;
    const round = Math.floor((pickNum - 1) / 5) + 1;
    
    return {
      pickNum,
      round,
      team: getTeamOrder(pickNum, mcalearPickSlot),
    };
  }, [state.pickHistory, state.mcalearPickSlot, getTeamOrder]);

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
        const team = getTeamOrder(pickNum, state.mcalearPickSlot);
        const available = westmountPlayers.filter(p => !drafted.has(p.name));
        
        if (available.length === 0) break;
        
        // BPA with needBump
        const scoredPlayers = available.map(p => {
          let score = calculateValue(p);
          score += needBump(p, simRosters[team]);
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
  }, [state.rosters, state.pickHistory, state.mcalearPickSlot, getTeamOrder]);

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
          McAlear: ['McAlear, Steven'],
          Devils: [],
          Kings: [],
          Flyers: [],
          Hawks: [],
        },
        pickHistory: [],
        mcalearPickSlot: state.mcalearPickSlot,
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
        const team = getTeamOrder(pickNum, newState.mcalearPickSlot);
        const drafted = new Set(Object.values(newState.rosters).flat());
        const available = westmountPlayers.filter(p => !drafted.has(p.name));
        
        if (available.length === 0) break;
        
        // CPU logic: BPA with positional need
        const scoredPlayers = available.map(p => {
          let score = calculateValue(p);
          
          // Apply need bump for ALL teams
          score += needBump(p, newState.rosters[team]);
          
          // Keep family logic (only if toggle is ON and McAlear is picking)
          if (team === 'McAlear' && newState.keepFamily && p.name.includes('McAlear')) {
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
    <div className="min-h-screen bg-gray-900 text-white pb-8">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-center mb-2">Westmount Senior B Draft</h1>
          <div className="text-center text-sm text-gray-400 mb-3">
            Pick {currentPick.pickNum} · Round {currentPick.round} · <span className="text-blue-400 font-semibold">{currentPick.team}</span> on the clock
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex gap-2 justify-center mb-3">
            <button
              onClick={() => setViewMode('board')}
              className={`px-4 py-2 rounded font-medium transition ${
                viewMode === 'board'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode('teams')}
              className={`px-4 py-2 rounded font-medium transition ${
                viewMode === 'teams'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Teams
            </button>
          </div>
          
          {/* Controls */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={undoLastPick}
              disabled={state.pickHistory.length === 0}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded text-sm font-medium transition"
            >
              <RotateCcw className="inline w-4 h-4 mr-1" /> Undo
            </button>
            <button
              onClick={mockDraft}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition"
            >
              <Zap className="inline w-4 h-4 mr-1" /> Mock Draft
            </button>
            <button
              onClick={resetDraft}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition"
            >
              Reset
            </button>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
            >
              <Info className="inline w-4 h-4 mr-1" /> {showHelp ? 'Hide' : 'Help'}
            </button>
          </div>
          
          {/* Settings */}
          <div className="mt-3 flex flex-wrap gap-4 justify-center text-sm">
            <label className="flex items-center gap-2">
              <span className="text-gray-400">McAlear picks at:</span>
              <select
                value={state.mcalearPickSlot}
                onChange={(e) => setState(prev => ({ ...prev, mcalearPickSlot: Number(e.target.value) }))}
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
              <span className="text-gray-400">Keep family together (McAlear)</span>
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

      {/* Standings Strip */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-700 text-gray-300 uppercase">
                <tr>
                  <th className="px-2 py-2 text-left">Rk</th>
                  <th className="px-2 py-2 text-left">Team</th>
                  <th className="px-2 py-2 text-center" title="Model projected win probability">Win%</th>
                  <th className="px-2 py-2 text-right">Now</th>
                  <th className="px-2 py-2 text-right">Proj</th>
                  <th className="px-2 py-2 text-right">LY PTS</th>
                  <th className="px-2 py-2 text-center">G</th>
                  <th className="px-2 py-2 text-center">#</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, idx) => (
                  <tr
                    key={s.team}
                    className={`border-t border-gray-700 ${s.team === 'McAlear' ? 'bg-blue-900/30' : ''} ${currentPick.team === s.team ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <td className="px-2 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-2 py-2 font-semibold">{s.team}</td>
                    <td className="px-2 py-2 text-center text-green-400">{s.winPct}%</td>
                    <td className="px-2 py-2 text-right text-gray-300">{s.nowValue.toFixed(0)}</td>
                    <td className="px-2 py-2 text-right text-blue-400 font-semibold">{s.projValue.toFixed(0)}</td>
                    <td className="px-2 py-2 text-right text-gray-400">{s.lastYearPts}</td>
                    <td className="px-2 py-2 text-center text-xs text-gray-400">{s.goalie ? s.goalie.split(' ').pop() : '—'}</td>
                    <td className="px-2 py-2 text-center text-gray-400">{s.rosterSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {viewMode === 'board' ? (
        <>
          {/* Filters */}
          <div className="max-w-4xl mx-auto px-4 mt-4">
            <div className="flex flex-wrap gap-2 text-sm">
              {(['all', 'available', 'F', 'D', 'G', 'no-stats', 'yeti'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded font-medium transition ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'available' ? 'Available' : f === 'F' ? 'Forwards' : f === 'D' ? 'Defense' : f === 'G' ? 'Goalies' : f === 'no-stats' ? 'No Stats' : 'Last Year Yeti'}
                </button>
              ))}
            </div>
          </div>

          {/* Player Board */}
          <div className="max-w-4xl mx-auto px-4 mt-4">
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700 text-gray-300 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-2 py-2 text-center">Pos</th>
                      <th className="px-2 py-2 text-center">Age</th>
                      <th className="px-2 py-2 text-center">Value</th>
                      <th className="px-2 py-2 text-center">PTS</th>
                      <th className="px-2 py-2 text-center">P/G</th>
                      <th className="px-2 py-2 text-center">G</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((p, idx) => {
                      const isYeti = p.ly_team === 'Yeti';
                      const value = calculateValue(p);
                      
                      return (
                        <tr
                          key={p.name}
                          onClick={() => draftPlayer(p.name)}
                          className="border-t border-gray-700 hover:bg-gray-700 cursor-pointer transition"
                        >
                          <td className="px-3 py-2 font-medium">
                            {p.name}
                            {isYeti && <span className="ml-2 text-xs bg-yellow-600 text-black px-1.5 py-0.5 rounded font-bold">YETI</span>}
                          </td>
                          <td className="px-2 py-2 text-center text-gray-400">{getPosition(p)}</td>
                          <td className="px-2 py-2 text-center text-gray-400">{p.age || '—'}</td>
                          <td className="px-2 py-2 text-center font-semibold text-blue-400">{value.toFixed(1)}</td>
                          <td className="px-2 py-2 text-center text-gray-400">{p.pts || '—'}</td>
                          <td className="px-2 py-2 text-center text-gray-400">{p.ppg?.toFixed(2) || '—'}</td>
                          <td className="px-2 py-2 text-center text-gray-400">{p.g || '—'}</td>
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
        <div className="max-w-4xl mx-auto px-4 mt-6">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <TrendingUp size={22} /> Full Rosters
          </h2>
          <div className="space-y-4">
            {standings.map((s) => {
              const roster = state.rosters[s.team];
              const players = roster.map(name => westmountPlayers.find(p => p.name === name)).filter(Boolean) as WestmountPlayer[];
              const hasGoalie = players.some(p => p.role === 'goalie');
              
              // Sort by pick order (order in roster array)
              return (
                <div 
                  key={s.team} 
                  className={`bg-gray-800 rounded-lg p-4 ${s.team === 'McAlear' ? 'ring-2 ring-blue-500' : ''} ${currentPick.team === s.team ? 'ring-2 ring-yellow-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-xl">{s.team}</h3>
                      <div className="text-xs text-gray-400 mt-1">
                        Rank #{standings.findIndex(st => st.team === s.team) + 1} · 
                        Win% {s.winPct}% · 
                        Proj {s.projValue.toFixed(0)}
                      </div>
                    </div>
                    {!hasGoalie && roster.length > 0 && (
                      <div className="bg-red-900/50 border border-red-700 px-2 py-1 rounded text-xs font-semibold text-red-300">
                        ⚠️ NO GOALIE
                      </div>
                    )}
                  </div>
                  
                  {roster.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">No players drafted yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-gray-400 border-b border-gray-700">
                          <tr>
                            <th className="text-left py-2 pr-2">#</th>
                            <th className="text-left py-2 px-2">Player</th>
                            <th className="text-center py-2 px-2">Pos</th>
                            <th className="text-right py-2 px-2">Value</th>
                            <th className="text-right py-2 pl-2">LY PTS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {players.map((p, idx) => {
                            const value = calculateValue(p);
                            const isYeti = p.ly_team === 'Yeti';
                            
                            return (
                              <tr key={idx} className="border-t border-gray-700/50">
                                <td className="py-2 pr-2 text-gray-500">{idx + 1}</td>
                                <td className="py-2 px-2 font-medium">
                                  {p.name.split(', ').reverse().join(' ')}
                                  {isYeti && <span className="ml-2 text-xs bg-yellow-600 text-black px-1 py-0.5 rounded font-bold">YETI</span>}
                                </td>
                                <td className="py-2 px-2 text-center text-gray-400">{getPosition(p)}</td>
                                <td className="py-2 px-2 text-right text-blue-400 font-semibold">{value.toFixed(1)}</td>
                                <td className="py-2 pl-2 text-right text-gray-400">{p.pts || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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
