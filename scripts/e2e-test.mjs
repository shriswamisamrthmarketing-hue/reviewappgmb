// End-to-end test of all four business flows + admin dashboard.
// Usage: start the app (npm run build && npm start), then:
//   BASE_URL=http://localhost:3000 ADMIN_PASSWORD=... node scripts/e2e-test.mjs
// Needs Playwright with Chromium installed (npx playwright install chromium).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PW = process.env.ADMIN_PASSWORD;
const SHOTS = process.env.SHOTS_DIR || 'test-screenshots';
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const ok = (name, cond, info = '') => {
  results.push({ name, pass: !!cond, info });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`);
};

const FLOWS = [
  { slug: 'jatan', short: 'Jatan', ui: 'en', rating: 0, reviewLang: 0, details: 'The sample flat was well finished.' },
  { slug: 'jatan', short: 'Jatan', ui: 'mr', rating: 3, reviewLang: 1 },
  { slug: 'dhruta', short: 'THE DHRUTA CONSTRUCTIONS', ui: 'en', rating: 1, reviewLang: 0 },
  { slug: 'dhruta', short: 'THE DHRUTA CONSTRUCTIONS', ui: 'hi', rating: 2, reviewLang: 2 },
  { slug: 'haemoglobbinn', short: 'Haemoglobbinn', ui: 'en', rating: 0, reviewLang: 0 },
  { slug: 'haemoglobbinn', short: 'Haemoglobbinn', ui: 'en', rating: 3, reviewLang: 1 },
  { slug: 'makoons-wakad', short: 'Makoons Wakad', ui: 'mr', rating: 0, reviewLang: 1 },
  { slug: 'makoons-wakad', short: 'Makoons Wakad', ui: 'hi', rating: 1, reviewLang: 2 },
];
const LANG_LABEL = { en: 'EN', mr: 'मराठी', hi: 'हिंदी' };

async function runFlow(browser, f, i) {
  const ctx = await browser.newContext({ ...devices['Pixel 7'], permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/review/${f.slug}?s=qr`);
  await page.getByRole('button', { name: LANG_LABEL[f.ui], exact: true }).click();
  let steps = 0;
  while (steps++ < 15) {
    await page.waitForFunction(() => document.querySelector('#draft') || document.querySelector('.composer button, .details-box'), null, { timeout: 30000 });
    if (await page.$('#draft')) break;
    if (await page.$('.options.grid2')) {
      await page.locator('.options.grid2 .chip').nth(f.rating).click();
    } else if (await page.$('.options.grid3')) {
      await page.locator('.options.grid3 .chip').nth(f.reviewLang).click();
    } else if (await page.$('.details-box')) {
      if (f.details) {
        await page.fill('.details-box textarea', f.details);
        await page.locator('.details-box .btn.primary').click();
      } else await page.locator('.details-box .btn.ghost').click();
    } else if (await page.$('.composer-actions .btn.primary')) {
      const chips = page.locator('.options .chip');
      await chips.nth(0).click();
      if ((await chips.count()) > 2) await chips.nth(2).click();
      await page.locator('.composer-actions .btn.primary').click();
    } else if (await page.$('.options .chip')) {
      await page.locator('.options .chip').first().click();
    } else {
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(150);
  }
  await page.waitForSelector('#draft', { timeout: 30000 });
  const draft = await page.inputValue('#draft');
  const tag = `${f.slug} [ui=${f.ui}, rating#${f.rating}, reviewLang#${f.reviewLang}]`;
  ok(`Flow ${tag}: draft generated`, draft.length > 30, draft.slice(0, 160).replace(/\n/g, ' '));
  ok(`Flow ${tag}: mentions business name`, draft.includes(f.short));
  if (f.reviewLang > 0) ok(`Flow ${tag}: written in Devanagari`, /[ऀ-ॿ]/.test(draft));
  if (f.details) ok(`Flow ${tag}: includes customer's own words`, /sample flat/i.test(draft));
  // edit + copy
  await page.fill('#draft', draft + ' Edited.');
  await page.getByRole('button', { name: /Copy|कॉपी/ }).click();
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  ok(`Flow ${tag}: copy puts edited text on clipboard`, clip.endsWith('Edited.'));
  await page.screenshot({ path: `${SHOTS}/${String(i + 1).padStart(2, '0')}-${f.slug}-${f.ui}.png` });
  ok(`Flow ${tag}: no browser errors`, errors.length === 0, errors.join(' | '));
  await ctx.close();
  return draft;
}

async function api(path, opts = {}, cookie) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...(opts.headers || {}) },
  });
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, json, res };
}

(async () => {
  const browser = await chromium.launch();

  // 1. Customer flows
  for (let i = 0; i < FLOWS.length; i++) await runFlow(browser, FLOWS[i], i);

  // 2. API safety checks
  let r = await api('/api/generate', { method: 'POST', body: JSON.stringify({ slug: 'unknown', rating: 'good', language: 'en' }) });
  ok('API: unknown business → 404', r.status === 404);
  r = await api('/api/generate', { method: 'POST', body: JSON.stringify({ slug: 'jatan', rating: 'amazing', language: 'en' }) });
  ok('API: invalid rating → 400', r.status === 400);
  r = await api('/api/generate', {
    method: 'POST',
    body: JSON.stringify({ slug: 'makoons-wakad', rating: 'good', language: 'en', answers: { liked: ['teaching', 'free-ipad-for-every-child'] } }),
    headers: { 'x-forwarded-for': '10.9.9.9' },
  });
  ok('API: unknown option ids are ignored (no injected claims)', r.status === 200 && !/ipad/i.test(r.json.draft), r.json.draft);
  r = await api('/api/admin/businesses');
  ok('API: admin data requires login → 401', r.status === 401);
  r = await api('/review/some-other-business');
  ok('Only 4 businesses: unknown slug → 404', r.status === 404);

  // 3. Admin dashboard
  if (PW) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/admin`);
    ok('Admin: redirects to login', page.url().includes('/admin/login'));
    await page.fill('#pw', 'wrong-password');
    await page.click('button:has-text("Sign in")');
    await page.waitForSelector('.msgline.err');
    ok('Admin: wrong password rejected', true);
    await page.fill('#pw', PW);
    await page.click('button:has-text("Sign in")');
    await page.waitForSelector('.biz-card');
    const cards = await page.locator('.biz-card').count();
    ok('Admin: dashboard shows exactly 4 businesses', cards === 4, `${cards} cards`);
    const statsText = await page.locator('table.stats').innerText();
    ok('Admin: usage statistics table rendered', /Jatan/.test(statsText) && /Makoons Wakad/.test(statsText));
    await page.screenshot({ path: `${SHOTS}/20-admin-dashboard.png`, fullPage: true });

    // Edit Jatan: management URL must be rejected, real review URL accepted
    await page.click('.biz-card:has-text("Jatan") >> text=Edit');
    await page.waitForSelector('input[placeholder*="g.page"]');
    await page.fill('input[placeholder*="g.page"]', 'https://business.google.com/n/1120873921993387860/profile?fid=9008443073859340212');
    await page.click('button:has-text("Save changes")');
    await page.waitForSelector('.msgline.err');
    ok('Admin: management link rejected as review URL', /MANAGEMENT/.test(await page.locator('.msgline.err').innerText()));
    await page.fill('input[placeholder*="g.page"]', 'https://g.page/r/TEST-JATAN/review');
    await page.click('button:has-text("Save changes")');
    await page.waitForSelector('.msgline.ok');
    ok('Admin: valid review URL saved', true);
    await page.screenshot({ path: `${SHOTS}/21-admin-edit-details.png`, fullPage: true });

    // Questions tab: edit an option label, add one
    await page.click('.tabs button:has-text("AI questions")');
    const firstOpt = page.locator('.q-card').nth(1).locator('.opt-row input[type=text]').first();
    await firstOpt.fill('Quality of construction work');
    await page.locator('.q-card').nth(1).locator('button:has-text("+ Add option")').click();
    const newRow = page.locator('.q-card').nth(1).locator('.opt-row').last();
    await newRow.locator('input').nth(0).fill('Amenities');
    await newRow.locator('input').nth(1).fill('सुविधा');
    await newRow.locator('input').nth(2).fill('सुविधाएँ');
    await page.click('button:has-text("Save changes")');
    await page.waitForSelector('.msgline.ok');
    ok('Admin: questions/options edited and saved', true);
    await page.screenshot({ path: `${SHOTS}/22-admin-questions.png`, fullPage: true });

    // QR tab + downloads
    await page.click('.tabs button:has-text("QR code")');
    await page.waitForSelector('.qr-box img');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Download printable poster")')]);
    const posterPath = `${SHOTS}/jatan-poster.png`;
    await dl.saveAs(posterPath);
    ok('Admin: poster QR PNG downloads', fs.statSync(posterPath).size > 20000);
    const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("SVG")')]);
    const svgPath = `${SHOTS}/jatan-qr.svg`;
    await dl2.saveAs(svgPath);
    ok('Admin: SVG QR downloads', fs.readFileSync(svgPath, 'utf8').includes('<svg'));
    await page.screenshot({ path: `${SHOTS}/23-admin-qr.png`, fullPage: true });

    // Keywords tab: add a keyword through the UI, link it to one answer, save, and check it on the dashboard
    await page.goto(`${BASE}/admin/makoons-wakad?tab=keywords`);
    await page.waitForSelector('.kw-card');
    const before = await page.locator('.kw-card').count();
    ok('Admin: Makoons Wakad keywords listed', before >= 2, `${before} keywords`);
    await page.click('button:has-text("+ Add keyword")');
    const card = page.locator('.kw-card').last();
    await card.locator('.kw-text').fill('kids activity centre in Wakad');
    await card.locator('select').selectOption('some');
    await card.locator('.kw-opt', { hasText: 'Activities and learning' }).first().click();
    await page.click('button:has-text("Save changes")');
    await page.waitForSelector('.msgline.ok');
    await page.reload();
    await page.waitForSelector('.kw-card');
    const texts = await page.locator('.kw-text').evaluateAll((els) => els.map((e) => e.value));
    ok('Admin: new keyword saved with answer link', texts.includes('kids activity centre in Wakad') && (await page.locator('.kw-card').last().locator('.kw-opt.on').count()) === 1, texts.join(', '));
    await page.screenshot({ path: `${SHOTS}/25-admin-keywords.png`, fullPage: true });
    await page.goto(`${BASE}/admin`);
    await page.waitForSelector('.kw-board');
    ok('Admin: dashboard shows keywords for all 4 businesses', (await page.locator('.kw-board .card').count()) === 4 && (await page.locator('.kw-board').innerText()).includes('kids activity centre in Wakad'));
    await page.screenshot({ path: `${SHOTS}/26-admin-dashboard-keywords.png`, fullPage: true });

    // Customer chat now shows the new option and the Google button
    const cookies = await ctx.cookies();
    const m = await browser.newContext({ ...devices['Pixel 7'], permissions: ['clipboard-read', 'clipboard-write'] });
    const p = await m.newPage();
    await p.goto(`${BASE}/review/jatan`);
    await p.locator('.options.grid2 .chip').nth(0).click();
    await p.locator('.options .chip').first().waitFor();
    await p.locator('.options .chip').first().click(); // connection
    await p.locator('.composer-actions .btn.primary').waitFor();
    const labels = await p.locator('.options .chip').allInnerTexts();
    ok('Chat reflects admin edits (new + renamed options)', labels.includes('Amenities') && labels.includes('Quality of construction work'), labels.join(', '));
    await p.locator('.options .chip', { hasText: 'Amenities' }).click();
    await p.locator('.composer-actions .btn.primary').click();
    await p.locator('.options.grid3 .chip').first().click();
    await p.locator('.details-box .btn.ghost').click();
    await p.waitForSelector('#draft');
    const href = await p.locator('a:has-text("Post on Google")').getAttribute('href');
    ok('Chat: Post on Google button uses the saved public review link', href === 'https://g.page/r/TEST-JATAN/review');
    await p.screenshot({ path: `${SHOTS}/24-jatan-with-google-button.png` });
    await m.close();

    // Stats
    const st = await api('/api/admin/businesses', {}, cookies.map((c) => `${c.name}=${c.value}`).join('; '));
    const s = st.json.stats;
    ok('Stats: visits & drafts counted for all 4 businesses',
      ['jatan', 'dhruta', 'haemoglobbinn', 'makoons-wakad'].every((k) => s[k].visits > 0 && s[k].drafts > 0),
      JSON.stringify(Object.fromEntries(Object.entries(s).map(([k, v]) => [k, { visits: v.visits, qr: v.qr_scans, drafts: v.drafts, copies: v.copies }]))));
    await ctx.close();
  } else console.log('SKIP admin tests (set ADMIN_PASSWORD)');

  await browser.close();
  const failed = results.filter((x) => !x.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
