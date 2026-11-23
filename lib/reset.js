// One-time password-reset links for business owners.
// Token = "<ownerId>.<64 random hex>". Only its SHA-256 hash is stored, valid for 1 hour, single use.
import 'server-only';
import crypto from 'node:crypto';
import { getOwnerAuth, updateOwner } from './store';
import { publicBase } from './public-url';

const TTL_MS = 60 * 60 * 1000;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

export async function createResetToken(ownerId) {
  const token = `${ownerId}.${crypto.randomBytes(32).toString('hex')}`;
  await updateOwner(ownerId, { reset_token_hash: sha(token), reset_expires: new Date(Date.now() + TTL_MS).toISOString() });
  return token;
}

// → owner record if the token is valid and unexpired, else null.
export async function checkResetToken(token) {
  const t = String(token || '');
  const m = /^([0-9a-f-]{36})\.([0-9a-f]{64})$/.exec(t);
  if (!m) return null;
  const owner = await getOwnerAuth({ id: m[1] }).catch(() => null);
  if (!owner?.reset_token_hash || !owner.reset_expires) return null;
  const a = Buffer.from(sha(t));
  const b = Buffer.from(String(owner.reset_token_hash));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (new Date(owner.reset_expires).getTime() < Date.now()) return null;
  return owner;
}

// Reset links always use the public (live) address; the request's own origin is used only as a last
// resort when no public address is configured (e.g. a purely local test setup).
export function resetUrl(req, token) {
  const base = publicBase().url || new URL(req.url).origin;
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}
