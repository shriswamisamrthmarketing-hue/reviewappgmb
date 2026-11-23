// Password hashing for business-owner accounts (Node's built-in scrypt, salted).
// Stored format: scrypt$N$r$p$<salt base64>$<hash base64>
import 'server-only';
import crypto from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

function scrypt(password, salt, n, r, p) {
  return new Promise((resolve, reject) =>
    crypto.scrypt(String(password), salt, KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key)
    )
  );
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, N, R, P);
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

// A real hash of a random value: used when the email doesn't exist, so a wrong
// email takes as long as a wrong password (no account enumeration by timing).
let _dummy = null;
async function dummyHash() {
  if (!_dummy) _dummy = await hashPassword(crypto.randomBytes(16).toString('hex'));
  return _dummy;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || (await dummyHash())).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64');
  const key = await scrypt(password, Buffer.from(salt, 'base64'), +n, +r, +p);
  const ok = key.length === expected.length && crypto.timingSafeEqual(key, expected);
  return Boolean(stored) && ok;
}

export function passwordProblem(pw) {
  const s = String(pw || '');
  if (s.length < 8) return 'Password must be at least 8 characters.';
  if (s.length > 128) return 'Password is too long (max 128 characters).';
  if (!/[a-zA-Z]/.test(s) || !/[0-9]/.test(s)) return 'Password must contain letters and numbers.';
  return null;
}
