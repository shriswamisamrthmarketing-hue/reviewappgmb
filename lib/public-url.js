// The PUBLIC address customers use: every QR code, review link, WhatsApp/SMS request and
// password-reset link is built from this, never from the address the admin happens to be using
// (e.g. http://localhost:3000).
//
// PUBLIC_SITE_URL (read at runtime, preferred) or NEXT_PUBLIC_SITE_URL, e.g. https://smart-review-agent.onrender.com
import 'server-only';

const LOCAL = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$|\.local$/i;

export function isPrivateHost(hostname) {
  return LOCAL.test(String(hostname || ''));
}

// → { url: 'https://…' | null, problem: string | null }
export function publicBase() {
  const raw = (process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (!raw) {
    return { url: null, problem: 'PUBLIC_SITE_URL is not set. Add your live address (e.g. https://smart-review-agent.onrender.com) to the environment so QR codes and review links point to the live site.' };
  }
  let u;
  try {
    u = new URL(raw);
  } catch {
    return { url: null, problem: `PUBLIC_SITE_URL "${raw}" is not a valid web address.` };
  }
  if (isPrivateHost(u.hostname))
    return { url: null, problem: `PUBLIC_SITE_URL points to ${u.hostname}, which customers' phones cannot open. Use your live Render address.` };
  if (u.protocol !== 'https:') return { url: null, problem: 'PUBLIC_SITE_URL must start with https://' };
  return { url: u.origin, problem: null };
}

export function publicUrl(path) {
  const { url } = publicBase();
  return url ? url + path : null;
}

// TESTING ONLY: when the dashboard itself is opened on this computer (localhost / LAN), the Wi-Fi address
// of this computer, e.g. http://192.168.1.5:3000, so a phone on the same Wi-Fi can open the local review
// page. Never used for printed QR codes or customer links. Returns null on the live site.
export async function localTestBase(req) {
  try {
    const host = req.headers.get('host') || '';
    const u = new URL('http://' + host);
    if (!isPrivateHost(u.hostname)) return null;
    const os = await import('node:os');
    const ips = Object.values(os.networkInterfaces())
      .flat()
      .filter((i) => i && i.family === 'IPv4' && !i.internal && /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(i.address));
    // Prefer typical home/office Wi-Fi ranges over virtual adapters.
    ips.sort((a, b) => (b.address.startsWith('192.168') ? 1 : 0) - (a.address.startsWith('192.168') ? 1 : 0));
    if (!ips.length) return null;
    return `http://${ips[0].address}${u.port ? ':' + u.port : ''}`;
  } catch {
    return null;
  }
}
