/* UI state is separate from the pure draft engine. Mock previews never replace the live draft. */
(() => {
  'use strict';
  const E = DraftEngine;
  const KEY = 'wsl-draft-2026-v4-locked';
  const OLD_KEYS = ['wsl-draft-2026-v3','wsl-draft-2026-v2','wsl-draft-v18','wsl-draft-v17','wsl-draft-v16'];
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const names = {Kings:'Alex Mashaal',Hawks:'Adam Ciampini',Devils:'Emile Murciano',Yeti:'Steve McAlear',Lightning:'Philippe Martin',Coyotes:'Keane Kelly-Menard'};
  const teamName = team => team;
  const byId = new Map(PLAYERS.map(p => [p.id,p]));
  const projections = typeof PROJECTIONS !== 'undefined' ? PROJECTIONS : null;
  const owner = id => E.TEAMS.find(t => E.CAPTAIN_IDS[t] === id);
  const playerName = p => {
    if (!p) return 'Unknown player';
    const [last,first] = p.name.split(',').map(s => s.trim());
    return first ? `${first} ${last}` : last;
  };
  const targetName = p => ({'Ong Tone, Christopher':'Chris OT','Toledano, David':'David Toledano','McAlear, Thomas':'Tom McAlear','McAlear, Matthew':'Matt McAlear','McAlear, Daniel':'Dan McAlear'}[p.id] || playerName(p));
  
  // Migrate old team names from localStorage backups (New → Coyotes, Flyers → Lightning)
  function migrateTeamNames(state) {
    const teamMap = { New: 'Coyotes', Flyers: 'Lightning' };
    let migrated = false;
    
    if (state.config && state.config.order) {
      state.config.order = state.config.order.map(team => {
        if (teamMap[team]) { migrated = true; return teamMap[team]; }
        return team;
      });
    }
    
    if (state.config && state.config.captainRounds) {
      for (const [oldTeam, newTeam] of Object.entries(teamMap)) {
        if (oldTeam in state.config.captainRounds) {
          state.config.captainRounds[newTeam] = state.config.captainRounds[oldTeam];
          delete state.config.captainRounds[oldTeam];
          migrated = true;
        }
      }
    }
    
    if (state.config && state.config.confirmedCaptainRounds) {
      for (const [oldTeam, newTeam] of Object.entries(teamMap)) {
        if (oldTeam in state.config.confirmedCaptainRounds) {
          state.config.confirmedCaptainRounds[newTeam] = state.config.confirmedCaptainRounds[oldTeam];
          delete state.config.confirmedCaptainRounds[oldTeam];
          migrated = true;
        }
      }
    }
    
    return migrated;
  }
  // Migrate draft order for Sept 17 swap: Lightning and Hawks switched positions
  function migrateDraftOrder(state) {
    // Only migrate if no picks have been made yet
    if (state.history && state.history.length > 0) return false;
    if (!state.config || !state.config.order) return false;
    
    const order = state.config.order;
    const oldOrder = ['Hawks', 'Kings', 'Coyotes', 'Devils', 'Yeti', 'Lightning'];
    const newOrder = ['Lightning', 'Kings', 'Coyotes', 'Devils', 'Yeti', 'Hawks'];
    
    // Check if current order matches old order
    if (JSON.stringify(order) === JSON.stringify(oldOrder)) {
      state.config.order = newOrder.slice();
      return true;
    }
    
    return false;
  }
  // Migrate captain rounds for Sept 17 updates
  function migrateCaptainRounds(state) {
    // Only migrate if no picks have been made yet
    if (state.history && state.history.length > 0) return false;
    if (!state.config || !state.config.captainRounds) return false;
    
    // Migrate Yeti captain round from 3 to 2
    if (state.config.captainRounds.Yeti === 3) {
      state.config.captainRounds.Yeti = 2;
      return true;
    }
    
    return false;
  }
  const position = p => p.role === 'goalie' ? 'G' : p.pos || '?';
  const hasStats = p => p.role === 'goalie' ? p.gaa != null && p.gp > 0 : p.gp > 0 || p.y5gp > 0;
  const pct = x => `${Math.round(Math.max(0,Math.min(1,x))*100)}%`;
  const survivalPct = x => x===1?'100%':x>0.99?'>99%':x>0 && x<0.01?'<1%':pct(x);
  const values = new Map(PLAYERS.map(p => [p.id,E.score(p,PLAYERS)]));
  
  // Locked 2026-27 draft result (84 picks, Sept 17, 2026)
  const LOCKED_DRAFT = typeof LOCKED_DRAFT_2026 !== 'undefined' ? LOCKED_DRAFT_2026 : null;
  
  let liveState = E.createState();
  let previewState = null;
  let view = 'board';
  let simulations = null;
  let recoveryRaw = null;
  let recoveryMessage = '';
  let savePaused = false;
  let toastTimer;
  let busy = false;
  const current = () => previewState || liveState;

  function load() {
    // Load the locked 2026-27 draft result as the default state
    if (LOCKED_DRAFT) {
      try {
        liveState = E.validateState(LOCKED_DRAFT, PLAYERS);
        savePaused = true; // Don't overwrite the locked result
        return;
      } catch (error) {
        console.error('Failed to load locked draft:', error);
      }
    }
    
    // Fallback to localStorage or empty state
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const teamsMigrated = migrateTeamNames(parsed);
          const orderMigrated = migrateDraftOrder(parsed);
          const captainMigrated = migrateCaptainRounds(parsed);
          liveState = E.validateState(parsed,PLAYERS);
          if (teamsMigrated) {
            recoveryMessage = 'Team names updated: New → Coyotes, Flyers → Lightning. Your draft history has been preserved.';
          } else if (orderMigrated) {
            recoveryMessage = 'Draft order updated: Lightning and Hawks swapped positions for Sept 17 draft.';
          } else if (captainMigrated) {
            recoveryMessage = 'Yeti captain round updated from R3 to R2. Yeti↔Kings swap picks in rounds 1–4.';
          }
        }
        catch (error) {
          recoveryRaw = raw;
          savePaused = true;
          recoveryMessage = `Your saved draft needs attention: ${error.message} Download it before restoring a backup or starting a new draft. It has not been overwritten.`;
        }
      } else {
        let oldRaw = null;
        for (const oldKey of OLD_KEYS) {
          oldRaw = localStorage.getItem(oldKey);
          if (oldRaw) break;
        }
        if (oldRaw) {
          recoveryRaw = oldRaw;
          try {
            const old = JSON.parse(oldRaw);
            const migrated = E.createState();
            migrated.config.order = old.order || migrated.config.order;
            migrateTeamNames(migrated);
            migrateDraftOrder(migrated);
            migrateCaptainRounds(migrated);
            migrated.history = (old.history || []).map((id,i) => ({id,team:old.taken[id],pick:i+1}));
            liveState = E.validateState(migrated,PLAYERS);
            recoveryMessage = 'Your previous draft was restored with updated team names, order (Lightning ↔ Hawks), and Yeti captain round. The original backup is still stored.';
          } catch (_) {
            recoveryMessage = 'The older saved draft does not match the captain rules. It remains stored and can be downloaded. This board starts a new draft.';
          }
        }
      }
    } catch (_) {
      savePaused = true;
      recoveryMessage = 'Browser storage is unavailable. You can draft here; use Save backup to keep a copy.';
    }
  }
  function save() {
    if (savePaused) { $('save-status').textContent = 'Use Save backup'; return; }
    try { localStorage.setItem(KEY,JSON.stringify(liveState)); $('save-status').textContent = 'Saved on this device'; }
    catch (_) { savePaused = true; $('save-status').textContent = 'Use Save backup'; toast('Browser storage is unavailable. Save a backup to keep these picks.'); }
  }
  function toast(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; },5000);
  }
  function changeState(next, message) {
    if (previewState) { toast('Return to the live draft to record a pick or change setup.'); return; }
    liveState = next;
    simulations = null;
    save(); render();
    if (message) toast(message);
  }
  function updateConfig(patch) {
    if (previewState) { toast('Return to the live draft to edit setup.'); return; }
    const next = clone(liveState);
    Object.assign(next.config,patch);
    try { changeState(E.validateState(next,PLAYERS)); }
    catch (error) { toast(error.message); render(); }
  }
  function renderSetup(s) {
    const cfg = s.config;
    const locked = !!s.history.length || !!previewState;
    const order = cfg.order.map((team,i) => `<div class="order-item"><b>${i+1}</b><span>${esc(teamName(team))}</span><button data-order="${i}" data-dir="-1" aria-label="Move ${esc(teamName(team))} earlier" ${locked || i===0?'disabled':''}>↑</button><button data-order="${i}" data-dir="1" aria-label="Move ${esc(teamName(team))} later" ${locked || i===5?'disabled':''}>↓</button></div>`).join('');
    const captains = cfg.order.map(team => {
      const drafted = s.history.some(h => h.id === E.CAPTAIN_IDS[team]);
      const disabled = team === 'New' || !!previewState || drafted;
      return `<div class="captain-row"><span>${esc(names[team])}${drafted?'<span class="tag">drafted</span>':''}</span><input type="number" min="1" max="${cfg.rounds}" value="${cfg.captainRounds[team]}" data-captain-round="${team}" aria-label="${esc(names[team])} self-pick round" ${disabled?'disabled':''}><label><input type="checkbox" data-captain-confirm="${team}" ${cfg.confirmedCaptainRounds[team]?'checked':''} ${disabled?'disabled':''}>${team==='New'?'Required':'Agreed'}</label></div>`;
    }).join('');
    const projectionsHtml = projections ? (() => {
      const teams = cfg.order.filter(t => projections[t]);
      const rows = teams.map(team => {
        const rounds = Object.entries(projections[team]).sort(([a],[b]) => Number(a) - Number(b));
        const picks = rounds.map(([r, id]) => {
          const p = byId.get(id);
          return `R${r}: ${p ? esc(playerName(p)) : esc(id)}`;
        }).join(' · ');
        return `<div class="projection-row"><strong>${esc(teamName(team))}</strong> <span class="muted">${picks}</span></div>`;
      }).join('');
      return `<div class="projections-panel"><h3>Draft projections (Sept 17)</h3><p>Matthew's updated projections. <strong>Yeti↔Kings swap picks in rounds 1–4 only</strong> (round 5+ uses original order). Mocks and sims follow these projections when legal; captain and goalie rules still apply.</p>${rows}</div>`;
    })() : '';
    $('setup-content').innerHTML = `<div class="setup-grid"><div><h2>First-round order</h2><p>${locked?'Order is locked once a pick is recorded. Undo all picks or start a new draft to change it.':'Provisional order. Use the arrows to match the draft-night draw.'} The order reverses each round.</p><div class="order-list">${order}</div><p>Team names are last year’s working labels; the sixth team is shown under Keane.</p></div><div><h2>Captain self-pick rounds</h2><p>Keane must pick himself in round 1. The other rounds below are planning defaults from last year; edit after negotiation and mark Agreed to enforce them.</p>${captains}</div></div>
      ${projectionsHtml}
      <div class="setup-bottom"><label>Planning length <input id="rounds" type="number" min="1" max="30" value="${cfg.rounds}" ${locked?'disabled':''}> rounds</label><label><input id="use-history" type="checkbox" ${cfg.useHistory?'checked':''} ${previewState?'disabled':''}> Use last year’s draft as a demand estimate</label><button id="import" class="quiet" ${previewState?'disabled':''}>Restore backup</button><button id="reset" class="quiet" ${previewState?'disabled':''}>New draft</button></div>
      <div class="season-details"><p><strong>${PLAYERS.length} listed players: ${ROSTER_INFO.skaters} skaters and ${ROSTER_INFO.goalies} goalies.</strong> ${esc(ROSTER_INFO.goalieNote)} Listed goalies are included in previews.</p><p>${cfg.rounds} rounds gives ${cfg.rounds*6} draft slots. The 14-round default comes from last year; confirm this year’s roster size. Each team is limited to one goalie.</p><p>Showcase Monday Sept 14, 8:50–10:00 p.m. · Draft Thursday Sept 17 · Opener Tuesday Sept 22. <a href="https://forms.gle/GQEHyuuj8kP381jA7" target="_blank" rel="noopener noreferrer">Showcase attendance form</a></p><p>Games: Tuesdays 9:00 &amp; 10:20 p.m., Wednesdays 10:20 p.m., Thursdays 9:00 &amp; 10:20 p.m. Check each week’s rink and schedule.</p><p>Roster: Updated - Senior Draft List.xlsx. Historical draft: last year’s image. <a href="https://docs.google.com/spreadsheets/d/1X3MX4sJTHIX64vdTTWaY1Utka0ul7n_jSA-f8CnIowI/edit?gid=732400518" target="_blank" rel="noopener noreferrer">League data sheet</a></p></div>`;
  }
  function renderClock(s,rec,outlook) {
    const done = E.isComplete(s,PLAYERS);
    $('clock').className = `clock panel${done?' complete':''}`;
    const count = s.history.filter(h => h.id).length;
    $('draft-progress').textContent = `${count} drafted · ${PLAYERS.length-count} available · ${s.config.rounds} planned rounds`;
    if (done) {
      const remaining = E.available(s,PLAYERS);
      const missing = E.TEAMS.filter(team => !E.roster(s,PLAYERS,team).some(p => p.role==='goalie'));
      $('clock').innerHTML = `<h2>${previewState?'Draft preview complete.':'Draft complete.'}</h2><p class="muted">${count} players selected.${remaining.length?` ${remaining.length} remain outside the planned draft.`:''}${missing.length?` No goalie recorded for ${esc(missing.map(teamName).join(', '))}.`:''}</p><button data-view="teams" class="secondary">View team rosters</button>`;
      return;
    }
    const team = E.currentTeam(s);
    const round = E.roundOf(s.history.length);
    const nextIndex = E.nextUsablePickIndex(s,PLAYERS,'Yeti',s.history.length-(team==='Yeti'?0:1));
    const next = nextIndex == null ? null : nextIndex+1;
    const capPicked = s.history.some(h => h.id === E.CAPTAIN_IDS.Yeti);
    const capPlan = capPicked ? 'Steve’s self-pick is recorded.' : `Steve’s self-pick: R${s.config.captainRounds.Yeti} · ${s.config.confirmedCaptainRounds.Yeti?'agreed':'pending agreement'}`;
    const p = rec?.player;
    const recLabel = p && owner(p.id)===team && !s.config.confirmedCaptainRounds[team]
      ? 'PLANNED SELF-PICK' : rec?.forced?'CAPTAIN / ROSTER REQUIREMENT':'SUGGESTED PICK';
    const alternatives = (rec?.alternatives || []).slice(0,2).map(p => `<button data-draft="${esc(p.id)}" ${previewState?'disabled':''}>Draft ${esc(playerName(p))}</button>`).join('');
    $('clock').innerHTML = `<div class="clock-left ${team==='Yeti'?'mine':''}"><p class="eyebrow">${team==='Yeti'?'STEVE IS ON THE CLOCK':'ON THE CLOCK'}</p><div class="team-name">${esc(teamName(team))}</div><div class="clock-captain">${esc(names[team])}</div><div class="clock-meta"><span>Round ${round}</span><span>Pick ${s.history.length+1}</span><span>${round%2?'→':'←'} Snake</span></div></div>
      <div class="recommendation"><p class="eyebrow">${recLabel}</p><h2>${p?esc(playerName(p)):'No eligible player'}</h2><p>${p?esc(rec.reason):'This team has no eligible player left. Record an empty turn to continue the snake.'}</p><div class="pick-row">${p?`<button class="primary" data-draft="${esc(p.id)}" ${previewState?'disabled':''}>${owner(p.id)===team?'Draft myself':'Draft player'} <span aria-hidden="true">→</span></button><span class="muted">${esc(position(p))} · ${values.get(p.id).toFixed(1)} model value${hasStats(p)?'':' · no statistics'}</span>`:`<button id="skip" class="primary" ${previewState?'disabled':''}>Record empty turn</button>`}</div>${alternatives?`<div class="alternatives">Alternatives: ${alternatives}</div>`:''}</div>
      <div class="clock-right"><p class="eyebrow">STEVE’S NEXT OPEN PICK</p><div class="next-number">${next?`#${next}`:'—'}</div><p>${next?`Round ${E.roundOf(next-1)} · ${Math.max(0,next-s.history.length-1)} turns before it`:'No later open pick in this draft.'}</p><p class="captain-plan">${capPlan}</p></div>`;
  }
  function renderTargets(s,outlook) {
    $('prioritize-targets').checked = s.config.prioritizeTargets;
    $('prioritize-targets').disabled = !!previewState;
    $('targets').innerHTML = outlook.map(item => {
      const p = byId.get(item.id);
      if (!p) return '';
      const probability = Number.isFinite(item.survival) ? item.survival : null;
      const status = item.status === 'yeti' ? 'On the Yeti' : item.status === 'taken' ? `Taken by ${teamName(item.team)}` : probability == null ? 'No open pick left' : `${survivalPct(probability)} to last until #${item.nextPick}`;
      const note = item.status === 'available' ? (p.lyRound?`Last year R${p.lyRound}`:'No prior draft record') : `Pick ${s.history.find(h => h.id === item.id)?.pick || '—'}`;
      return `<article class="target-card ${esc(item.status)}" title="${esc(item.reason)}"><h3>${esc(targetName(p))}</h3><div class="target-status ${item.status==='yeti'?'good':item.status==='taken'?'gone':''}">${esc(status)}</div><small>${note}${!hasStats(p)?' · no statistics':''}</small>${probability!=null && item.status==='available'?`<div class="meter" aria-hidden="true"><span style="width:${Math.round(probability*100)}%"></span></div>`:''}</article>`;
    }).join('') || '<div class="target-empty">Star players on the board to build Steve’s target list.</div>';
  }
  function renderBoard(s,rec) {
    const search = $('search').value.trim().toLocaleLowerCase();
    const filter = $('filter').value;
    const sort = $('sort').value;
    const taken = new Map(s.history.filter(h=>h.id).map(h=>[h.id,h]));
    const targets = new Set(s.config.targets);
    const legal = new Set(E.eligible(s,PLAYERS).map(p=>p.id));
    const done = E.isComplete(s,PLAYERS);
    const team = E.currentTeam(s);
    const rows = PLAYERS.filter(p => {
      if (search && !`${p.name} ${playerName(p)} ${targetName(p)} ${p.lyTeam || ''}`.toLocaleLowerCase().includes(search)) return false;
      if (filter==='all') return true;
      if (filter==='targets') return targets.has(p.id);
      if (taken.has(p.id)) return false;
      if (filter==='unknown') return !hasStats(p);
      if (filter==='F' || filter==='D') return position(p).includes(filter);
      if (filter==='G') return p.role==='goalie';
      return true;
    }).sort((a,b) => {
      if (sort==='name') return playerName(a).localeCompare(playerName(b));
      if (sort==='history') return (a.lyRound || 99)-(b.lyRound || 99) || (a.lyPick || 99)-(b.lyPick || 99);
      if (sort==='points') return (b.pts || 0)-(a.pts || 0);
      return values.get(b.id)-values.get(a.id) || a.name.localeCompare(b.name);
    });
    $('player-count').textContent = rows.length;
    const body = rows.map(p => {
      const pick = taken.get(p.id);
      const captain = owner(p.id);
      const suggested = p.id === rec?.player.id && !pick;
      const unknown = !hasStats(p);
      const canStar = !captain && !previewState;
      let action;
      if (pick) action = `<span class="reserved">${esc(teamName(pick.team))} · #${pick.pick}</span>`;
      else if (done) action = '<span class="reserved">Undrafted</span>';
      else if (!legal.has(p.id)) action = `<span class="reserved">${captain && captain!==team?`Reserved for ${esc(teamName(captain))}`:captain?'Captain round not due':p.role==='goalie'?'Roster / goalie slot filled':'Self-pick / roster slot due'}</span>`;
      else action = `<button class="table-draft ${suggested?'primary':'quiet'}" data-draft="${esc(p.id)}" aria-label="Draft ${esc(playerName(p))}" ${previewState?'disabled':''}>Draft</button>`;
      const info = [p.lyTeam?`Last year ${p.lyTeam}`:'New to the list',p.age?`Age ${p.age}`:''].filter(Boolean).join(' · ');
      const stats = p.role==='goalie' ? (p.gaa!=null?`${Number(p.gaa).toFixed(2)} GAA`:'—') : p.gp>0?`${p.pts} pts / ${p.gp} GP`:'—';
      return `<tr class="${pick?'drafted':suggested?'suggested':''}"><td><button class="star ${targets.has(p.id)?'active':''}" data-target="${esc(p.id)}" aria-label="${targets.has(p.id)?'Remove':'Add'} ${esc(playerName(p))} ${targets.has(p.id)?'from':'to'} Steve’s targets" aria-pressed="${targets.has(p.id)}" ${canStar?'':'disabled'}>${targets.has(p.id)?'★':'☆'}</button></td><td class="player"><strong>${esc(playerName(p))}</strong>${captain?'<span class="tag">captain</span>':''}${suggested?'<span class="tag">suggested</span>':''}${unknown?'<span class="tag pending">no stats</span>':''}${p.pendingInfo?'<span class="tag pending">info pending</span>':''}<span class="player-meta">${esc(info)}</span></td><td>${esc(position(p))}</td><td class="numeric" title="${esc(p.historyNote || 'One historical five-team draft')}">${p.lyRound?`R${p.lyRound}`:'—'}${p.historyNote?'*':''}</td><td class="numeric optional-col">${values.get(p.id).toFixed(1)}${unknown?'*':''}</td><td class="optional-col">${stats}</td><td>${action}</td></tr>`;
    }).join('');
    const sortIndicator = (col) => sort===col ? ' ▼' : '';
    $('board').innerHTML = rows.length?`<table><thead><tr><th aria-label="Target"></th><th class="sortable" data-sort="name">Player${sortIndicator('name')}</th><th>Pos</th><th class="sortable" data-sort="history">Last draft${sortIndicator('history')}</th><th class="optional-col sortable" data-sort="value" title="Uncalibrated model value, not predicted season points">Value${sortIndicator('value')}</th><th class="optional-col sortable" data-sort="points">Last-year stats${sortIndicator('points')}</th><th>Selection</th></tr></thead><tbody>${body}</tbody></table>`:'<div class="empty-table">No players match this search.</div>';
  }
  function renderTeams(s) {
    const done = E.isComplete(s,PLAYERS);
    $('teams').innerHTML = s.config.order.map(team => {
      const roster = E.roster(s,PLAYERS,team);
      const goalie = roster.find(p=>p.role==='goalie');
      const captain = roster.some(p=>p.id===E.CAPTAIN_IDS[team]);
      const picks = s.history.filter(h=>h.team===team);
      const rows = picks.map(h => {
        const p = byId.get(h.id);
        return `<li><span class="pick-number">#${h.pick}</span><span>${p?esc(playerName(p)):'Empty turn'}${p && owner(p.id)?'<span class="tag">C</span>':''}${p && s.config.targets.includes(p.id)?'<span class="tag target">★</span>':''}</span><span class="position">${p?esc(position(p)):''}</span></li>`;
      }).join('');
      return `<article class="team-card panel ${team==='Yeti'?'mine':''} ${!done && E.currentTeam(s)===team?'on-clock':''}"><div class="team-card-head"><div><h2>${esc(teamName(team))}</h2><p>${esc(names[team])}</p></div><span class="team-count">${roster.length}<span class="muted"> / ${s.config.rounds}</span></span></div><div class="roster-status"><span>${captain?'Captain drafted':`Captain R${s.config.captainRounds[team]} · ${s.config.confirmedCaptainRounds[team]?'agreed':'planned'}`}</span><span>${goalie?`G: ${esc(playerName(goalie))}`:'Goalie still needed'}</span></div><ol class="roster-list">${rows || '<li class="roster-empty">Waiting for the first pick.</li>'}</ol></article>`;
    }).join('');
    
    // Show analysis only for the completed locked draft
    renderAnalysis(s);
  }
  
  function renderAnalysis(s) {
    const analysisEl = $('analysis');
    if (!analysisEl) return;
    
    // Only show analysis for a complete draft
    if (!E.isComplete(s, PLAYERS) || s.history.length !== 84) {
      analysisEl.hidden = true;
      return;
    }
    
    analysisEl.hidden = false;
    
    // Team model values
    const teamValues = E.TEAMS.map(team => {
      const roster = E.roster(s, PLAYERS, team);
      const totalValue = roster.reduce((sum, p) => sum + E.score(p, PLAYERS), 0);
      return { team, totalValue, roster };
    }).sort((a, b) => b.totalValue - a.totalValue);
    
    const valueRows = teamValues.map((t, i) => 
      `<tr class="${t.team==='Yeti'?'suggested':''}"><td>${i+1}.</td><td>${esc(teamName(t.team))}</td><td class="numeric">${t.totalValue.toFixed(1)}</td></tr>`
    ).join('');
    
    // Value picks (high model value, picked late) and reaches (low model value, picked early)
    const pickAnalysis = s.history.filter(h => h.id).map(h => {
      const player = byId.get(h.id);
      if (!player) return null;
      const value = E.score(player, PLAYERS);
      // Simple heuristic: compare value to pick position
      const expectedPick = Math.max(1, Math.round((35 - value) * 2.5));
      const delta = h.pick - expectedPick; // negative = reached early, positive = value
      return { ...h, player, value, delta };
    }).filter(Boolean).sort((a, b) => b.delta - a.delta);
    
    const valuePicks = pickAnalysis.slice(0, 5);
    const reaches = pickAnalysis.slice(-5).reverse();
    
    const valuePickRows = valuePicks.map(p => {
      const pts = p.player.pts > 0 && p.player.gp > 0 ? ` (${p.player.pts} pts / ${p.player.gp} GP)` : '';
      return `<li>#${p.pick} ${esc(playerName(p.player))} to ${esc(teamName(p.team))}: ${p.value.toFixed(1)} model value${pts}</li>`;
    }).join('');
    
    const reachRows = reaches.map(p => {
      const pts = p.player.pts > 0 && p.player.gp > 0 ? ` (${p.player.pts} pts / ${p.player.gp} GP)` : '';
      return `<li>#${p.pick} ${esc(playerName(p.player))} to ${esc(teamName(p.team))}: ${p.value.toFixed(1)} model value${pts}</li>`;
    }).join('');
    
    // Yeti analysis
    const yetiPicks = s.history.filter(h => h.team === 'Yeti' && h.id);
    const reunionTargets = [
      { name: 'Peter', id: 'McAlear, Peter' },
      { name: 'Toledano', id: 'Toledano, David' },
      { name: 'Thomas', id: 'McAlear, Thomas' },
      { name: 'Matthew', id: 'McAlear, Matthew' },
      { name: 'Daniel', id: 'McAlear, Daniel' },
    ];
    
    const reunionRows = reunionTargets.map(t => {
      const pick = s.history.find(h => h.id === t.id);
      if (!pick) return `<li>${t.name}: not drafted</li>`;
      return `<li>${t.name}: #${pick.pick} (${esc(teamName(pick.team))})</li>`;
    }).join('');
    
    // Position shape
    const positionRows = E.TEAMS.map(team => {
      const roster = E.roster(s, PLAYERS, team);
      const forwards = roster.filter(p => p.pos === 'F' || (p.pos && p.pos.includes('F'))).length;
      const defense = roster.filter(p => p.pos === 'D' || (p.pos && p.pos.includes('D') && !p.pos.includes('F'))).length;
      const goalies = roster.filter(p => p.role === 'goalie').length;
      const unknown = roster.filter(p => !p.pos || p.pos === '').length;
      const shape = `${forwards}F / ${defense}D / ${goalies}G${unknown > 0 ? ` / ${unknown}?` : ''}`;
      return `<li>${esc(teamName(team))}: ${shape}</li>`;
    }).join('');
    
    analysisEl.innerHTML = `
      <div class="page-heading"><div><p class="eyebrow">2026-27 DRAFT RESULT</p><h2>Model analysis</h2><p class="muted">Numbers shown are the draft model's value estimates, not predicted season wins.</p></div></div>
      
      <div class="analysis-grid">
        <div class="analysis-section">
          <h3>Team model values (ranked)</h3>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Rank</th><th>Team</th><th>Total Value</th></tr></thead>
              <tbody>${valueRows}</tbody>
            </table>
          </div>
        </div>
        
        <div class="analysis-section">
          <h3>Position shape</h3>
          <ul class="analysis-list">${positionRows}</ul>
        </div>
      </div>
      
      <div class="analysis-grid">
        <div class="analysis-section">
          <h3>Value picks</h3>
          <p class="muted">High model value relative to draft position</p>
          <ol class="analysis-list">${valuePickRows}</ol>
        </div>
        
        <div class="analysis-section">
          <h3>Reaches</h3>
          <p class="muted">Lower model value for draft position</p>
          <ol class="analysis-list">${reachRows}</ol>
        </div>
      </div>
      
      <div class="analysis-section yeti-note">
        <h3>Yeti draft notes</h3>
        <p><strong>First three picks:</strong> The plan was Owen Semanyk, Steven McAlear, Euan Martin. Result: #2 ${esc(playerName(byId.get(yetiPicks[0].id)))}, #11 ${esc(playerName(byId.get(yetiPicks[1].id)))}, #14 ${esc(playerName(byId.get(yetiPicks[2].id)))} — the plan held.</p>
        <p><strong>Reunion targets:</strong></p>
        <ul class="analysis-list">${reunionRows}</ul>
      </div>
    `;
  }
  function renderResults() {
    if (!simulations) {
      $('results').innerHTML = '<div class="panel empty-table">Run simulations to see who Steve gets and how the projected rosters compare.</div>';
      return;
    }
    const teams = [...simulations.teams].sort((a,b)=>b.avgScore-a.avgScore);
    const teamRows = teams.map(t=>`<tr class="${t.team==='Yeti'?'suggested':''}"><td>${esc(teamName(t.team))}</td><td class="numeric">${t.avgScore.toFixed(1)}</td><td><span class="result-bar"><span style="width:${Math.round(t.firstShare*100)}%"></span></span>${pct(t.firstShare)}</td></tr>`).join('');
    const targets = simulations.targets.map(t=>`<tr><td>${esc(targetName(byId.get(t.id)))}</td><td class="numeric">${pct(t.yetiShare)}</td><td class="numeric">${t.avgPick==null?'—':t.avgPick.toFixed(1)}</td></tr>`).join('');
    $('results').innerHTML = `<p class="result-intro">${simulations.runs} possible drafts from the current board. “Top model score” means the highest rated roster in these runs; it is not a forecast of league wins. Unagreed captain rounds use the planning defaults.</p><div class="results-grid"><section class="panel result-panel"><h2>Projected rosters</h2><div class="table-scroll"><table><thead><tr><th>Team</th><th>Avg. value</th><th>Top model score</th></tr></thead><tbody>${teamRows}</tbody></table></div></section><section class="panel result-panel"><h2>Steve’s target group</h2><div class="table-scroll"><table><thead><tr><th>Player</th><th>Drafted by Yeti</th><th>Avg. overall pick</th></tr></thead><tbody>${targets || '<tr><td colspan="3">Star players to add targets.</td></tr>'}</tbody></table></div></section></div>`;
  }
  function render() {
    const s = current();
    const rec = E.recommend(s,PLAYERS,projections);
    const outlook = E.targetOutlook(s,PLAYERS);
    $('notice').hidden = !recoveryMessage;
    $('notice').className = 'notice';
    $('notice').innerHTML = recoveryMessage?`${esc(recoveryMessage)}${recoveryRaw?'<button id="recovery-download">Download saved draft</button>':''}`:'';
    $('preview-banner').hidden = !previewState;
    $('preview-banner').innerHTML = previewState?'<span><strong>Mock draft preview.</strong> Your live picks are saved separately.</span><button id="exit-preview" class="secondary">Return to live draft</button>':'';
    renderSetup(s); renderClock(s,rec,outlook); renderTargets(s,outlook); renderBoard(s,rec); renderTeams(s); renderResults();
    ['board','teams','results'].forEach(name=> { $(`${name}-view`).hidden = view!==name; });
    document.querySelectorAll('.nav-inner [data-view]').forEach(button=>button.setAttribute('aria-current',button.dataset.view===view?'page':'false'));
    $('undo').disabled = !liveState.history.length || !!previewState || busy;
    $('mock').disabled = !!previewState || busy || E.isComplete(liveState,PLAYERS);
    $('run-sims').disabled = !!previewState || busy || E.isComplete(liveState,PLAYERS);
    const last = s.history.at(-1);
    $('last-pick').textContent = last?`Last: ${last.id?playerName(byId.get(last.id)):'Empty turn'} → ${teamName(last.team)}`:'Ready for draft night';
    if (savePaused) $('save-status').textContent = 'Use Save backup';
  }
  function download(content,name) {
    const blob = new Blob([typeof content==='string'?content:JSON.stringify(content,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href=url; anchor.download=name; anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function recordPick(id) {
    try { changeState(E.pickPlayer(liveState,PLAYERS,id),`${playerName(byId.get(id))} drafted by ${teamName(E.currentTeam(liveState))}.`); }
    catch(error) { toast(error.message); }
  }
  document.addEventListener('click',event => {
    const sortHeader = event.target.closest('th.sortable');
    if (sortHeader && sortHeader.dataset.sort) {
      $('sort').value = sortHeader.dataset.sort;
      render();
      return;
    }
    const button = event.target.closest('button');
    if (!button || button.disabled || busy) return;
    if (button.dataset.view) { view=button.dataset.view; render(); return; }
    if (button.dataset.draft) { recordPick(button.dataset.draft); return; }
    if (button.dataset.target) {
      const targets = [...liveState.config.targets];
      const i = targets.indexOf(button.dataset.target);
      if (i===-1) targets.push(button.dataset.target); else targets.splice(i,1);
      updateConfig({targets}); return;
    }
    if (button.dataset.order!=null) {
      if (liveState.history.length || previewState) return;
      const order = [...liveState.config.order]; const i=Number(button.dataset.order); const j=i+Number(button.dataset.dir);
      [order[i],order[j]]=[order[j],order[i]]; updateConfig({order}); return;
    }
    if (button.id==='settings-toggle') { $('setup').open=!$('setup').open; if ($('setup').open) $('setup').scrollIntoView({behavior:'smooth',block:'start'}); }
    if (button.id==='skip') { try { changeState(E.skipTurn(liveState,PLAYERS)); } catch(error) { toast(error.message); } }
    if (button.id==='undo') { const next=clone(liveState); next.history.pop(); changeState(next,'Last pick undone.'); }
    if (button.id==='reset' && confirm('Start a new draft? Current picks will be cleared. Save a backup first if you need them.')) {
      const next=E.createState(); next.config=clone(liveState.config); savePaused=false; recoveryMessage=''; changeState(next,'New draft ready.');
    }
    if (button.id==='export') download({format:'westmount-draft',savedAt:new Date().toISOString(),state:liveState},'westmount-draft-2026-backup.json');
    if (button.id==='recovery-download') download(recoveryRaw,'westmount-previous-draft.json');
    if (button.id==='import') $('import-file').click();
    if (button.id==='exit-preview') { previewState=null; view='board'; render(); }
    if (button.id==='mock') {
      busy=true; $('mock').textContent='Building preview…';
      setTimeout(()=> {
        try { previewState=E.runMock(liveState,PLAYERS,projections); view='teams'; }
        catch(error) { toast(error.message); }
        finally { busy=false; $('mock').textContent='Preview full draft'; render(); window.scrollTo({top:0,behavior:'smooth'}); }
      },25);
    }
    if (button.id==='run-sims') {
      const n=Math.max(1,Math.min(200,parseInt($('sim-count').value,10)||25)); $('sim-count').value=n;
      busy=true; $('run-sims').textContent='Simulating…'; $('run-sims').disabled=true;
      setTimeout(()=> {
        try { simulations=E.simulate(liveState,PLAYERS,projections,n); }
        catch(error) { toast(error.message); }
        finally { busy=false; $('run-sims').textContent='Run simulations'; render(); }
      },25);
    }
  });
  document.addEventListener('change',event => {
    const input=event.target;
    if (input.dataset.captainRound) {
      const captainRounds={...liveState.config.captainRounds,[input.dataset.captainRound]:Number(input.value)};
      const confirmedCaptainRounds={...liveState.config.confirmedCaptainRounds,[input.dataset.captainRound]:false};
      updateConfig({captainRounds,confirmedCaptainRounds});
    }
    if (input.dataset.captainConfirm) updateConfig({confirmedCaptainRounds:{...liveState.config.confirmedCaptainRounds,[input.dataset.captainConfirm]:input.checked}});
    if (input.id==='rounds') updateConfig({rounds:Number(input.value)});
    if (input.id==='use-history') updateConfig({useHistory:input.checked});
    if (input.id==='prioritize-targets') updateConfig({prioritizeTargets:input.checked});
    if (input.id==='sort' || input.id==='filter') renderBoard(current(),E.recommend(current(),PLAYERS,projections));
  });
  $('search').addEventListener('input',()=>renderBoard(current(),E.recommend(current(),PLAYERS,projections)));
  $('import-file').addEventListener('change',async event => {
    const file=event.target.files[0]; if (!file) return;
    try {
      if (file.size > 2*1024*1024) throw new Error('This file is too large for a draft backup.');
      const payload=JSON.parse(await file.text());
      const state = payload.state || payload;
      const teamsMigrated = migrateTeamNames(state);
      const orderMigrated = migrateDraftOrder(state);
      const captainMigrated = migrateCaptainRounds(state);
      const restored=E.validateState(state,PLAYERS);
      if (liveState.history.length && !confirm('Replace the current draft with this backup?')) return;
      savePaused=false;
      const migrations = [];
      if (teamsMigrated) migrations.push('team names');
      if (orderMigrated) migrations.push('draft order (Lightning ↔ Hawks)');
      if (captainMigrated) migrations.push('Yeti captain round (R3→R2, Yeti↔Kings R1–4 swap)');
      const migrationMsg = migrations.length ? migrations.join(', ') : '';
      recoveryMessage = migrationMsg ? `Draft restored with updated ${migrationMsg}.` : '';
      changeState(restored, migrationMsg ? `Draft restored with updated ${migrationMsg}.` : 'Draft restored.');
    } catch(error) { toast(`Could not restore: ${error.message}`); }
    finally { event.target.value=''; }
  });
  $('model-explanation').innerHTML = '<p><strong>Captain rules come first.</strong> Every captain is reserved for his own team and uses a real pick. Keane’s round 1 is mandatory. Agreed rounds are enforced; unagreed rounds are provisional plans.</p><p><strong>Look ahead to the next open turn.</strong> Recommendations weigh player value, roster needs and Steve’s target group against the actual intervening snake picks. A scheduled self-pick is not an opportunity to take another target. Survival figures are model estimates, not guarantees.</p><p><strong>Use the history with care.</strong> Last year had five teams. Its draft positions inform estimated demand in this six-team draft, alongside the statistics. Unknown players receive a neutral prior, so “no stats” does not mean “bad player.” Goalie value uses GAA; it cannot separate goaltending from team defence.</p><p><strong>Draft-night checks.</strong> Agree the captain rounds and roster size. The workbook’s six named goalies conflict with the admin email’s two vacancies; Josh Pinto is waiting for information. Balazinski’s historical round is corrected to R14 from the draft image; the workbook says R4.</p>';
  load(); render();
})();
