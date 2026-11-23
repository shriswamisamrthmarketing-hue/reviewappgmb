// Signed token so a customer's browser can update only ITS OWN feedback record (no login needed).
import 'server-only';
import crypto from 'node:crypto';

const secret = () => 'fb|' + (process.env.SESSION_SECRET || 'sra:' + (process.env.ADMIN_PASSWORD || ''));

export function feedbackToken(id) {
  return crypto.createHmac('sha256', secret()).update(String(id)).digest('hex').slice(0, 40);
}

export function checkFeedbackToken(id, token) {
  const a = Buffer.from(feedbackToken(id));
  const b = Buffer.from(String(token || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
