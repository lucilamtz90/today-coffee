// ── E2E client simulation — Today Coffee Color Library ──
// Simulates a real client: evaluates 4 palettes, leaves comments, submits.
// Then switches to Design Review and verifies all data is correct.

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8787';
// Palette tabs 0–3 in the app: Miel y Campo, Arena y Vino, Campo y Duraznos, Olivos
const PALETTES = [
  { name: 'Miel y Campo',     rating: 5, upIdx: [0, 2], dnIdx: [],  comment: 'Me encanta el tono crema y el chamomile. Muy cálido y acogedor para una cafetería.' },
  { name: 'Arena y Vino',     rating: 4, upIdx: [2],    dnIdx: [1], comment: 'El vino oscuro es muy impactante, aunque prefiero algo más suave.' },
  { name: 'Campo y Duraznos', rating: 3, upIdx: [1, 3], dnIdx: [],  comment: 'Los tonos durazno son bonitos pero siento que el moss es muy oscuro.' },
  { name: 'Olivos',           rating: 5, upIdx: [3, 4], dnIdx: [0], comment: 'Esta paleta me recuerda a la naturaleza. Los tonos oliva son muy elegantes.' },
];

// ─── helpers ───
function log(msg) { console.log(`  ${msg}`); }
function ok(msg)  { console.log(`  ✓ ${msg}`); }
function fail(msg){ console.error(`  ✗ ${msg}`); process.exitCode = 1; }

function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── main ───
const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext();
const page    = await ctx.newPage();

// Clear any existing localStorage for a clean run
await ctx.addInitScript(() => { localStorage.removeItem('todaycoffee_colorlib_v1'); });

console.log('\n━━━ E2E: Today Coffee Color Library ━━━\n');

// ── 1. Load app ──
console.log('Step 1: Load app');
await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#welcome-backdrop', { state: 'visible', timeout: 5000 });
ok('Welcome overlay appeared');

// ── 2. Start evaluation ──
console.log('\nStep 2: Start evaluation');
await page.click('button:has-text("Empezar")');
await page.waitForSelector('#welcome-backdrop', { state: 'hidden', timeout: 3000 });
ok('Welcome overlay dismissed');
await page.waitForSelector('.tab-btn', { timeout: 3000 });
const tabCount = await page.locator('.tab-btn').count();
assert(tabCount === 6, `Sidebar has ${tabCount} palette tabs (expected 6)`);

// ── 3. Evaluate 4 palettes ──
console.log('\nStep 3: Evaluate 4 palettes');

for (const [idx, palette] of PALETTES.entries()) {
  console.log(`\n  → Palette: "${palette.name}"`);

  // Click the palette tab
  await page.locator('.tab-btn').nth(idx).click();
  await sleep(400);

  // Verify palette title
  const title = await page.locator('#p-title').textContent();
  assert(title.trim() === palette.name, `Palette title = "${palette.name}"`);

  // Star rating
  await page.locator(`#stars .star-btn[data-v="${palette.rating}"]`).click();
  await sleep(200);
  const avgText = await page.locator('#rating-avg').textContent();
  assert(avgText.includes(palette.rating.toFixed(1)), `Star rating saved (${palette.rating}★)`);

  // Upvotes
  for (const ci of palette.upIdx) {
    const upBtn = page.locator(`.swatch-card:nth-child(${ci + 1}) .vote-btn.up`);
    await upBtn.click();
    await sleep(150);
  }
  if (palette.upIdx.length) ok(`Upvoted ${palette.upIdx.length} color(s)`);

  // Downvotes
  for (const ci of palette.dnIdx) {
    const dnBtn = page.locator(`.swatch-card:nth-child(${ci + 1}) .vote-btn.dn`);
    await dnBtn.click();
    await sleep(150);
  }
  if (palette.dnIdx.length) ok(`Downvoted ${palette.dnIdx.length} color(s)`);

  // Verify vote buttons are visually active (up votes)
  for (const ci of palette.upIdx) {
    const hasOn = await page.locator(`.swatch-card:nth-child(${ci + 1}) .vote-btn.up`).evaluate(el => el.classList.contains('on'));
    assert(hasOn, `Color ${ci} upvote button shows as active`);
  }

  // Verify downvote count in DOM matches expected
  for (const ci of palette.dnIdx) {
    const btnText = await page.locator(`.swatch-card:nth-child(${ci + 1}) .vote-btn.dn`).textContent();
    assert(btnText.includes('1'), `Color ${ci} downvote count = 1 in DOM`);
  }

  // Leave comment
  await page.fill('#fb-name', 'Cliente Test');
  await page.fill('#fb-text', palette.comment);
  await page.click('button:has-text("Enviar comentario")');
  await sleep(300);

  // Verify comment appears in the list
  const fbItems = await page.locator('.fb-item').count();
  assert(fbItems >= 1, `Comment saved and visible in feedback list`);

  const fbText = await page.locator('.fb-item-text').first().textContent();
  assert(fbText.trim() === palette.comment, `Comment text matches for "${palette.name}"`);
}

// ── 4. Verify state isolation — switching back shows correct data ──
console.log('\nStep 4: Verify palette switching preserves per-palette data');

// Go back to palette 0 and confirm its comment is still there
await page.locator('.tab-btn').nth(0).click();
await sleep(300);
const p0Comments = await page.locator('.fb-item').count();
assert(p0Comments === 1, 'Palette 0 still has exactly 1 comment after switching away and back');

const p0Text = await page.locator('.fb-item-text').first().textContent();
assert(p0Text.includes('crema'), 'Palette 0 comment is its OWN comment (not another palette\'s)');

// Palette 1 shows its own comment
await page.locator('.tab-btn').nth(1).click();
await sleep(300);
const p1Text = await page.locator('.fb-item-text').first().textContent();
assert(p1Text.includes('vino'), 'Palette 1 comment is its OWN comment');

// Palette 3 (Olivos) shows its own comment
await page.locator('.tab-btn').nth(3).click();
await sleep(300);
const p3Text = await page.locator('.fb-item-text').first().textContent();
assert(p3Text.includes('oliva'), 'Palette 3 (Olivos) comment is its OWN comment');

// Palette 4 (unvisited) shows no comment
await page.locator('.tab-btn').nth(4).click();
await sleep(300);
const p4Comments = await page.locator('.fb-item').count();
assert(p4Comments === 0, 'Palette 4 (unvisited) has 0 comments');

// ── 5. Submit evaluation ──
console.log('\nStep 5: Submit evaluation ("Terminar evaluación")');
await page.click('.btn-finish');
await sleep(400);
await page.waitForSelector('#confirm-backdrop', { state: 'visible', timeout: 3000 });
ok('Confirmation overlay appeared');

// Capture the fetch request to Sheets
let sheetsPayload = null;
page.on('request', req => {
  if (req.url().includes('script.google.com') && req.method() === 'POST') {
    try { sheetsPayload = JSON.parse(req.postData()); } catch {}
  }
});

await page.click('button:has-text("Enviar mis respuestas")');
await sleep(1500);
ok('Submission clicked');

// ── 6. Verify Sheets payload ──
console.log('\nStep 6: Verify Google Sheets payload');

if (!sheetsPayload) {
  fail('No request to Google Sheets was intercepted');
} else {
  assert(sheetsPayload.type === 'full_evaluation', 'Payload type = full_evaluation');
  assert(Array.isArray(sheetsPayload.palettes), 'Payload has palettes array');
  assert(sheetsPayload.palettes.length === 4, `Only 4 palettes sent (interacted ones), got ${sheetsPayload.palettes.length}`);
  assert(sheetsPayload.submissionNumber === 1, 'Submission number = 1');
  assert(typeof sheetsPayload.sessionId === 'string' && sheetsPayload.sessionId.length > 0, 'Session ID present');

  for (const [i, palette] of PALETTES.entries()) {
    const row = sheetsPayload.palettes[i];
    assert(row !== undefined, `Row ${i} exists in payload`);
    if (!row) continue;
    assert(row.paletteName === palette.name, `Row ${i} paletteName = "${palette.name}"`);
    assert(row.rating === palette.rating.toFixed(1), `Row ${i} rating = "${palette.rating.toFixed(1)}"`);
    assert(typeof row.comments === 'string' && row.comments.length > 0, `Row ${i} has comments`);
    assert(row.comments.includes('Cliente Test'), `Row ${i} comment includes author name`);

    if (palette.upIdx.length > 0) {
      assert(typeof row.votesUp === 'string' && row.votesUp.length > 0, `Row ${i} votesUp populated`);
    }
    if (palette.dnIdx.length > 0) {
      assert(typeof row.votesDown === 'string' && row.votesDown.length > 0, `Row ${i} votesDown populated`);
    }
  }

  console.log('\n  Payload preview:');
  sheetsPayload.palettes.forEach((p, i) => {
    console.log(`    [${i}] ${p.paletteName} | ${p.rating}★ | +[${p.votesUp}] -[${p.votesDown}]`);
    console.log(`         "${p.comments.substring(0, 60)}..."`);
  });
}

// ── 7. Verify Design Review ──
console.log('\nStep 7: Verify Design Review panel (?review URL)');

// Reset (app resets after submission — welcome overlay shows again)
await page.waitForSelector('#welcome-backdrop', { state: 'visible', timeout: 4000 }).catch(() => {});

// Open ?review URL fresh
await page.goto(`${BASE_URL}?review`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#welcome-backdrop', { state: 'visible', timeout: 4000 });

// Since state was reset after submission, we need to re-add some test data
// to verify Design Review. We'll inject it directly via localStorage.
const testState = {
  palettes: [
    {
      id: 0, ratings: [5],
      feedback: [{ id: 1, name: 'Cliente Test', text: 'Me encanta el tono crema y el chamomile.', rating: 5, date: '26 de junio de 2026', timestamp: new Date().toISOString(), reviewed: false }],
      swatches: [{ hex: '#F0EAD8', up: 1, down: 0, userVote: 'up' }, { hex: '#99ABA6', up: 0, down: 0, userVote: null }, { hex: '#D2BF81', up: 1, down: 0, userVote: 'up' }, { hex: '#ACB090', up: 0, down: 0, userVote: null }, { hex: '#6F6C43', up: 0, down: 0, userVote: null }],
      colors: [{ name: 'Almond Cream', hex: '#F0EAD8' }, { name: 'Coastal Sage', hex: '#99ABA6' }, { name: 'Golden Chamomile', hex: '#D2BF81' }, { name: 'Meadow Mist', hex: '#ACB090' }, { name: 'Olive Grove', hex: '#6F6C43' }],
      updated: false, updatedAt: null
    },
    {
      id: 1, ratings: [4],
      feedback: [{ id: 2, name: 'Cliente Test', text: 'El vino oscuro es muy impactante.', rating: 4, date: '26 de junio de 2026', timestamp: new Date().toISOString(), reviewed: false }],
      swatches: [{ hex: '#F0EAD8', up: 0, down: 0, userVote: null }, { hex: '#583432', up: 0, down: 1, userVote: 'dn' }, { hex: '#D5CDBC', up: 1, down: 0, userVote: 'up' }, { hex: '#ACB090', up: 0, down: 0, userVote: null }, { hex: '#6F6C43', up: 0, down: 0, userVote: null }],
      colors: [{ name: 'Almond Cream', hex: '#F0EAD8' }, { name: 'Rum Raisin', hex: '#583432' }, { name: 'Coconut Milk', hex: '#D5CDBC' }, { name: 'Meadow Mist', hex: '#ACB090' }, { name: 'Olive Grove', hex: '#6F6C43' }],
      updated: false, updatedAt: null
    },
    { id: 2, ratings: [3], feedback: [{ id: 3, name: 'Cliente Test', text: 'Los tonos durazno son bonitos.', rating: 3, date: '26 de junio de 2026', timestamp: new Date().toISOString(), reviewed: false }], swatches: [{ hex: '#31331F', up: 0, down: 0, userVote: null }, { hex: '#D9BBA0', up: 1, down: 0, userVote: 'up' }, { hex: '#D5CDBC', up: 0, down: 0, userVote: null }, { hex: '#BA8B68', up: 1, down: 0, userVote: 'up' }, { hex: '#645D3B', up: 0, down: 0, userVote: null }], colors: [{ name: 'Moss', hex: '#31331F' }, { name: 'Blush', hex: '#D9BBA0' }, { name: 'Oat', hex: '#D5CDBC' }, { name: 'Terracotta', hex: '#BA8B68' }, { name: 'Olive', hex: '#645D3B' }], updated: false, updatedAt: null },
    { id: 3, ratings: [5], feedback: [{ id: 4, name: 'Cliente Test', text: 'Esta paleta me recuerda a la naturaleza. Los tonos oliva son muy elegantes.', rating: 5, date: '26 de junio de 2026', timestamp: new Date().toISOString(), reviewed: false }], swatches: [{ hex: '#DCD6BA', up: 0, down: 1, userVote: 'dn' }, { hex: '#F9F8EB', up: 0, down: 0, userVote: null }, { hex: '#9A7844', up: 0, down: 0, userVote: null }, { hex: '#9F9C6C', up: 1, down: 0, userVote: 'up' }, { hex: '#555439', up: 1, down: 0, userVote: 'up' }], colors: [{ name: 'Raw Linen', hex: '#DCD6BA' }, { name: 'Almond Bloom', hex: '#F9F8EB' }, { name: 'Toasted Sienna', hex: '#9A7844' }, { name: 'Olive Husk', hex: '#9F9C6C' }, { name: 'Forest Seed', hex: '#555439' }], updated: false, updatedAt: null },
    { id: 4, ratings: [], feedback: [], swatches: [{ hex: '#374526', up: 0, down: 0, userVote: null }, { hex: '#536940', up: 0, down: 0, userVote: null }, { hex: '#A8B398', up: 0, down: 0, userVote: null }, { hex: '#FAF3E0', up: 0, down: 0, userVote: null }], colors: [{ name: 'Alocasia', hex: '#374526' }, { name: 'Calathea', hex: '#536940' }, { name: 'Jade', hex: '#A8B398' }, { name: 'Perlite', hex: '#FAF3E0' }], updated: false, updatedAt: null },
    { id: 5, ratings: [], feedback: [], swatches: [{ hex: '#374526', up: 0, down: 0, userVote: null }, { hex: '#536940', up: 0, down: 0, userVote: null }, { hex: '#A8B398', up: 0, down: 0, userVote: null }, { hex: '#FAF3E0', up: 0, down: 0, userVote: null }], colors: [{ name: 'Alocasia', hex: '#374526' }, { name: 'Calathea', hex: '#536940' }, { name: 'Jade', hex: '#A8B398' }, { name: 'Perlite', hex: '#FAF3E0' }], updated: false, updatedAt: null }
  ]
};

await page.evaluate((state) => {
  localStorage.setItem('todaycoffee_colorlib_v1', JSON.stringify(state));
}, testState);

// Dismiss welcome and open Design Review
await page.click('button:has-text("Después")');
await sleep(400);

const footerVisible = await page.locator('#sidebar-footer').isVisible();
assert(footerVisible, 'Design Review button visible with ?review param');

await page.click('#admin-btn');
await sleep(500);

const adminVisible = await page.locator('#admin-view').evaluate(el => el.classList.contains('visible'));
assert(adminVisible, 'Admin view became visible');

// Verify each palette block has the right data
const blocks = page.locator('.admin-palette-block');
const blockCount = await blocks.count();
assert(blockCount === 6, `Design Review shows all 6 palette blocks (got ${blockCount})`);

// Palette 0: rating 5.0, 1 comment, 2 upvotes
const b0 = blocks.nth(0);
const b0name = await b0.locator('.admin-palette-name').textContent();
assert(b0name.includes('Miel y Campo'), 'Block 0 = Miel y Campo');
const b0rating = await b0.locator('.stat-val').nth(1).textContent();
assert(b0rating === '5.0', `Block 0 rating = "5.0" (got "${b0rating}")`);
const b0comments = await b0.locator('.stat-val').nth(0).textContent();
assert(b0comments === '1', `Block 0 has 1 comment (got "${b0comments}")`);
const b0up = await b0.locator('.stat-val.vote-up-num').textContent();
assert(b0up === '2', `Block 0 total upvotes = 2 (got "${b0up}")`);
const b0dn = await b0.locator('.stat-val.vote-dn-num').textContent();
assert(b0dn === '0', `Block 0 total downvotes = 0 (got "${b0dn}")`);

// Palette 1: downvote on Rum Raisin should appear
const b1 = blocks.nth(1);
const b1dn = await b1.locator('.stat-val.vote-dn-num').textContent();
assert(b1dn === '1', `Block 1 (Arena y Vino) has 1 downvote (got "${b1dn}")`);

// Palette 3: downvote on First Frost
const b3 = blocks.nth(3);
const b3dn = await b3.locator('.stat-val.vote-dn-num').textContent();
assert(b3dn === '1', `Block 3 (Hojas aromáticas) has 1 downvote (got "${b3dn}")`);

// Palette 4 & 5: no comments
const b4 = blocks.nth(4);
const b4empty = await b4.locator('.empty').count();
assert(b4empty === 1, 'Block 4 (Pastos) shows "Sin comentarios"');

// Verify "Marcar revisado" button exists for feedback
const markBtns = await page.locator('.mark-btn').count();
assert(markBtns === 4, `4 "Marcar revisado" buttons (one per submitted palette), got ${markBtns}`);

// ── Result ──
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (process.exitCode === 1) {
  console.error('  SOME TESTS FAILED — see ✗ above');
} else {
  console.log('  ALL CHECKS PASSED ✓');
  console.log('  Data is correctly per-palette, sent to Sheets, visible in Design Review.');
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

await browser.close();
