'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../../public/westmount-draft/draft-engine.js');
const { PLAYERS, ROSTER_INFO } = require('../../public/westmount-draft/data.js');
const source = fs.readFileSync(path.join(__dirname, '../../public/westmount-draft/app.js'), 'utf8');
const CURRENT_KEY = 'wsl-draft-2026-v2';
const LEGACY_KEYS = ['wsl-draft-v18', 'wsl-draft-v17', 'wsl-draft-v16'];

// This is the shape persisted by the deployed v18 page and its v17/v16
// predecessors: history is an ID array, with ownership in a separate map.
function legacyDraft(ids) {
  let state = E.createState();
  for (const id of ids) state = E.pickPlayer(state, PLAYERS, id);
  return {
    order: [...state.config.order], slot: state.config.order.indexOf('Yeti') + 1,
    pick: ids.length,
    taken: Object.fromEntries(state.history.map(entry => [entry.id, entry.team])),
    history: [...ids], view: 'board', usePolitics: false, useIntel: true,
    orderExpanded: false,
  };
}

// Execute the complete production app against the real engine. The DOM stub
// supplies display fields and event dispatch only; storage and downloads are
// observed through the same UI actions a browser user performs.
function boot(initialStorage) {
  const storage = new Map(Object.entries(initialStorage));
  const reads = [], writes = [], elements = new Map(), listeners = new Map();
  let downloaded = null;
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      id, value: id === 'filter' ? 'all' : id === 'sort' ? 'value' : '',
      innerHTML: '', textContent: '', hidden: false, disabled: false, dataset: {},
      addEventListener() {}, setAttribute() {}, scrollIntoView() {}, click() {},
    });
    return elements.get(id);
  };
  const context = {
    DraftEngine: E, PLAYERS, ROSTER_INFO,
    document: {
      getElementById: element,
      querySelectorAll: () => [],
      addEventListener(type, callback) { listeners.set(type, callback); },
      createElement: () => ({ click() {} }),
    },
    localStorage: {
      getItem(key) { reads.push(key); return storage.get(key) ?? null; },
      setItem(key, value) { writes.push([key, value]); storage.set(key, value); },
    },
    window: { scrollTo() {} },
    setTimeout: () => 1, clearTimeout() {}, confirm: () => true,
    Blob: class { constructor(parts) { this.content = parts.join(''); } },
    URL: { createObjectURL(blob) { downloaded = blob.content; return 'blob:test'; }, revokeObjectURL() {} },
  };
  vm.runInNewContext(source, context, { filename: 'app.js' });
  const click = (id, dataset = {}) => {
    const button = { id, dataset, disabled: false };
    listeners.get('click')({ target: { closest: () => button } });
  };
  return {
    storage, reads, writes, element, click,
    state() { click('export'); return JSON.parse(downloaded).state; },
    recovery() { click('recovery-download'); return downloaded; },
  };
}

for (const key of LEGACY_KEYS) {
  test(`restores compatible ${key} history and saves new picks without changing its original`, () => {
    const legacy = legacyDraft(['Smith, Michael']);
    const raw = JSON.stringify(legacy);
    const app = boot({ [key]: raw });
    const restored = app.state();
    assert.deepEqual(restored.history, [{ id: 'Smith, Michael', team: 'Devils', pick: 1 }]);
    assert.deepEqual(restored.config.order, legacy.order);
    assert.match(app.element('notice').innerHTML, /previous draft was restored/);
    assert.equal(app.recovery(), raw);
    assert.deepEqual(app.writes, [], 'loading and downloading do not rewrite stored drafts');

    const choice = E.recommend(restored, PLAYERS).player;
    app.click('', { draft: choice.id });
    const saved = JSON.parse(app.storage.get(CURRENT_KEY));
    assert.equal(saved.history.length, 2);
    assert.deepEqual(saved.history[0], restored.history[0]);
    assert.equal(app.storage.get(key), raw, 'the original legacy draft stays intact');
    assert.ok(app.writes.every(([writtenKey]) => writtenKey === CURRENT_KEY));
  });
}

test('prefers v18 over v17 and v16 when all legacy versions exist', () => {
  const values = {
    'wsl-draft-v18': JSON.stringify(legacyDraft(['Ong Tone, Christopher'])),
    'wsl-draft-v17': JSON.stringify(legacyDraft(['Smith, Michael'])),
    'wsl-draft-v16': JSON.stringify(legacyDraft(['Clarke, Lucas'])),
  };
  const app = boot(values);
  assert.equal(app.state().history[0].id, 'Ong Tone, Christopher');
  assert.deepEqual(app.reads, [CURRENT_KEY, 'wsl-draft-v18']);
  for (const [key, value] of Object.entries(values)) assert.equal(app.storage.get(key), value);
});

test('prefers v17 over v16 when v18 is absent', () => {
  const app = boot({
    'wsl-draft-v17': JSON.stringify(legacyDraft(['Smith, Michael'])),
    'wsl-draft-v16': JSON.stringify(legacyDraft(['Clarke, Lucas'])),
  });
  assert.equal(app.state().history[0].id, 'Smith, Michael');
  assert.deepEqual(app.reads, [CURRENT_KEY, 'wsl-draft-v18', 'wsl-draft-v17']);
});

test('the current saved draft takes precedence over every legacy key', () => {
  const current = E.pickPlayer(E.createState(), PLAYERS, 'Toledano, David');
  const app = boot({
    [CURRENT_KEY]: JSON.stringify(current),
    ...Object.fromEntries(LEGACY_KEYS.map(key => [key, JSON.stringify(legacyDraft(['Smith, Michael']))])),
  });
  assert.deepEqual(app.state(), current);
  assert.deepEqual(app.reads, [CURRENT_KEY]);
  assert.deepEqual(app.writes, []);
});

test('an incompatible newest legacy draft remains downloadable without silently restoring an older snapshot', () => {
  const invalid = legacyDraft([]);
  invalid.history = ['McAlear, Steven'];
  invalid.taken = { 'McAlear, Steven': 'Devils' };
  invalid.pick = 1;
  for (const raw of ['{invalid JSON', JSON.stringify(invalid)]) {
    const olderRaw = JSON.stringify(legacyDraft(['Smith, Michael']));
    const app = boot({ 'wsl-draft-v18': raw, 'wsl-draft-v17': olderRaw });
    assert.deepEqual(app.state().history, []);
    assert.match(app.element('notice').innerHTML, /older saved draft does not match/);
    assert.equal(app.recovery(), raw);
    assert.deepEqual(app.reads, [CURRENT_KEY, 'wsl-draft-v18']);
    assert.equal(app.storage.get('wsl-draft-v18'), raw);
    assert.equal(app.storage.get('wsl-draft-v17'), olderRaw);
    assert.deepEqual(app.writes, []);
  }
});

test('corrupt current storage stays protected and does not fall back to a legacy draft', () => {
  const corrupt = '{corrupt current draft';
  const app = boot({
    [CURRENT_KEY]: corrupt,
    'wsl-draft-v18': JSON.stringify(legacyDraft(['Smith, Michael'])),
  });
  assert.deepEqual(app.state().history, []);
  assert.equal(app.recovery(), corrupt);
  assert.match(app.element('notice').innerHTML, /has not been overwritten/);
  assert.deepEqual(app.reads, [CURRENT_KEY]);
  app.click('', { draft: 'Ong Tone, Christopher' });
  assert.equal(app.state().history.length, 1, 'drafting can continue in memory');
  assert.equal(app.storage.get(CURRENT_KEY), corrupt);
  assert.deepEqual(app.writes, [], 'recovery mode must not overwrite the corrupt original');
});
