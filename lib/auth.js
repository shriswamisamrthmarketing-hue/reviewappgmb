// Two separate logins:
//  • Super admin – single password from ADMIN_PASSWORD, cookie "sra_admin".
//  • Business owners – email + password accounts created by the admin, cookie "sra_owner".
// Sessions are signed, expiring cookies (httpOnly, SameSite=Lax, Secure in production).
import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getOwnerAuth, getBusinessCached, publicOwner } from './store';

export const COOKIE = 'sra_admin';
const MAX_AGE = 7 * 24 * 3600; // 7 days

// Signing key for admin and owner sessions.
// Uses SESSION_SECRET when it is a proper value (16+ characters after trimming spaces/new lines).
// Otherwise it derives a strong key from the server-only secrets the site already needs
// (ADMIN_PASSWORD, and SUPABASE_SERVICE_ROLE_KEY when present), so owner login keeps working even if
// SESSION_SECRET is missing, too short or not delivered to the running app. Never sent to the browser.
function secret() {
  const s = String(process.env.SESSION_SECRET || '').trim();
  if (s.length >= 16) return s;
  const admin = process.env.ADMIN_PASSWORD || '';
  if (!admin) return '';
  return 'sra2:' + crypto.createHash('sha256').update('owner-session|' + admin + '|' + (process.env.SUPABASE_SERVICE_ROLE_KEY || '')).digest('hex');
}
function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function checkPassword(input) {
  const real = process.env.ADMIN_PASSWORD || '';
  if (!real) return false;
  const a = crypto.createHash('sha256').update(String(input || '')).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

export function createToken() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = 'admin.' + exp;
  return payload + '.' + sign(payload);
}

export function verifyToken(token) {
  if (!token || !adminConfigured()) return false;
  const parts = String(token).split('.');
  if (parts.length !== 3) return false;
  const payload = parts[0] + '.' + parts[1];
  const expected = sign(payload);
  if (expected.length !== parts[2].length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts[2]))) return false;
  return Number(parts[1]) > Date.now() / 1000;
}

export async function isAdmin() {
  const store = await cookies();
  return verifyToken(store.get(COOKIE)?.value);
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE,
};

/* ------------------------------------------------------------------------- */
/* Business-owner sessions (separate cookie, separate token format).          */
/* Token: o.<ownerId>.<sessionVersion>.<exp>.<sig>                            */
/* Every request re-checks the account in the database, so deactivating an    */
/* owner or resetting their password signs them out immediately.              */
/* ------------------------------------------------------------------------- */
export const OWNER_COOKIE = 'sra_owner';

export function ownerAuthConfigured() {
  return secret().length >= 16;
}

export function createOwnerToken(owner) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `o.${owner.id}.${Number(owner.session_version) || 1}.${exp}`;
  return payload + '.' + sign('owner|' + payload);
}

function parseOwnerToken(token) {
  if (!token || !ownerAuthConfigured()) return null;
  const parts = String(token).split('.');
  if (parts.length !== 5 || parts[0] !== 'o') return null;
  const payload = parts.slice(0, 4).join('.');
  const expected = sign('owner|' + payload);
  if (expected.length !== parts[4].length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts[4]))) return null;
  if (!(Number(parts[3]) > Date.now() / 1000)) return null;
  return { id: parts[1], version: Number(parts[2]) };
}

// → { owner, slug } for a valid, active owner whose business still exists; otherwise null.
export async function getOwnerSession() {
  const store = await cookies();
  const t = parseOwnerToken(store.get(OWNER_COOKIE)?.value);
  if (!t) return null;
  const o = await getOwnerAuth({ id: t.id }).catch(() => null);
  if (!o || !o.active || (Number(o.session_version) || 1) !== t.version) return null;
  const business = await getBusinessCached(o.business_slug).catch(() => null);
  if (!business) return null;
  // `business` is returned so callers do not need to load it a second time.
  return { owner: publicOwner(o), slug: o.business_slug, sessionVersion: Number(o.session_version) || 1, business };
}

// Rejects requests sent from other websites (CSRF protection for cookie-authenticated changes).
export function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser clients; they still need a valid session cookie
  try {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Who may open a business dashboard: the admin (any business, via ?b=slug) or the
// signed-in owner (only their own business; any ?b= value from an owner is refused).
export async function resolveDashboardAccess(requestedSlug) {
  if (requestedSlug) {
    if (!(await isAdmin())) return null;
    const business = await getBusinessCached(requestedSlug);
    return business ? { role: 'admin', slug: requestedSlug, owner: null, business } : null;
  }
  const s = await getOwnerSession();
  return s ? { role: 'owner', slug: s.slug, owner: s.owner, business: s.business } : null;
}

// The administrator signs in with "admin" (or "administrator") or, if ADMIN_EMAIL is set, with that email.
export function adminEmail() {
  return String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
}
export function isAdminIdentifier(id) {
  const v = String(id || '').trim().toLowerCase();
  return v === 'admin' || v === 'administrator' || (!!adminEmail() && v === adminEmail());
}
