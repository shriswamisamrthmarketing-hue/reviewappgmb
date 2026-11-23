// Checks business-wise keyword rules end to end (needs the app running with scripts/mock-gemini.mjs).
// BASE_URL=http://localhost:3000 ADMIN_PASSWORD=... node scripts/keyword-test.mjs
// Rule (2026-11-21): keywords are CUSTOMER-TAPPED ONLY. Nothing is inserted automatically; a keyword
// the request names is used only if it is enabled and eligible for the customer's answers.
const BASE = process.env.BASE_URL || 'http://localhost:3000';
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`);
};
let ipN = 0;
const gen = async (payload) => {
  const r = await fetch(BASE + '/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.0.0.${++ipN}` },
    body: JSON.stringify(payload),
  });
  return (await r.json()).draft || '';
};
// The mock echoes the keyword(s) the prompt allowed as "[allowed: …]".
const allowed = (d) => ((d.match(/\[allowed: ([^\]]*)\]/) || [])[1] || '').split(' / ').filter((k) => k && k !== 'none');

(async () => {
  // 1. No keyword tapped → nothing allowed, for every business
  for (const [slug, answers] of [
    ['makoons-wakad', { program: ['daycare'], liked: ['teachers'] }],
    ['haemoglobbinn', { services: ['seo'], liked: ['support'] }],
    ['dhruta', { connection: ['redevelopment'] }],
    ['jatan', { liked: ['quality'] }],
  ]) {
    const d = await gen({ slug, rating: 'excellent', language: 'en', answers });
    ok(`${slug}: no keyword tapped → no keyword inserted`, allowed(d).length === 0, allowed(d).join(', ') || 'none');
  }

  // 2. Tapped + eligible → used; tapped but not eligible for the answers → ignored
  let d = await gen({ slug: 'makoons-wakad', rating: 'excellent', language: 'en', answers: { program: ['daycare'], liked: ['teachers'] }, keyword: 'daycare in Wakad' });
  ok('Makoons daycare parent taps "daycare in Wakad" → used', allowed(d).includes('daycare in Wakad'), allowed(d).join(', '));
  d = await gen({ slug: 'makoons-wakad', rating: 'excellent', language: 'en', answers: { program: ['daycare'], liked: ['teachers'] }, keyword: 'preschool in Wakad' });
  ok('Makoons daycare parent sends preschool-only keyword → ignored', allowed(d).length === 0, allowed(d).join(', ') || 'none');
  d = await gen({ slug: 'dhruta', rating: 'good', language: 'hi', answers: { connection: ['home-buyer'], liked: ['quality'] }, keyword: 'society redevelopment in Pune' });
  ok('Dhruta home buyer sends redevelopment keyword → ignored', allowed(d).length === 0, allowed(d).join(', ') || 'none');
  d = await gen({ slug: 'dhruta', rating: 'excellent', language: 'en', answers: { connection: ['redevelopment'] }, keyword: 'society redevelopment in Pune' });
  ok('Dhruta society member taps redevelopment keyword → used', allowed(d).includes('society redevelopment in Pune'));
  d = await gen({ slug: 'jatan', rating: 'excellent', language: 'en', answers: { liked: ['quality'] }, keyword: 'cheapest flats in India' });
  ok('Keyword not configured for the business → ignored', allowed(d).length === 0, allowed(d).join(', ') || 'none');
  d = await gen({ slug: 'jatan', rating: 'excellent', language: 'en', answers: { liked: ['quality'] } });
  ok('Facts sent to AI are only the selections', /What I liked: [^;\]]*quality/i.test(d) && !/Professional team/.test(d), d);

  // 3. Admin switches a keyword off → it is refused even when tapped
  const login = await fetch(BASE + '/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
  });
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  const biz = (await (await fetch(BASE + '/api/admin/businesses/jatan', { headers: { cookie } })).json()).business;
  biz.keywords = biz.keywords.map((k) => (k.text === '2 BHK flats in Sahakar Nagar' ? { ...k, enabled: false } : k));
  const put = await fetch(BASE + '/api/admin/businesses/jatan', { method: 'PUT', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(biz) });
  ok('Admin saves keyword change', put.ok);
  d = await gen({ slug: 'jatan', rating: 'excellent', language: 'en', answers: { liked: ['quality'] }, keyword: '2 BHK flats in Sahakar Nagar' });
  ok('Switched-off keyword is not used even if tapped', allowed(d).length === 0, allowed(d).join(', ') || 'none');
  biz.keywords = biz.keywords.map((k) => ({ ...k, enabled: true }));
  await fetch(BASE + '/api/admin/businesses/jatan', { method: 'PUT', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(biz) });

  console.log(`\n${pass}/${pass + fail} keyword checks passed`);
  process.exit(fail ? 1 : 0);
})();
