// Storage layer.
//  • If SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set → Supabase (production).
//  • Otherwise → a local JSON file (for local testing only; not persistent on Vercel/Render).
import 'server-only';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SEED_BUSINESSES, SLUGS, getSeed } from './seed';
import { isDefaultSettings } from './validate';
import PREVIEW_BUSINESSES from './preview-businesses.json';

// 'request' = a review request sent by WhatsApp or SMS from a dashboard (source = 'wa' | 'sms').
const EVENT_TYPES = ['visit', 'draft', 'regenerate', 'copy', 'google_open', 'request'];
const FIELDS = [
  'slug', 'name', 'short_name', 'category', 'location', 'logo_url', 'primary_color',
  'accent_color', 'google_review_url', 'gbp_manage_url', 'seo_keywords', 'keywords', 'greeting', 'questions',
  'settings', // customer-page settings (Instagram, WhatsApp, language, suggestions, topics) – jsonb, may be missing
];
const OWNER_TABLE = 'business_owners';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function isValidSlug(s) {
  return typeof s === 'string' && s.length >= 2 && s.length <= 40 && SLUG_RE.test(s);
}

let _sb = null;
function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_sb) _sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _sb;
}

export function storageMode() {
  return supabase() ? 'supabase' : 'local';
}

function pick(row) {
  const out = {};
  for (const f of FIELDS) out[f] = row[f] ?? (f === 'greeting' || f === 'settings' ? {} : f === 'questions' || f === 'keywords' ? [] : '');
  if (!out.settings || typeof out.settings !== 'object' || Array.isArray(out.settings)) out.settings = {};
  // Older rows (before keyword management) only have the comma-separated seo_keywords text.
  if (!Array.isArray(out.keywords) || (!out.keywords.length && out.seo_keywords)) {
    out.keywords = String(out.seo_keywords || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text, i) => ({ id: 'k' + (i + 1), text, enabled: true, when: [] }));
  }
  out.updated_at = row.updated_at || null;
  out.created_at = row.created_at || null;
  return out;
}

// The four original businesses first (in their usual order), then the rest by creation date.
const order = (b) => (SLUGS.includes(b.slug) ? SLUGS.indexOf(b.slug) : 1000);
const byOrder = (a, b) => order(a) - order(b) || String(a.created_at || '').localeCompare(String(b.created_at || '')) || a.slug.localeCompare(b.slug);

/* ---------------------------- local JSON file ---------------------------- */
const LOCAL_FILE = process.env.LOCAL_DATA_FILE || path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'local-db.json');

function readLocal() {
  let db = globalThis.__sraMemDb || { businesses: [], events: [], owners: [] };
  try {
    db = JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'));
  } catch {}
  db.owners ||= [];
  db.events ||= [];
  db.businesses ||= [];
  db.feedback ||= [];
  db.replies ||= [];
  // Seed the original businesses once. After that the admin may add or delete businesses freely.
  if (!db.seeded) {
    const now = new Date().toISOString();
    for (const seed of SEED_BUSINESSES) {
      if (!db.businesses.find((b) => b.slug === seed.slug)) db.businesses.push({ ...getSeed(seed.slug), created_at: now, updated_at: now });
    }
    db.seeded = true;
    writeLocal(db);
  }
  // Vercel PREVIEW builds only (no Supabase there): also load copies of businesses added after launch,
  // so new clients can be tested before a change goes live. Never runs in production (Supabase) or
  // locally, and never writes to the real database.
  if (process.env.VERCEL_ENV === 'preview' && !db.previewLoaded) {
    const now = new Date().toISOString();
    for (const b of PREVIEW_BUSINESSES) {
      if (!db.businesses.find((x) => x.slug === b.slug)) db.businesses.push({ ...b, created_at: now, updated_at: now });
    }
    db.previewLoaded = true;
    writeLocal(db);
  }
  return db;
}
function writeLocal(db) {
  if (db.events.length > 50000) db.events = db.events.slice(-50000);
  if (db.feedback?.length > 20000) db.feedback = db.feedback.slice(-20000);
  globalThis.__sraMemDb = db; // read-only hosts (e.g. Vercel) keep data in memory only
  try {
    fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(db, null, 2));
  } catch {}
}

/* ------------------------------ Supabase ------------------------------ */
let _seeded = false;
async function ensureSeeded(sb) {
  if (_seeded) return;
  const { count, error } = await sb.from('businesses').select('slug', { count: 'exact', head: true });
  if (error) throw new Error('Supabase error: ' + error.message + ' (did you run supabase/schema.sql?)');
  // Only an empty database gets the original businesses, so deleted businesses stay deleted.
  if (!count) {
    const { error: e2 } = await sb.from('businesses').upsert(SEED_BUSINESSES, { onConflict: 'slug', ignoreDuplicates: true });
    if (e2) throw new Error('Supabase seed error: ' + e2.message);
  }
  _seeded = true;
}

/* ------------------------------ businesses ------------------------------ */
export async function listBusinesses() {
  const sb = supabase();
  if (!sb) return readLocal().businesses.map(pick).sort(byOrder);
  await ensureSeeded(sb);
  const { data, error } = await sb.from('businesses').select('*');
  if (error) throw new Error(error.message);
  return data.map(pick).sort(byOrder);
}

export async function getBusiness(slug) {
  if (!isValidSlug(slug)) return null;
  const sb = supabase();
  if (!sb) {
    const b = readLocal().businesses.find((x) => x.slug === slug);
    return b ? pick(b) : null;
  }
  await ensureSeeded(sb);
  const { data, error } = await sb.from('businesses').select('*').eq('slug', slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? pick(data) : null;
}

// Same as getBusiness, but shared within ONE page render (e.g. generateMetadata + the page itself),
// so the database is asked once instead of several times. Each new request reads fresh data.
// Only memoizes during React server rendering; in API routes it simply calls getBusiness.
export const getBusinessCached = cache(getBusiness);

export async function createBusiness(values) {
  if (!isValidSlug(values.slug)) throw new Error('Invalid link name.');
  const now = new Date().toISOString();
  const row = { created_at: now, updated_at: now };
  for (const f of FIELDS) if (values[f] !== undefined) row[f] = values[f];
  const sb = supabase();
  if (!sb) {
    const db = readLocal();
    if (db.businesses.find((b) => b.slug === row.slug)) throw new Error('DUPLICATE');
    db.businesses.push(row);
    writeLocal(db);
    return pick(row);
  }
  await ensureSeeded(sb);
  const { data, error } = await sb.from('businesses').insert(row).select('*').single();
  if (error) throw new Error(error.code === '23505' ? 'DUPLICATE' : error.message);
  return pick(data);
}

export async function updateBusiness(slug, values) {
  if (!isValidSlug(slug)) throw new Error('Unknown business');
  const patch = {};
  for (const f of FIELDS) if (f !== 'slug' && values[f] !== undefined) patch[f] = values[f];
  patch.updated_at = new Date().toISOString();
  const sb = supabase();
  if (!sb) {
    const db = readLocal();
    const i = db.businesses.findIndex((b) => b.slug === slug);
    if (i < 0) throw new Error('Unknown business');
    db.businesses[i] = { ...db.businesses[i], ...patch };
    writeLocal(db);
    return pick(db.businesses[i]);
  }
  await ensureSeeded(sb);
  let { data, error } = await sb.from('businesses').update(patch).eq('slug', slug).select('*').single();
  // The `settings` column is added by supabase/add-business-settings.sql. Until that has been run,
  // saving still works for everything else; only NEW customer-page settings cannot be stored yet.
  if (error && 'settings' in patch && isMissingSettingsColumn(error)) {
    if (!isDefaultSettings(patch.settings)) throw new Error(SETTINGS_COLUMN_MISSING);
    const { settings, ...rest } = patch;
    ({ data, error } = await sb.from('businesses').update(rest).eq('slug', slug).select('*').single());
  }
  if (error) throw new Error(error.message);
  return pick(data);
}

const SETTINGS_COLUMN_MISSING =
  'Instagram, WhatsApp, language, suggestion and topic settings cannot be saved yet: the database needs one new column. ' +
  'Ask the administrator to run supabase/add-business-settings.sql in Supabase. Nothing was changed.';
function isMissingSettingsColumn(error) {
  return (error.code === 'PGRST204' || error.code === '42703') && /settings/i.test(error.message || '');
}

// Deletes the business, its statistics and its owner accounts.
export async function deleteBusiness(slug) {
  if (!isValidSlug(slug)) throw new Error('Unknown business');
  const sb = supabase();
  if (!sb) {
    const db = readLocal();
    db.businesses = db.businesses.filter((b) => b.slug !== slug);
    db.events = db.events.filter((e) => e.business_slug !== slug);
    db.owners = db.owners.filter((o) => o.business_slug !== slug);
    db.feedback = db.feedback.filter((x) => x.business_slug !== slug);
    db.replies = db.replies.filter((x) => x.business_slug !== slug);
    writeLocal(db);
    return;
  }
  const { error } = await sb.from('businesses').delete().eq('slug', slug); // events, owners, feedback, replies cascade
  if (error) throw new Error(error.message);
}

/* ------------------------------ owner accounts ------------------------------ */
// status: 'pending' (signed up, waiting for admin approval) | 'active' | 'rejected' (registration declined) | 'suspended'.
// `active` is kept in sync (true only when status is 'active').
// source: 'admin' (created by the administrator) | 'signup' (registered themselves).
const OWNER_PUBLIC = ['id', 'email', 'username', 'name', 'business_slug', 'active', 'status', 'source', 'phone', 'created_at', 'last_login_at'];
export const OWNER_STATUSES = ['pending', 'active', 'rejected', 'suspended'];
export const ownerStatus = (o) => (OWNER_STATUSES.includes(o?.status) ? o.status : o?.active ? 'active' : 'suspended');
export function publicOwner(o) {
  if (!o) return null;
  const out = Object.fromEntries(OWNER_PUBLIC.map((k) => [k, o[k] ?? null]));
  out.status = ownerStatus(o);
  out.active = out.status === 'active';
  out.source = o.source || 'admin';
  return out;
}
const normEmail = (e) => String(e || '').trim().toLowerCase();
const normUser = (u) => String(u || '').trim().toLowerCase();

export async function listOwners() {
  const sb = supabase();
  if (!sb) return readLocal().owners.map(publicOwner).sort((a, b) => a.email.localeCompare(b.email));
  const { data, error } = await sb.from(OWNER_TABLE).select(OWNER_PUBLIC.join(',')).order('email');
  if (error) throw new Error(error.message + ' (did you run the latest supabase/schema.sql?)');
  return data.map(publicOwner);
}

// Internal: includes password hash and session version. Never send to the browser.
export async function getOwnerAuth({ id, email, username }) {
  const sb = supabase();
  if (!sb) {
    const db = readLocal();
    return db.owners.find((o) => (id ? o.id === id : username ? o.username === normUser(username) : o.email === normEmail(email))) || null;
  }
  let q = sb.from(OWNER_TABLE).select('*');
  q = id ? q.eq('id', id) : username ? q.eq('username', normUser(username)) : q.eq('email', normEmail(email));
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

export async function createOwner({ email, username, name, phone, business_slug, password_hash, status = 'active', source = 'admin' }) {
  const st = OWNER_STATUSES.includes(status) ? status : 'active';
  const row = {
    id: crypto.randomUUID(),
    email: normEmail(email),
    username: username ? normUser(username) : null,
    name: String(name || '').trim(),
    phone: phone ? String(phone).trim().slice(0, 20) : null,
    business_slug,
    password_hash,
    status: st,
    source: source === 'signup' ? 'signup' : 'admin',
    active: st === 'active',
    session_version: 1,
    created_at: new Date().toISOString(),
    last_login_at: null,
  };
  const sb = supabase();
  if (!sb) {
    const db = readLocal();
    if (db.owners.find((o) => o.email === row.email || (row.username && o.username === row.username))) throw new Error('DUPLICATE');
    db.owners.push(row);
    writeLocal(db);
    return publicOwner(row);
  }
  const { data, error } = await sb.from(OWNER_TABLE).insert(row).select('*').single();
  if (error) throw new Error(error.code === '23505' ? 'DUPLICATE' : error.message);
  return publicOwner(data);
}

// patch may contain: email, username, name, business_slug, status (or active), password_hash,
// session_version, last_login_at, reset_token_hash, reset_expires
export async function updateOwner(id, patch) {
  const p = { ...patch };
  if (p.status !== undefined) p.active = p.status === 'active';
  else if (p.active !== undefined) p.status = p.active ? 'active' : 'suspended';
  if (p.email !== undefined) p.email = normEmail(p.email);
  if (p.username !== undefined) p.username = p.username ? normUser(p.username) : null;
  const sb = supabase();
  if (!sb) {
    const db = readLocal();
    const i = db.owners.findIndex((o) => o.id === id);
    if (i < 0) throw new Error('NOT_FOUND');
    if (db.owners.some((o, j) => j !== i && ((p.email && o.email === p.email) || (p.username && o.username === p.username)))) throw new Error('DUPLICATE');
    db.owners[i] = { ...db.owners[i], ...p };
    writeLocal(db);
    return publicOwner(db.owners[i]);
  }
  const { data, error } = await sb.from(OWNER_TABLE).update(p).eq('id', id).select('*').maybeSingle();
  if (error) throw new Error(error.code === '23505' ? 'DUPLICATE' : error.message);
  if (!data) throw new Error('NOT_FOUND');
  return publicOwner(data);
}

export async function deleteOwner(id) {
  const sb = supabase();
  if (!sb) {
    const db = readLocal();
    db.owners = db.owners.filter((o) => o.id !== id);
    writeLocal(db);
    return;
  }
  const { error } = await sb.from(OWNER_TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ------------------------------ customer feedback ------------------------------ */
// One record per customer who reached the drafts step: stars, chosen highlights, their own words and
// the final review text they kept. No name, phone, email or other personal data is collected.
// stars / rating: the customer may change their rating on the suggestions screen (existing columns).
// details: the customer may add / change their own words on the review page (existing column).
const FEEDBACK_UPDATABLE = ['review_text', 'copied', 'google_clicked', 'written_manually', 'language', 'style', 'stars', 'rating', 'details'];

export async function createFeedback(row) {
  const now = new Date().toISOString();
  const rec = {
    id: crypto.randomUUID(),
    business_slug: row.business_slug,
    stars: row.stars,
    rating: row.rating,
    highlights: row.highlights || [],
    details: row.details || null,
    language: row.language || null,
    style: row.style || null,
    source: row.source || null,
    drafts_source: row.drafts_source || null,
    campaign: row.campaign || null,
    review_text: null,
    copied: false,
    google_clicked: false,
    written_manually: false,
    created_at: now,
    updated_at: now,
  };
  const sb = supabase();
  if (!sb) {
    const db = readLocal();
    db.feedback.push(rec);
    writeLocal(db);
    return rec;
  }
  const { data, error } = await sb.from('feedback').insert(rec).select('*').single();
  if (error) throw new Error(error.message + ' (did you run the latest supabase/schema.sql?)');
  return data;
}

export async function getFeedback(id) {
  const sb = supabase();
  if (!sb) return readLocal().feedback.find((x) => x.id === id) || null;
  const { data, error } = await sb.from('feedback').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

export async function updateFeedback(id, patch) {
  const p = { updated_at: new Date().toISOString() };
  for (const k of FEEDBACK_UPDATABLE) if (patch[k] !== undefined) p[k] = patch[k];
  const sb = supabase();
  if (!sb) {
    const db = readLocal();
    const i = db.feedback.findIndex((x) => x.id === id);
    if (i < 0) throw new Error('NOT_FOUND');
    db.feedback[i] = { ...db.feedback[i], ...p };
    writeLocal(db);
    return db.feedback[i];
  }
  const { data, error } = await sb.from('feedback').update(p).eq('id', id).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('NOT_FOUND');
  return data;
}

// Newest first. slug = one business (owner dashboards) or null (admin: all businesses).
export async function listFeedback(slug, { limit = 200, stars = null } = {}) {
  const sb = supabase();
  if (!sb) {
    const rows = readLocal().feedback.filter((x) => (!slug || x.business_slug === slug) && (!stars || x.stars === stars));
    return rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, limit);
  }
  let q = sb.from('feedback').select('*').order('created_at', { ascending: false }).limit(limit);
  if (slug) q = q.eq('business_slug', slug);
  if (stars) q = q.eq('stars', stars);
  const { data, error } = await q;
  if (error) throw new Error(error.message + ' (did you run the latest supabase/schema.sql?)');
  return data || [];
}

// { count, average, dist: {1..5}, google_clicked, copied, with_text }
export async function feedbackSummary(slug) {
  let rows, textCount;
  const sb = supabase();
  if (!sb) {
    rows = readLocal().feedback.filter((x) => !slug || x.business_slug === slug);
    textCount = rows.filter((r) => r.review_text).length;
  } else {
    // Only the small columns are downloaded. "With text" is counted by the database instead of
    // downloading every review text (same rule as before: review_text present and not empty).
    let q = sb.from('feedback').select('stars, google_clicked, copied').limit(50000);
    let t = sb.from('feedback').select('id', { count: 'exact', head: true }).not('review_text', 'is', null).neq('review_text', '');
    if (slug) {
      q = q.eq('business_slug', slug);
      t = t.eq('business_slug', slug);
    }
    const [{ data, error }, withText] = await Promise.all([q, t]);
    if (error) return { count: 0, average: 0, dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, google_clicked: 0, copied: 0, with_text: 0, error: error.message };
    rows = data || [];
    textCount = withText.error ? 0 : withText.count || 0;
  }
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of rows) {
    if (dist[r.stars] !== undefined) dist[r.stars]++;
    sum += Number(r.stars) || 0;
  }
  return {
    count: rows.length,
    average: rows.length ? Math.round((sum / rows.length) * 10) / 10 : 0,
    dist,
    google_clicked: rows.filter((r) => r.google_clicked).length,
    copied: rows.filter((r) => r.copied).length,
    with_text: textCount,
  };
}

/* ------------------------------ owner review replies ------------------------------ */
// status: 'draft' (AI/owner draft) → 'approved' (owner approved; may be copied to Google) → 'posted'.
const REPLY_FIELDS = ['reviewer', 'stars', 'review_text', 'reply_text', 'language', 'status', 'approved_at', 'approved_by', 'posted_at', 'source'];

export async function listReplies(slug) {
  const sb = supabase();
  if (!sb) return readLocal().replies.filter((r) => r.business_slug === slug).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const { data, error } = await sb.from('review_replies').select('*').eq('business_slug', slug).order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(error.message + ' (did you run the latest supabase/schema.sql?)');
  return data || [];
}

export async function createReply(slug, values) {
  const now = new Date().toISOString();
  const rec = { id: crypto.randomUUID(), business_slug: slug, status: 'draft', created_at: now, updated_at: now };
  for (const k of REPLY_FIELDS) if (values[k] !== undefined) rec[k] = values[k];
  const sb = supabase();
  if (!sb) {
    const db = readLocal();
    db.replies.push(rec);
    writeLocal(db);
    return rec;
  }
  const { data, error } = await sb.from('review_replies').insert(rec).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

// Only ever touches a reply that belongs to `slug`.
export async function updateReply(slug, id, values) {
  const p = { updated_at: new Date().toISOString() };
  for (const k of REPLY_FIELDS) if (values[k] !== undefined) p[k] = values[k];
  const sb = supabase();
  if (!sb) {
    const db = readLocal();
    const i = db.replies.findIndex((r) => r.id === id && r.business_slug === slug);
    if (i < 0) throw new Error('NOT_FOUND');
    db.replies[i] = { ...db.replies[i], ...p };
    writeLocal(db);
    return db.replies[i];
  }
  const { data, error } = await sb.from('review_replies').update(p).eq('id', id).eq('business_slug', slug).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('NOT_FOUND');
  return data;
}

export async function deleteReply(slug, id) {
  const sb = supabase();
  if (!sb) {
    const db = readLocal();
    db.replies = db.replies.filter((r) => !(r.id === id && r.business_slug === slug));
    writeLocal(db);
    return;
  }
  const { error } = await sb.from('review_replies').delete().eq('id', id).eq('business_slug', slug);
  if (error) throw new Error(error.message);
}

/* ------------------------------ events & stats ------------------------------ */
// Campaign tag from a campaign QR (?c=diwali-2026): lower-case letters, numbers and dashes only.
export function cleanCampaign(v) {
  const c = String(v || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return c || null;
}

export async function recordEvent({ slug, type, rating = null, language = null, source = null, keyword = null, campaign = null }) {
  if (!isValidSlug(slug) || !EVENT_TYPES.includes(type)) return;
  const row = {
    business_slug: slug,
    type,
    rating: rating ? String(rating).slice(0, 20) : null,
    language: language ? String(language).slice(0, 5) : null,
    source: source ? String(source).slice(0, 20) : null,
    keyword: keyword ? String(keyword).slice(0, 100) : null,
    campaign: cleanCampaign(campaign),
    created_at: new Date().toISOString(),
  };
  try {
    const sb = supabase();
    if (!sb) {
      const db = readLocal();
      if (!db.businesses.some((b) => b.slug === slug)) return;
      db.events.push(row);
      writeLocal(db);
      return;
    }
    await sb.from('review_events').insert(row); // unknown slugs are rejected by the foreign key
  } catch (e) {
    console.error('recordEvent failed', e);
  }
}

function emptyStats() {
  return {
    visits: 0, qr_scans: 0, drafts: 0, ai_drafts: 0, regenerations: 0, copies: 0, google_opens: 0,
    requests: 0, request_visits: 0, // review requests sent (WhatsApp/SMS) and visits that came from them
    visits_7d: 0, drafts_7d: 0,
    ratings: { excellent: 0, good: 0, average: 0, not_satisfied: 0 },
    languages: { en: 0, mr: 0, hi: 0 },
    keywords: {}, // keyword text → number of drafts that used it
  };
}

// Stats for every business, or only for `onlySlug` (business-owner dashboards).
// `businesses` (optional): a business list the caller already loaded, so it is not read twice.
export async function getStats(onlySlug, businesses = null) {
  const slugs = onlySlug ? [onlySlug] : (businesses || (await listBusinesses())).map((b) => b.slug);
  const out = Object.fromEntries(slugs.map((s) => [s, emptyStats()]));
  const sb = supabase();
  if (!sb) {
    const since = Date.now() - 7 * 864e5;
    for (const e of readLocal().events) {
      const s = out[e.business_slug];
      if (!s) continue;
      const recent = new Date(e.created_at).getTime() >= since;
      if (e.type === 'visit') {
        s.visits++;
        if (e.source === 'qr' || e.source === 'nfc') s.qr_scans++; // QR scans + NFC taps
        if (e.source === 'wa' || e.source === 'sms') s.request_visits++;
        if (recent) s.visits_7d++;
      } else if (e.type === 'draft') {
        s.drafts++;
        if (e.source === 'ai') s.ai_drafts++;
        if (recent) s.drafts_7d++;
        if (e.rating in s.ratings) s.ratings[e.rating]++;
        if (e.language in s.languages) s.languages[e.language]++;
      } else if (e.type === 'regenerate') s.regenerations++;
      if ((e.type === 'draft' || e.type === 'regenerate') && e.keyword) s.keywords[e.keyword] = (s.keywords[e.keyword] || 0) + 1;
      else if (e.type === 'copy') s.copies++;
      else if (e.type === 'google_open') s.google_opens++;
      else if (e.type === 'request') s.requests++;
    }
    return out;
  }
  const [{ data, error }, kw] = await Promise.all([
    sb.from('business_stats').select('*').in('business_slug', slugs),
    sb.from('keyword_stats').select('*').in('business_slug', slugs),
  ]);
  if (error) throw new Error(error.message);
  for (const r of kw.data || []) if (out[r.business_slug]) out[r.business_slug].keywords[r.keyword] = +r.uses;
  for (const r of data || []) {
    const s = out[r.business_slug];
    if (!s) continue;
    Object.assign(s, {
      visits: +r.visits, qr_scans: +r.qr_scans, drafts: +r.drafts, ai_drafts: +r.ai_drafts,
      regenerations: +r.regenerations, copies: +r.copies, google_opens: +r.google_opens,
      visits_7d: +r.visits_7d, drafts_7d: +r.drafts_7d,
      requests: +r.requests || 0, request_visits: +r.request_visits || 0,
      ratings: { excellent: +r.r_excellent, good: +r.r_good, average: +r.r_average, not_satisfied: +r.r_not_satisfied },
      languages: { en: +r.l_en, mr: +r.l_mr, hi: +r.l_hi },
    });
  }
  return out;
}

// Day-by-day counts (India time) for the last `days` days: [{ date, visits, drafts, google_opens }]
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });
export async function getDailySeries(slug, days = 14) {
  const series = [];
  const index = {};
  for (let i = days - 1; i >= 0; i--) {
    const date = dayKey.format(new Date(Date.now() - i * 864e5));
    index[date] = series.length;
    series.push({ date, visits: 0, drafts: 0, google_opens: 0 });
  }
  const since = new Date(Date.now() - days * 864e5).toISOString();
  let rows;
  const sb = supabase();
  if (!sb) {
    rows = readLocal().events.filter((e) => e.business_slug === slug && e.created_at >= since);
  } else {
    const { data, error } = await sb
      .from('review_events')
      .select('type, created_at')
      .eq('business_slug', slug)
      .in('type', ['visit', 'draft', 'google_open'])
      .gte('created_at', since)
      .limit(20000);
    if (error) throw new Error(error.message);
    rows = data || [];
  }
  for (const e of rows) {
    const i = index[dayKey.format(new Date(e.created_at))];
    if (i === undefined) continue;
    if (e.type === 'visit') series[i].visits++;
    else if (e.type === 'draft') series[i].drafts++;
    else if (e.type === 'google_open') series[i].google_opens++;
  }
  return series;
}

// Month-by-month report (India time), newest first, for the last `months` months:
// [{ month: '2026-11', visits, scans, drafts, link_clicks, feedback, avg_stars, requests }]
// link_clicks = customers who tapped the Google review button (NOT confirmed posted reviews).
const monthKey = (iso) => dayKey.format(new Date(iso)).slice(0, 7);
export async function getMonthlyReport(slug, months = 12) {
  const since = new Date(Date.now() - months * 31 * 864e5).toISOString();
  let events, fbs;
  const sb = supabase();
  if (!sb) {
    const db = readLocal();
    events = db.events.filter((e) => e.business_slug === slug && e.created_at >= since);
    fbs = db.feedback.filter((x) => x.business_slug === slug && x.created_at >= since);
  } else {
    const [ev, fb] = await Promise.all([
      // Only the event types this report counts (regenerate / copy rows were downloaded and ignored).
      sb.from('review_events').select('type, source, created_at').eq('business_slug', slug).in('type', ['visit', 'draft', 'google_open', 'request']).gte('created_at', since).limit(50000),
      sb.from('feedback').select('stars, created_at').eq('business_slug', slug).gte('created_at', since).limit(50000),
    ]);
    if (ev.error) throw new Error(ev.error.message);
    events = ev.data || [];
    fbs = fb.error ? [] : fb.data || [];
  }
  const out = {};
  const row = (m) => (out[m] ||= { month: m, visits: 0, scans: 0, drafts: 0, link_clicks: 0, requests: 0, feedback: 0, star_sum: 0 });
  for (const e of events) {
    const r = row(monthKey(e.created_at));
    if (e.type === 'visit') {
      r.visits++;
      if (e.source === 'qr' || e.source === 'nfc') r.scans++;
    } else if (e.type === 'draft') r.drafts++;
    else if (e.type === 'google_open') r.link_clicks++;
    else if (e.type === 'request') r.requests++;
  }
  for (const x of fbs) {
    const r = row(monthKey(x.created_at));
    r.feedback++;
    r.star_sum += Number(x.stars) || 0;
  }
  return Object.values(out)
    .map(({ star_sum, ...r }) => ({ ...r, avg_stars: r.feedback ? Math.round((star_sum / r.feedback) * 10) / 10 : null }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

// Per-campaign counts: { [campaign]: { visits, link_clicks, feedback } }
export async function getCampaignStats(slug) {
  let events, fbs;
  const sb = supabase();
  if (!sb) {
    const db = readLocal();
    events = db.events.filter((e) => e.business_slug === slug && e.campaign);
    fbs = db.feedback.filter((x) => x.business_slug === slug && x.campaign);
  } else {
    const [ev, fb] = await Promise.all([
      // Only the event types counted below (visits and Google-button clicks).
      sb.from('review_events').select('type, campaign').eq('business_slug', slug).in('type', ['visit', 'google_open']).not('campaign', 'is', null).limit(50000),
      sb.from('feedback').select('campaign').eq('business_slug', slug).not('campaign', 'is', null).limit(50000),
    ]);
    events = ev.error ? [] : ev.data || [];
    fbs = fb.error ? [] : fb.data || [];
  }
  const out = {};
  const row = (c) => (out[c] ||= { visits: 0, link_clicks: 0, feedback: 0 });
  for (const e of events) {
    if (e.type === 'visit') row(e.campaign).visits++;
    else if (e.type === 'google_open') row(e.campaign).link_clicks++;
  }
  for (const x of fbs) row(x.campaign).feedback++;
  return out;
}
