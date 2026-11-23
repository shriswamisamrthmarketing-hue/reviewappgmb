// Copies businesses (and their owner accounts) that exist ONLY in the local test file into the live
// Supabase database, so their QR codes stop showing 404 on the live site.
//
// SAFE BY DESIGN
//  • Dry run by default: it only lists what it WOULD add. Nothing is written without --apply.
//  • Insert-only: it never updates, overwrites or deletes anything already in Supabase.
//    A business whose slug already exists there is skipped; so is an owner whose email/username exists.
//  • Statistics, events and feedback are NOT copied (local ones are test data).
//
// Usage (from the project folder), with the SAME Supabase keys that Render uses:
//   node --env-file=.env.local scripts/sync-local-to-supabase.mjs            ← dry run
//   node --env-file=.env.local scripts/sync-local-to-supabase.mjs --apply    ← really copy
// Optional: --file=path/to/local-db.json (default: data/local-db.json or LOCAL_DATA_FILE)
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const apply = process.argv.includes('--apply');
const fileArg = process.argv.find((a) => a.startsWith('--file='));
const file = fileArg ? fileArg.slice(7) : process.env.LOCAL_DATA_FILE || path.join(process.cwd(), 'data', 'local-db.json');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed (the same values Render uses). Put them in .env.local.');
  process.exit(1);
}
const local = JSON.parse(fs.readFileSync(file, 'utf8'));
const sb = createClient(url, key, { auth: { persistSession: false } });

const BUSINESS_COLS = ['slug', 'name', 'short_name', 'category', 'location', 'logo_url', 'primary_color', 'accent_color', 'google_review_url', 'gbp_manage_url', 'seo_keywords', 'keywords', 'greeting', 'questions', 'updated_at'];
const OWNER_COLS = ['id', 'email', 'username', 'name', 'phone', 'business_slug', 'password_hash', 'status', 'source', 'active', 'session_version', 'created_at', 'last_login_at'];
const pick = (o, cols) => Object.fromEntries(cols.filter((c) => o[c] !== undefined).map((c) => [c, o[c]]));

const { data: remoteBiz, error: e1 } = await sb.from('businesses').select('slug');
if (e1) throw new Error('Could not read Supabase businesses: ' + e1.message);
const { data: remoteOwners, error: e2 } = await sb.from('business_owners').select('id, email, username');
if (e2) throw new Error('Could not read Supabase owners: ' + e2.message + ' (run supabase/schema.sql first)');
const haveSlug = new Set(remoteBiz.map((b) => b.slug));
const haveEmail = new Set(remoteOwners.map((o) => String(o.email).toLowerCase()));
const haveUser = new Set(remoteOwners.filter((o) => o.username).map((o) => String(o.username).toLowerCase()));
const haveId = new Set(remoteOwners.map((o) => o.id));

const newBiz = (local.businesses || []).filter((b) => !haveSlug.has(b.slug));
const newSlugs = new Set([...haveSlug, ...newBiz.map((b) => b.slug)]);
const newOwners = (local.owners || []).filter(
  (o) => newSlugs.has(o.business_slug) && !haveId.has(o.id) && !haveEmail.has(String(o.email).toLowerCase()) && !(o.username && haveUser.has(String(o.username).toLowerCase()))
);

console.log(`Local file: ${file}`);
console.log(`Supabase already has ${haveSlug.size} businesses and ${remoteOwners.length} owner accounts (these are never changed).`);
console.log(`\nBusinesses to add (${newBiz.length}):`);
newBiz.forEach((b) => console.log(`  + /review/${b.slug}  ${b.name}${b.google_review_url ? '' : '   (no Google review link yet)'}`));
console.log(`\nOwner accounts to add (${newOwners.length}):`);
newOwners.forEach((o) => console.log(`  + ${o.email}  → ${o.business_slug}  [${o.status || (o.active ? 'active' : 'suspended')}]`));

if (!apply) {
  console.log('\nDry run only: nothing was written. Re-run with --apply to copy the items above.');
  process.exit(0);
}
if (newBiz.length) {
  const { error } = await sb.from('businesses').insert(newBiz.map((b) => pick(b, BUSINESS_COLS)));
  if (error) throw new Error('Adding businesses failed (nothing else was changed): ' + error.message);
}
if (newOwners.length) {
  const { error } = await sb.from('business_owners').insert(newOwners.map((o) => pick(o, OWNER_COLS)));
  if (error) throw new Error('Businesses were added, but adding owners failed: ' + error.message);
}
console.log(`\nDone: added ${newBiz.length} businesses and ${newOwners.length} owner accounts.`);
