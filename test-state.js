// ── Unit tests for Today Coffee Color Library ──
// Run with: node test-state.js

// ─── Minimal palette data (mirrors PALETTES in index.html) ───
const PALETTES = [
  { id: 0, name: 'Miel y Campo', colors: [
    { name: 'Almond Cream', hex: '#F0EAD8' },
    { name: 'Coastal Sage', hex: '#99ABA6' },
    { name: 'Golden Chamomile', hex: '#D2BF81' },
  ]},
  { id: 1, name: 'Arena y Vino', colors: [
    { name: 'Almond Cream', hex: '#F0EAD8' },
    { name: 'Rum Raisin', hex: '#583432' },
  ]},
  { id: 2, name: 'Campo y Duraznos', colors: [
    { name: 'Moss', hex: '#31331F' },
    { name: 'Blush', hex: '#D9BBA0' },
  ]},
];

// ─── State functions (mirrors index.html logic) ───
function buildInitState() {
  return {
    palettes: PALETTES.map(p => ({
      id: p.id,
      ratings: [],
      feedback: [],
      swatches: p.colors.map(c => ({ hex: c.hex, up: 0, down: 0, userVote: null })),
      colors:   p.colors.map(c => ({ name: c.name, hex: c.hex })),
      updated: false,
      updatedAt: null
    }))
  };
}

// ─── FIXED vote function (what the fix should look like) ───
function vote(state, paletteIdx, ci, dir) {
  const sw = state.palettes[paletteIdx].swatches[ci];
  if (!sw) return;
  const key = dir === 'dn' ? 'down' : 'up';  // normalize 'dn' → 'down'
  if (sw.userVote === dir) {
    sw[key]--;
    sw.userVote = null;
  } else {
    if (sw.userVote) sw[sw.userVote === 'dn' ? 'down' : 'up']--;
    sw[key]++;
    sw.userVote = dir;
  }
}

// ─── BUGGY vote function (current code — for regression proof) ───
function voteBuggy(state, paletteIdx, ci, dir) {
  const sw = state.palettes[paletteIdx].swatches[ci];
  if (!sw) return;
  if (sw.userVote === dir) { sw[dir]--; sw.userVote = null; }
  else {
    if (sw.userVote) sw[sw.userVote]--;
    sw[dir]++;
    sw.userVote = dir;
  }
}

// ─── submitFullEvaluation filter logic (mirrors index.html) ───
function buildPayload(state) {
  return PALETTES.map((p, i) => {
    const ps        = state.palettes[i];
    const avgR      = ps.ratings.length
      ? (ps.ratings.reduce((a,b) => a + b, 0) / ps.ratings.length).toFixed(1) : '';
    const votesUp   = ps.swatches.map((sw,ci) => sw.userVote === 'up' ? ps.colors[ci].name : null).filter(Boolean).join(', ');
    const votesDown = ps.swatches.map((sw,ci) => sw.userVote === 'dn' ? ps.colors[ci].name : null).filter(Boolean).join(', ');
    const comments  = ps.feedback.map(fb => `${fb.name}: ${fb.text}`).join(' | ');
    if (!avgR && !votesUp && !votesDown && !comments) return null;
    return { paletteName: p.name, rating: avgR, votesUp, votesDown, comments };
  }).filter(Boolean);
}

// ─── Test harness ───
let passed = 0;
let failed = 0;

function assert(condition, name, detail) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${name}`);
}

// ════════════════════════════════════════════════════════════════
// SUITE 1 — State isolation (palettes don't share arrays)
// ════════════════════════════════════════════════════════════════
section('Suite 1: State isolation — no shared array references');
{
  const st = buildInitState();
  st.palettes[0].feedback.push({ text: 'hello' });
  assert(st.palettes[1].feedback.length === 0, 'Palette 1 feedback untouched when palette 0 gets comment');
  assert(st.palettes[2].feedback.length === 0, 'Palette 2 feedback untouched when palette 0 gets comment');

  st.palettes[0].ratings.push(4);
  assert(st.palettes[1].ratings.length === 0, 'Palette 1 ratings untouched when palette 0 gets rating');

  st.palettes[0].swatches[0].up++;
  assert(st.palettes[1].swatches[0].up === 0, 'Palette 1 swatch untouched when palette 0 swatch voted');
}

// ════════════════════════════════════════════════════════════════
// SUITE 2 — Vote function (fixed version)
// ════════════════════════════════════════════════════════════════
section('Suite 2: Vote function — up/down counts and toggle');
{
  const st = buildInitState();

  // Upvote
  vote(st, 0, 0, 'up');
  assert(st.palettes[0].swatches[0].up === 1,   'up count = 1 after upvote');
  assert(st.palettes[0].swatches[0].down === 0,  'down count = 0 after upvote');
  assert(st.palettes[0].swatches[0].userVote === 'up', 'userVote = up after upvote');

  // Downvote
  vote(st, 0, 1, 'dn');
  assert(st.palettes[0].swatches[1].down === 1,  'down count = 1 after downvote');
  assert(st.palettes[0].swatches[1].up === 0,    'up count = 0 after downvote');
  assert(st.palettes[0].swatches[1].userVote === 'dn', 'userVote = dn after downvote');
  assert(st.palettes[0].swatches[1].dn === undefined,  'no rogue .dn property on swatch');

  // Toggle upvote off
  vote(st, 0, 0, 'up');
  assert(st.palettes[0].swatches[0].up === 0,    'up count = 0 after toggle off');
  assert(st.palettes[0].swatches[0].userVote === null, 'userVote = null after toggle off');

  // Toggle downvote off
  vote(st, 0, 1, 'dn');
  assert(st.palettes[0].swatches[1].down === 0,  'down count = 0 after toggle off');
  assert(st.palettes[0].swatches[1].userVote === null, 'userVote = null after dn toggle off');

  // Change vote: up → down
  vote(st, 0, 2, 'up');
  vote(st, 0, 2, 'dn');
  assert(st.palettes[0].swatches[2].up === 0,    'up = 0 after changing up→dn');
  assert(st.palettes[0].swatches[2].down === 1,  'down = 1 after changing up→dn');
  assert(st.palettes[0].swatches[2].userVote === 'dn', 'userVote = dn after changing up→dn');

  // Change vote: down → up
  vote(st, 0, 2, 'up');
  assert(st.palettes[0].swatches[2].down === 0,  'down = 0 after changing dn→up');
  assert(st.palettes[0].swatches[2].up === 1,    'up = 1 after changing dn→up');
  assert(st.palettes[0].swatches[2].userVote === 'up', 'userVote = up after changing dn→up');
}

// ════════════════════════════════════════════════════════════════
// SUITE 3 — Votes stay isolated per palette
// ════════════════════════════════════════════════════════════════
section('Suite 3: Votes isolated per palette');
{
  const st = buildInitState();
  vote(st, 0, 0, 'up');   // upvote color 0 on palette 0
  vote(st, 0, 1, 'dn');   // downvote color 1 on palette 0
  vote(st, 1, 0, 'dn');   // downvote color 0 on palette 1

  assert(st.palettes[0].swatches[0].up === 1,    'P0 C0 up = 1');
  assert(st.palettes[0].swatches[1].down === 1,  'P0 C1 down = 1');
  assert(st.palettes[1].swatches[0].down === 1,  'P1 C0 down = 1');
  assert(st.palettes[1].swatches[0].up === 0,    'P1 C0 up untouched');
  assert(st.palettes[2].swatches[0].up === 0,    'P2 C0 untouched');
  assert(st.palettes[2].swatches[0].down === 0,  'P2 C0 down untouched');
}

// ════════════════════════════════════════════════════════════════
// SUITE 4 — Comments per palette
// ════════════════════════════════════════════════════════════════
section('Suite 4: Comments isolated per palette');
{
  const st = buildInitState();
  st.palettes[0].feedback.push({ id: 1, name: 'Ana', text: 'Me encanta el beige', rating: 5 });
  st.palettes[1].feedback.push({ id: 2, name: 'Luis', text: 'El rojo es fuerte', rating: 3 });

  assert(st.palettes[0].feedback.length === 1, 'P0 has 1 comment');
  assert(st.palettes[0].feedback[0].text === 'Me encanta el beige', 'P0 comment text correct');
  assert(st.palettes[1].feedback.length === 1, 'P1 has 1 comment');
  assert(st.palettes[1].feedback[0].text === 'El rojo es fuerte', 'P1 comment text correct');
  assert(st.palettes[2].feedback.length === 0, 'P2 has 0 comments');
}

// ════════════════════════════════════════════════════════════════
// SUITE 5 — submitFullEvaluation payload
// ════════════════════════════════════════════════════════════════
section('Suite 5: submitFullEvaluation — only sends palettes with data');
{
  const st = buildInitState();
  // Only interact with palette 0
  st.palettes[0].ratings.push(4);
  vote(st, 0, 0, 'up');
  st.palettes[0].feedback.push({ name: 'Ana', text: 'Perfecto' });

  const payload = buildPayload(st);
  assert(payload.length === 1,                      'Only 1 palette in payload (only P0 has data)');
  assert(payload[0].paletteName === 'Miel y Campo', 'paletteName correct');
  assert(payload[0].rating === '4.0',               'rating correct');
  assert(payload[0].votesUp === 'Almond Cream',     'votesUp correct color name');
  assert(payload[0].votesDown === '',               'votesDown empty');
  assert(payload[0].comments === 'Ana: Perfecto',   'comments correct');
}

section('Suite 5b: submitFullEvaluation — votesDown from dn votes');
{
  const st = buildInitState();
  vote(st, 1, 0, 'dn');  // downvote Almond Cream on P1
  vote(st, 1, 1, 'up');  // upvote Rum Raisin on P1

  const payload = buildPayload(st);
  assert(payload.length === 1,                       'Only 1 palette in payload');
  assert(payload[0].paletteName === 'Arena y Vino',  'correct palette name');
  assert(payload[0].votesDown === 'Almond Cream',    'downvoted color name correct');
  assert(payload[0].votesUp   === 'Rum Raisin',      'upvoted color name correct');
}

section('Suite 5c: submitFullEvaluation — multiple palettes with data');
{
  const st = buildInitState();
  st.palettes[0].ratings.push(5);
  st.palettes[2].feedback.push({ name: 'Bob', text: 'Me gusta el verde' });

  const payload = buildPayload(st);
  assert(payload.length === 2,                          'Both interacted palettes in payload');
  assert(payload[0].paletteName === 'Miel y Campo',    'first palette correct');
  assert(payload[1].paletteName === 'Campo y Duraznos','second palette correct');
}

// ════════════════════════════════════════════════════════════════
// REGRESSION — prove the bug exists with buggy function
// ════════════════════════════════════════════════════════════════
section('Regression: Buggy vote() sets .dn=NaN instead of modifying .down');
{
  const st = buildInitState();
  voteBuggy(st, 0, 0, 'dn');
  const sw = st.palettes[0].swatches[0];
  assert(sw.down === 0, 'BUG: sw.down stays 0 after downvote — display always showed 0');
  assert(isNaN(sw.dn),  'BUG: sw.dn = NaN (undefined++ = NaN) — rogue property created by old code');
}

// ════════════════════════════════════════════════════════════════
// RESULT
// ════════════════════════════════════════════════════════════════
console.log(`\n${'─'.repeat(50)}`);
console.log(`  ${passed} passed   ${failed > 0 ? failed + ' FAILED' : '0 failed'}`);
console.log(`${'─'.repeat(50)}\n`);
if (failed > 0) process.exit(1);
