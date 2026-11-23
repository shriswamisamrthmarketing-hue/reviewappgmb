// Optional transactional email through Resend (https://resend.com) – plain HTTPS, no extra package.
// Enabled only when RESEND_API_KEY and MAIL_FROM are set, e.g. MAIL_FROM="Smart Review <no-reply@yourdomain.com>".
import 'server-only';

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendMail({ to, subject, text, html }) {
  if (!mailConfigured()) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text, html }),
    });
    if (!res.ok) console.error('sendMail failed', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (e) {
    console.error('sendMail failed', e);
    return false;
  }
}
