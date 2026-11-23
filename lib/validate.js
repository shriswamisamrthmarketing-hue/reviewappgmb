// Cleans and validates business settings coming from the admin dashboard.
const LANG_KEYS = ['en', 'mr', 'hi'];

const str = (v, max = 300) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const ml = (v, max = 300) => Object.fromEntries(LANG_KEYS.map((k) => [k, str(v?.[k], max)]));
const slugId = (v, fallback) =>
  (String(v || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)) || fallback;
const color = (v, d) => (/^#[0-9a-fA-F]{6}$/.test(String(v || '').trim()) ? String(v).trim() : d);

export function validateReviewUrl(url) {
  const u = str(url, 500);
  if (!u) return { ok: true, value: '' };
  let parsed;
  try {
    parsed = new URL(u);
  } catch {
    return { ok: false, error: 'The Google Review link is not a valid URL.' };
  }
  if (parsed.protocol !== 'https:') return { ok: false, error: 'The Google Review link must start with https://' };
  if (parsed.hostname === 'business.google.com')
    return {
      ok: false,
      error:
        'That is your Business Profile MANAGEMENT link. Customers cannot use it. Use the public review link from Google (Ask for reviews → Share review form), usually https://g.page/r/…/review',
    };
  const okHost = /(^|\.)(g\.page|google\.[a-z.]+|goo\.gl|maps\.app\.goo\.gl|search\.google\.com)$/.test(parsed.hostname);
  return { ok: true, value: u, warning: okHost ? null : 'This does not look like a Google link – please double-check it.' };
}

/* ---------------- customer-page settings (businesses.settings jsonb) ---------------- */
export const SUGGESTION_COUNTS = [3, 5, 7];
export const PAGE_LANGS = ['en', 'hi', 'mr'];
export const KEYWORD_KINDS = ['primary', 'secondary', 'service', 'product'];
export const MAX_KEYWORDS = 20;

// Instagram: a profile link (instagram.com/<name>) or just the name / @name → canonical https link.
export function validateInstagram(v) {
  const s = str(v, 200);
  if (!s) return { ok: true, value: '' };
  let handle = '';
  if (/^@?[A-Za-z0-9._]{1,30}$/.test(s)) handle = s.replace(/^@/, '');
  else {
    try {
      const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
      if (!/^(www\.|m\.)?instagram\.com$/i.test(u.hostname)) throw new Error();
      const first = u.pathname.split('/').filter(Boolean)[0] || '';
      if (/^[A-Za-z0-9._]{1,30}$/.test(first) && !['p', 'reel', 'reels', 'explore', 'stories', 'accounts'].includes(first.toLowerCase())) handle = first;
    } catch {}
  }
  if (!handle) return { ok: false, error: 'Instagram: enter the profile link (https://www.instagram.com/yourname) or just the profile name.' };
  return { ok: true, value: `https://www.instagram.com/${handle}/` };
}

// WhatsApp: digits with country code (spaces, +, - and brackets are removed). A 10-digit Indian
// mobile number gets 91 added. Stored as digits only; the page links to https://wa.me/<digits>.
export function validateWhatsapp(v) {
  const raw = str(v, 40);
  if (!raw) return { ok: true, value: '' };
  if (!/^[+\d\s()-]+$/.test(raw)) return { ok: false, error: 'WhatsApp: enter only the phone number, e.g. +91 98765 43210.' };
  let d = raw.replace(/\D/g, '').replace(/^00/, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10 && /^[6-9]/.test(d)) d = '91' + d;
  if (d.length < 11 || d.length > 15) return { ok: false, error: 'WhatsApp: enter a full mobile number with country code, e.g. +91 98765 43210.' };
  return { ok: true, value: d };
}

// Verified business facts: up to 8 short, true statements entered by the owner (e.g. "ready-possession
// 2 BHK flats", "Sahakar Nagar, Pune"). Used in review suggestions ONLY as neutral facts about the
// business, never as the customer's experience. No links or phone numbers.
export const MAX_FACTS = 8;
const FACT_LINK = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|in|net|org|co)\b/i;
const FACT_PHONE = /\d[\d\s-]{7,}\d/;
export function validateFacts(list) {
  const errors = [];
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(list) ? list : []) {
    const f = str(raw, 100).replace(/\s+/g, ' ').replace(/[.。]+$/, '');
    if (!f) continue;
    if (FACT_LINK.test(f)) { errors.push(`Verified fact "${f.slice(0, 40)}": please remove the web link.`); continue; }
    if (FACT_PHONE.test(f)) { errors.push(`Verified fact "${f.slice(0, 40)}": please remove the phone number.`); continue; }
    if (seen.has(f.toLowerCase())) continue;
    seen.add(f.toLowerCase());
    out.push(f);
  }
  if (out.length > MAX_FACTS) errors.push(`Maximum ${MAX_FACTS} verified facts per business.`);
  return { errors, value: out.slice(0, MAX_FACTS) };
}

// Always returns a complete, valid settings object (bad stored values are ignored, never shown).
export function cleanSettings(s) {
  const ig = validateInstagram(s?.instagram_url);
  const wa = validateWhatsapp(s?.whatsapp);
  const n = Number(s?.suggestions);
  return {
    instagram_url: ig.ok ? ig.value : '',
    whatsapp: wa.ok ? wa.value : '',
    language: PAGE_LANGS.includes(s?.language) ? s.language : '', // '' = use the phone's language
    suggestions: SUGGESTION_COUNTS.includes(n) ? n : 3,
    topics: s?.topics !== false, // ON by default for every business; only an explicit "Hidden" (false) turns it off
    facts: validateFacts(s?.facts).value,
  };
}
// True when the settings are all defaults (used before the settings column exists in Supabase).
export function isDefaultSettings(s) {
  const c = cleanSettings(s);
  return !c.instagram_url && !c.whatsapp && !c.language && c.suggestions === 3 && c.topics === true && c.facts.length === 0;
}

export function sanitizeBusiness(input, current) {
  const errors = [];
  const out = {
    name: str(input.name, 150) || current.name,
    short_name: str(input.short_name, 80) || str(input.name, 80) || current.short_name,
    category: str(input.category, 150),
    location: str(input.location, 120),
    logo_url: str(input.logo_url, 500),
    primary_color: color(input.primary_color, current.primary_color || '#1F3A5F'),
    accent_color: color(input.accent_color, current.accent_color || '#C9A227'),
    gbp_manage_url: str(input.gbp_manage_url, 500),
    greeting: ml(input.greeting, 400),
  };
  if (out.logo_url && !/^https:\/\//.test(out.logo_url)) errors.push('Logo URL must start with https://');

  const r = validateReviewUrl(input.google_review_url);
  if (!r.ok) errors.push(r.error);
  else out.google_review_url = r.value;

  const qs = Array.isArray(input.questions) ? input.questions.slice(0, 8) : [];
  const usedQ = new Set();
  out.questions = qs.map((q, qi) => {
    let id = slugId(q.id, 'q' + (qi + 1));
    while (usedQ.has(id)) id += '-' + qi;
    usedQ.add(id);
    const usedO = new Set();
    const options = (Array.isArray(q.options) ? q.options : []).slice(0, 12).map((o, oi) => {
      let oid = slugId(o.id || o.label?.en, 'o' + (oi + 1));
      while (usedO.has(oid)) oid += '-' + oi;
      usedO.add(oid);
      return { id: oid, label: ml(o.label, 120) };
    }).filter((o) => o.label.en || o.label.mr || o.label.hi);
    const prompt = ml(q.prompt, 200);
    if (!prompt.en && !prompt.mr && !prompt.hi) errors.push(`Question ${qi + 1} needs question text.`);
    if (options.length < 1) errors.push(`Question ${qi + 1} needs at least one option.`);
    return {
      id,
      type: q.type === 'single' ? 'single' : 'multi',
      showFor: ['all', 'liked', 'improve'].includes(q.showFor) ? q.showFor : 'all',
      optional: Boolean(q.optional),
      prompt,
      summary: ml(q.summary, 80),
      options,
    };
  });
  // SEO keywords (business-wise). Max 20; `when` must reference real question:option ids.
  // kind: primary | secondary | service | product (older keywords without a kind count as primary).
  // Keywords are only ever OFFERED to the customer as optional chips; one is used only if they tap it.
  const validWhen = new Set(out.questions.flatMap((q) => q.options.map((o) => `${q.id}:${o.id}`)));
  const usedK = new Set();
  out.keywords = (Array.isArray(input.keywords) ? input.keywords : [])
    .map((k) => ({ ...k, text: str(k?.text, 80) }))
    .filter((k) => k.text && !usedK.has(k.text.toLowerCase()) && usedK.add(k.text.toLowerCase()))
    .slice(0, MAX_KEYWORDS)
    .map((k, i) => ({
      id: slugId(k.id || k.text, 'k' + (i + 1)),
      text: k.text,
      enabled: k.enabled !== false,
      kind: KEYWORD_KINDS.includes(k.kind) ? k.kind : 'primary',
      when: (Array.isArray(k.when) ? k.when : []).map(String).filter((w) => validWhen.has(w)),
    }));
  if (Array.isArray(input.keywords) && input.keywords.length > MAX_KEYWORDS) errors.push(`Maximum ${MAX_KEYWORDS} keywords per business.`);
  out.seo_keywords = out.keywords.map((k) => k.text).join(', ');

  // Customer-page settings: links are checked here; a wrong link is an error, never saved.
  const s = input.settings && typeof input.settings === 'object' ? input.settings : {};
  const ig = validateInstagram(s.instagram_url);
  const wa = validateWhatsapp(s.whatsapp);
  if (!ig.ok) errors.push(ig.error);
  if (!wa.ok) errors.push(wa.error);
  const facts = validateFacts(s.facts);
  errors.push(...facts.errors);
  out.settings = cleanSettings({ ...s, instagram_url: ig.ok ? ig.value : '', whatsapp: wa.ok ? wa.value : '', facts: facts.value });

  return { errors, value: out, warning: r.ok ? r.warning : null };
}

// New business from the admin dashboard → { errors, value: {slug, name, short_name, category, location, google_review_url} }
export function sanitizeNewBusiness(input) {
  const errors = [];
  const name = str(input?.name, 150);
  const short_name = str(input?.short_name, 80) || name.split('|')[0].trim().slice(0, 80);
  const slug = String(input?.slug || short_name || name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  if (!name) errors.push('Business name is required.');
  if (slug.length < 2) errors.push('Choose a QR link name with at least 2 letters or numbers (e.g. "cafe-baner").');
  const r = validateReviewUrl(input?.google_review_url);
  if (!r.ok) errors.push(r.error);
  return {
    errors,
    warning: r.ok ? r.warning : null,
    value: { slug, name, short_name, category: str(input?.category, 150), location: str(input?.location, 120), google_review_url: r.ok ? r.value : '' },
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function cleanEmail(v) {
  const e = String(v || '').trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}
// Usernames: 3–40 chars, lower-case letters, numbers, dot, dash, underscore. "admin" is reserved.
export function cleanUsername(v) {
  const u = String(v || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(u) || u === 'admin' || u === 'administrator') return null;
  return u;
}
export function cleanName(v) {
  return str(v, 80);
}

// What the public chat page is allowed to see (no management URL, no keywords list).
// Instagram/WhatsApp are re-checked here, so only valid links ever reach the customer page.
export function publicBusiness(b) {
  const s = cleanSettings(b.settings);
  return {
    slug: b.slug, name: b.name, short_name: b.short_name, category: b.category, location: b.location,
    logo_url: b.logo_url, primary_color: b.primary_color, accent_color: b.accent_color,
    google_review_url: b.google_review_url, greeting: b.greeting, questions: b.questions, // checked when saved
    settings: { language: s.language, suggestions: s.suggestions, topics: s.topics },
    instagram_url: s.instagram_url,
    whatsapp_url: s.whatsapp ? `https://wa.me/${s.whatsapp}` : '',
  };
}
