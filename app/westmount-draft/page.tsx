'use client';

import { useState, useEffect, useMemo } from 'react';
import { westmountPlayers, WestmountPlayer } from '@/data/westmount-players';

type Team = 'Yeti' | 'Devils' | 'Kings' | 'Flyers' | 'Hawks';
type FilterType = 'all' | 'available' | 'F' | 'D' | 'G' | 'no-stats' | 'yeti' | 'assumed';
type Position = 'F' | 'D' | 'G';
type ViewMode = 'board' | 'teams';

interface DraftState {
  rosters: Record<Team, string[]>;
  pickHistory: Array<{ team: Team; player: string }>;
  yetiPickSlot: number;
  keepFamily: boolean;
  projectedRanks?: Record<string, number>;
}

const TEAMS: Team[] = ['Yeti', 'Devils', 'Kings', 'Flyers', 'Hawks'];
const CAPTAINS = ['McAlear, Steven', 'Ciampini, Adam', 'Murciano, Emile', 'Mashaal, Alexander'];

function calculateValue(p: WestmountPlayer): number {
  if (p.role === 'goalie') {
    const ageAdj = Math.max(0, 40 - (p.age || 25)) * 0.6;
    return 52 + ageAdj;
  }
  if (!p.returning) {
    return 8 + Math.max(0, 28 - (p.age || 25)) * 0.3;
  }
  
  let raw = (p.pts || 0) * 0.6 + (p.ppg || 0) * (p.gp || 0) * 0.4;
  if (p.missedHalf) {
    raw *= (10 / 32);
  }
  
  const replacement = 18;
  const surplus = raw - replacement;
  
  let score: number;
  if (surplus >= 0) {
    score = surplus + 0.008 * surplus * surplus;
  } else {
    score = surplus * 1.4;
  }
  
  return score;
}

function getPosition(p: WestmountPlayer): Position {
  if (p.role === 'goalie') return 'G';
  if (p.ly_pos === 'D') return 'D';
  return 'F';
}

function needBump(p: WestmountPlayer, roster: string[], team: Team): number {
  const players = roster.map(name => westmountPlayers.find(pl => pl.name === name)).filter(Boolean) as WestmountPlayer[];
  const dCount = players.filter(x => getPosition(x) === 'D').length;
  const gCount = players.filter(x => getPosition(x) === 'G').length;
  const pos = getPosition(p);
  
  let bump = 0;
  
  if (pos === 'G' && gCount === 0) bump += 18;
  if (pos === 'G' && gCount >= 1) bump -= 25;
  if (pos === 'D' && dCount === 0) bump += 8;
  
  if (p.ly_team === team) {
    bump += 8;
  }
  
  if (team === 'Yeti' && p.name.includes('McAlear')) {
    bump += 18;
  }
  
  if (team === 'Hawks') {
    if (p.name.includes('Angelini') || p.name.includes('Orsini') || p.name.includes('Ciampini')) {
      bump += 10;
    }
  }
  
  if (team === 'Devils' && p.name.includes('Yarrow') && p.role === 'goalie') {
    bump += 22;
  }
  
  return bump;
}

export default function WestmountDraftPage() {
  const [state, setState] = useState<DraftState>({
    rosters: {
      Yeti: [],
      Devils: [],
      Kings: [],
      Flyers: [],
      Hawks: [],
    },
    pickHistory: [],
    yetiPickSlot: 4,
    keepFamily: false,
  });

  const [filter, setFilter] = useState<FilterType>('all');
  const [sortByProj, setSortByProj] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  useEffect(() => {
    const saved = localStorage.getItem('wsl-draft-v1');
    let loadedState = state;
    if (saved) {
      try {
        loadedState = JSON.parse(saved);
        setState(loadedState);
      } catch (e) {
        console.error('Failed to load draft state', e);
      }
    }
    
    if (!loadedState.projectedRanks) {
      const rankedPlayers = [...westmountPlayers]
        .sort((a, b) => calculateValue(b) - calculateValue(a));
      
      const ranks: Record<string, number> = {};
      rankedPlayers.forEach((p, idx) => {
        ranks[p.name] = idx + 1;
      });
      
      setState(prev => ({ ...prev, projectedRanks: ranks }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('wsl-draft-v1', JSON.stringify(state));
  }, [state]);

  const draftOrder = useMemo(() => {
    const order: Team[] = [];
    const slots = [
      state.yetiPickSlot,
      (state.yetiPickSlot === 1 || state.yetiPickSlot === 5) ? 2 : (state.yetiPickSlot === 2 || state.yetiPickSlot === 4) ? 1 : 5,
      state.yetiPickSlot === 3 ? 4 : state.yetiPickSlot <= 2 ? 5 : 2,
      state.yetiPickSlot === 1 ? 4 : state.yetiPickSlot === 5 ? 5 : state.yetiPickSlot === 2 ? 3 : 4,
      state.yetiPickSlot === 1 ? 5 : state.yetiPickSlot === 5 ? 1 : 3,
    ];
    const slotToTeam: Record<number, Team> = {
      [slots[0]]: 'Yeti',
      [slots[1]]: 'Devils',
      [slots[2]]: 'Kings',
      [slots[3]]: 'Flyers',
      [slots[4]]: 'Hawks',
    };
    for (let round = 0; round < 30; round++) {
      const picks = round % 2 === 0 ? [1, 2, 3, 4, 5] : [5, 4, 3, 2, 1];
      picks.forEach(slot => order.push(slotToTeam[slot]));
    }
    return order;
  }, [state.yetiPickSlot]);

  const currentPick = useMemo(() => {
    const pickNum = state.pickHistory.length + 1;
    const round = Math.floor(state.pickHistory.length / 5) + 1;
    const team = draftOrder[state.pickHistory.length] || 'Yeti';
    return { pickNum, round, team };
  }, [state.pickHistory.length, draftOrder]);

  const availablePlayers = useMemo(() => {
    const drafted = new Set(state.pickHistory.map(p => p.player));
    return westmountPlayers.filter(p => !drafted.has(p.name));
  }, [state.pickHistory]);

  const recommendations = useMemo(() => {
    if (availablePlayers.length === 0) return [];
    const team = currentPick.team;
    const roster = state.rosters[team];
    
    const scored = availablePlayers.map(p => {
      const base = calculateValue(p);
      const bump = needBump(p, roster, team);
      let why = 'Value';
      
      if (team === 'Yeti' && p.name.includes('McAlear') && bump >= 18) {
        why = 'Family';
      } else if (bump >= 22) {
        why = 'Must-have';
      } else if (p.ly_team === team && bump >= 8) {
        why = 'Reunion';
      } else if (bump >= 18) {
        why = 'Need goalie';
      } else if (bump >= 8) {
        why = 'Need D';
      }
      
      return { player: p, score: base + bump, why };
    });
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  }, [availablePlayers, currentPick.team, state.rosters]);

  const standings = useMemo(() => {
    const stats = TEAMS.map(team => {
      const roster = state.rosters[team];
      const players = roster.map(name => westmountPlayers.find(p => p.name === name)).filter(Boolean) as WestmountPlayer[];
      
      const now = players.reduce((sum, p) => sum + calculateValue(p), 0);
      const lastYearPts = players.reduce((sum, p) => sum + (p.pts || 0), 0);
      const hasGoalie = players.some(p => getPosition(p) === 'G');
      const remainingPicks = Math.floor((150 - state.pickHistory.length) / 5);
      const proj = now + remainingPicks * 8;
      
      return { team, now, proj, lastYearPts, hasGoalie, rosterSize: roster.length };
    });
    
    stats.sort((a, b) => b.proj - a.proj);
    
    const totalProj = stats.reduce((sum, s) => sum + Math.exp(s.proj / 50), 0);
    stats.forEach(s => {
      (s as any).winPct = ((Math.exp(s.proj / 50) / totalProj) * 100).toFixed(0);
    });
    
    return stats;
  }, [state.rosters, state.pickHistory.length, state.yetiPickSlot]);

  const filteredPlayers = useMemo(() => {
    let players = availablePlayers;
    
    if (filter === 'F') players = players.filter(p => getPosition(p) === 'F');
    if (filter === 'D') players = players.filter(p => getPosition(p) === 'D');
    if (filter === 'G') players = players.filter(p => getPosition(p) === 'G');
    if (filter === 'no-stats') players = players.filter(p => !p.returning);
    if (filter === 'yeti') players = players.filter(p => p.ly_team === 'Yeti');
    if (filter === 'assumed') players = players.filter(p => p.assumed);
    
    if (sortByProj && state.projectedRanks) {
      players = [...players].sort((a, b) => {
        const rankA = state.projectedRanks![a.name] || 999;
        const rankB = state.projectedRanks![b.name] || 999;
        return rankA - rankB;
      });
    } else {
      players = [...players].sort((a, b) => calculateValue(b) - calculateValue(a));
    }
    
    return players;
  }, [availablePlayers, filter, sortByProj, state.projectedRanks]);

  const draftPlayer = (playerName: string) => {
    const team = currentPick.team;
    setState(prev => ({
      ...prev,
      rosters: {
        ...prev.rosters,
        [team]: [...prev.rosters[team], playerName],
      },
      pickHistory: [...prev.pickHistory, { team, player: playerName }],
    }));
  };

  const undoLastPick = () => {
    if (state.pickHistory.length === 0) return;
    const last = state.pickHistory[state.pickHistory.length - 1];
    setState(prev => ({
      ...prev,
      rosters: {
        ...prev.rosters,
        [last.team]: prev.rosters[last.team].filter(p => p !== last.player),
      },
      pickHistory: prev.pickHistory.slice(0, -1),
    }));
  };

  const mockDraft = () => {
    if (availablePlayers.length === 0) return;
    const team = currentPick.team;
    const roster = state.rosters[team];
    
    const scored = availablePlayers.map(p => {
      const base = calculateValue(p);
      const bump = needBump(p, roster, team);
      return { player: p, score: base + bump };
    });
    
    scored.sort((a, b) => b.score - a.score);
    draftPlayer(scored[0].player.name);
  };

  const resetDraft = () => {
    if (confirm('Reset the entire draft?')) {
      setState({
        rosters: { Yeti: [], Devils: [], Kings: [], Flyers: [], Hawks: [] },
        pickHistory: [],
        yetiPickSlot: 4,
        keepFamily: false,
        projectedRanks: state.projectedRanks,
      });
    }
  };

  return (
    <>
      <style jsx global>{`
        :root {
          --bg: #f5f4f0;
          --card: #fff;
          --ink: #1a1a1a;
          --muted: #6a6a64;
          --line: #ddd;
          --ice: #3a7ca5;
          --go: #2d8a5e;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: var(--bg);
          color: var(--ink);
          font-size: 14px;
          line-height: 1.5;
          margin: 0;
          padding: 0;
        }
      `}</style>

      <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '80px' }}>
        {/* Header */}
        <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 100, padding: '12px 0' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
            <div style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: '8px' }}>
              Westmount Senior B · Draft Board
            </div>
            <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}>
              Pick {currentPick.pickNum} · Round {currentPick.round} · <span style={{ color: 'var(--ice)', fontWeight: 600 }}>{currentPick.team}</span> on the clock
            </div>
            
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '8px' }}>
              <button
                onClick={() => setViewMode('board')}
                style={{
                  padding: '6px 16px',
                  border: '1px solid var(--line)',
                  background: viewMode === 'board' ? 'var(--ice)' : 'var(--card)',
                  color: viewMode === 'board' ? 'white' : 'var(--ink)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Board
              </button>
              <button
                onClick={() => setViewMode('teams')}
                style={{
                  padding: '6px 16px',
                  border: '1px solid var(--line)',
                  background: viewMode === 'teams' ? 'var(--ice)' : 'var(--card)',
                  color: viewMode === 'teams' ? 'white' : 'var(--ink)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Teams
              </button>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Yeti slot:
                <select
                  value={state.yetiPickSlot}
                  onChange={(e) => setState(prev => ({ ...prev, yetiPickSlot: Number(e.target.value) }))}
                  disabled={state.pickHistory.length > 0}
                  style={{ marginLeft: '6px', padding: '4px', fontSize: '12px', border: '1px solid var(--line)', borderRadius: '4px' }}
                >
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
          {/* Suggested Pick */}
          {recommendations.length > 0 && (
            <div style={{ margin: '16px 0', background: 'var(--card)', border: '2px solid var(--ice)', borderRadius: '6px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                Suggested Pick:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: 600 }}>
                    {recommendations[0].player.name.split(', ').reverse().join(' ')}
                    {recommendations[0].player.traded && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#9333ea' }}>↔</span>}
                    {recommendations[0].player.missedHalf && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#dc2626' }}>½</span>}
                    {CAPTAINS.includes(recommendations[0].player.name) && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#fbbf24', color: '#000', padding: '2px 4px', borderRadius: '3px', fontWeight: 600 }}>C</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    {getPosition(recommendations[0].player)} · {calculateValue(recommendations[0].player).toFixed(1)} · {recommendations[0].why}
                  </div>
                </div>
                <button
                  onClick={() => draftPlayer(recommendations[0].player.name)}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--go)',
                    color: 'white',
                    border: '1px solid var(--go)',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  PICK
                </button>
              </div>
              {recommendations.length > 1 && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--line)', display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '11px' }}>
                  {recommendations.slice(1).map((rec, idx) => (
                    <button
                      key={rec.player.name}
                      onClick={() => draftPlayer(rec.player.name)}
                      style={{
                        padding: '3px 8px',
                        border: '1px solid var(--line)',
                        background: 'var(--card)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {idx + 2}. {rec.player.name.split(', ').pop()} ({calculateValue(rec.player).toFixed(0)})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Standings */}
          <div style={{ margin: '16px 0', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '6px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8f8f8', borderBottom: '1px solid var(--line)' }}>
                <tr>
                  <th style={{ padding: '8px 6px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Rank</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Team</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Win%</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Now</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Proj</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>G</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>N</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, idx) => (
                  <tr key={s.team} style={{ background: s.team === 'Yeti' ? '#f0f7fa' : 'transparent' }}>
                    <td style={{ padding: '6px 6px', borderTop: '1px solid #f0f0f0', fontSize: '12px' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 6px', borderTop: '1px solid #f0f0f0', fontSize: '12px', fontWeight: s.team === 'Yeti' ? 600 : 400 }}>{s.team}</td>
                    <td style={{ padding: '6px 6px', borderTop: '1px solid #f0f0f0', fontSize: '12px', textAlign: 'center' }}>{(s as any).winPct}%</td>
                    <td style={{ padding: '6px 6px', borderTop: '1px solid #f0f0f0', fontSize: '12px', textAlign: 'right' }}>{s.now.toFixed(0)}</td>
                    <td style={{ padding: '6px 6px', borderTop: '1px solid #f0f0f0', fontSize: '12px', textAlign: 'right' }}>{s.proj.toFixed(0)}</td>
                    <td style={{ padding: '6px 6px', borderTop: '1px solid #f0f0f0', fontSize: '12px', textAlign: 'center' }}>{s.hasGoalie ? '✓' : '—'}</td>
                    <td style={{ padding: '6px 6px', borderTop: '1px solid #f0f0f0', fontSize: '12px', textAlign: 'center' }}>{s.rosterSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Board View */}
          {viewMode === 'board' && (
            <>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
                {(['all', 'available', 'F', 'D', 'G', 'assumed'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      border: '1px solid var(--line)',
                      background: filter === f ? 'var(--ice)' : 'var(--card)',
                      color: filter === f ? 'white' : 'var(--ink)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {f === 'all' ? 'All' : f === 'available' ? 'Available' : f === 'assumed' ? 'Assumed' : f}
                  </button>
                ))}
                <button
                  onClick={() => setSortByProj(!sortByProj)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    border: '1px solid var(--line)',
                    background: sortByProj ? 'var(--ice)' : 'var(--card)',
                    color: sortByProj ? 'white' : 'var(--ink)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Sort by Proj
                </button>
              </div>

              <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8f8f8', borderBottom: '1px solid var(--line)' }}>
                    <tr>
                      <th style={{ padding: '8px 6px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Player</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>P</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }} title="Projected rank (frozen at load)">Proj</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }} title="Pick number (C=captain)">Pick</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }} title="Last year ADP">ADP</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Val</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map(p => {
                      const isRec = recommendations[0]?.player.name === p.name;
                      const projRank = state.projectedRanks?.[p.name];
                      const pickIdx = state.pickHistory.findIndex(h => h.player === p.name);
                      const pickDisplay = CAPTAINS.includes(p.name) ? 'C' : pickIdx >= 0 ? String(pickIdx + 1) : '—';
                      
                      return (
                        <tr
                          key={p.name}
                          style={{
                            background: isRec ? '#e8f4f8' : 'transparent',
                            borderLeft: isRec ? '3px solid var(--ice)' : 'none',
                            cursor: 'pointer',
                          }}
                          onClick={() => draftPlayer(p.name)}
                        >
                          <td style={{ padding: '6px 6px', borderTop: '1px solid #f0f0f0', fontSize: '12px' }}>
                            {p.name.split(', ').reverse().join(' ')}
                            {p.assumed && <span style={{ marginLeft: '4px', fontSize: '9px', color: 'var(--muted)' }}>*</span>}
                            {p.traded && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#9333ea' }}>↔</span>}
                            {p.missedHalf && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#dc2626' }}>½</span>}
                          </td>
                          <td style={{ padding: '6px 6px', borderTop: '1px solid #f0f0f0', fontSize: '12px', textAlign: 'center' }}>{getPosition(p)}</td>
                          <td style={{ padding: '6px 6px', borderTop: '1px solid #f0f0f0', fontSize: '12px', textAlign: 'center' }}>{projRank || '—'}</td>
                          <td style={{ padding: '6px 6px', borderTop: '1px solid #f0f0f0', fontSize: '12px', textAlign: 'center' }}>{pickDisplay}</td>
                          <td style={{ padding: '6px 6px', borderTop: '1px solid #f0f0f0', fontSize: '12px', textAlign: 'center' }}>{p.ly_adp || '—'}</td>
                          <td style={{ padding: '6px 6px', borderTop: '1px solid #f0f0f0', fontSize: '12px', textAlign: 'center' }}>{calculateValue(p).toFixed(0)}</td>
                          <td style={{ padding: '6px 6px', borderTop: '1px solid #f0f0f0', fontSize: '12px', textAlign: 'center' }}>{p.pts || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ margin: '12px 0', fontSize: '11px', color: 'var(--muted)' }}>
                Proj is the opening board, Pick is where they went
              </div>

              <details style={{ margin: '12px 0', padding: '12px', background: '#f8f8f8', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '11px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '8px' }}>Draft Details</summary>
                <div style={{ marginTop: '8px', color: 'var(--muted)' }}>
                  <p>Four-man swap: Yeti got Lach+Friedman; Kings got Yarrow+Uhthoff. Yeti's season goalie was Lach.</p>
                  <p style={{ marginTop: '8px' }}><strong>Value:</strong> Raw = 0.6×PTS + 0.4×P/G×GP. Surplus vs replacement (18 pts). Elites: convex 0.008×surplus². Duds: 1.4× penalty. Goalies: 52 + age.</p>
                  <p style={{ marginTop: '8px' }}><strong>Reunion:</strong> +8 for last-year teammates. Yeti +18 on McAlears. Hawks +10 on Angelini/Orsini/Ciampini. Devils +22 on Yarrow.</p>
                </div>
              </details>
            </>
          )}

          {/* Teams View */}
          {viewMode === 'teams' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              {TEAMS.map(team => {
                const roster = state.rosters[team];
                const players = roster.map(name => westmountPlayers.find(p => p.name === name)).filter(Boolean) as WestmountPlayer[];
                const hasGoalie = players.some(p => getPosition(p) === 'G');
                
                return (
                  <div key={team} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                      {team} {!hasGoalie && roster.length > 0 && <span style={{ fontSize: '12px', color: '#dc2626' }}>(No goalie!)</span>}
                    </h3>
                    {roster.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--muted)' }}>No picks yet</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--line)' }}>
                            <th style={{ padding: '4px 6px', textAlign: 'left', fontSize: '10px', color: 'var(--muted)' }}>Player</th>
                            <th style={{ padding: '4px 6px', textAlign: 'center', fontSize: '10px', color: 'var(--muted)' }}>P</th>
                            <th style={{ padding: '4px 6px', textAlign: 'right', fontSize: '10px', color: 'var(--muted)' }}>Val</th>
                            <th style={{ padding: '4px 6px', textAlign: 'right', fontSize: '10px', color: 'var(--muted)' }}>PTS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {players.map(p => (
                            <tr key={p.name}>
                              <td style={{ padding: '4px 6px', fontSize: '11px' }}>{p.name.split(', ').reverse().join(' ')}</td>
                              <td style={{ padding: '4px 6px', fontSize: '11px', textAlign: 'center' }}>{getPosition(p)}</td>
                              <td style={{ padding: '4px 6px', fontSize: '11px', textAlign: 'right' }}>{calculateValue(p).toFixed(0)}</td>
                              <td style={{ padding: '4px 6px', fontSize: '11px', textAlign: 'right' }}>{p.pts || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--card)', borderTop: '1px solid var(--line)', padding: '12px 16px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            onClick={mockDraft}
            style={{
              padding: '6px 12px',
              border: '1px solid var(--line)',
              background: 'var(--ice)',
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Mock
          </button>
          <button
            onClick={undoLastPick}
            disabled={state.pickHistory.length === 0}
            style={{
              padding: '6px 12px',
              border: '1px solid var(--line)',
              background: 'var(--card)',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: state.pickHistory.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              opacity: state.pickHistory.length === 0 ? 0.4 : 1,
            }}
          >
            Undo
          </button>
          <button
            onClick={resetDraft}
            style={{
              padding: '6px 12px',
              border: '1px solid var(--line)',
              background: 'var(--card)',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </>
  );
}
