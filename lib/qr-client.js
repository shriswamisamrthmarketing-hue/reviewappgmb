'use client';
// Browser-side QR helpers: plain QR PNG, SVG, and a printable poster PNG.
import QRCode from 'qrcode';
import { inkFor } from './brand';

// Customer-facing links must use the PUBLIC (live) address that the server reports
// (PUBLIC_SITE_URL), never the address this dashboard is opened on (e.g. localhost).
let _publicBase = null;
export function setPublicBase(url) {
  _publicBase = url ? String(url).replace(/\/+$/, '') : null;
}

const PRIVATE = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$|\.local$/i;
export function isPublicUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !PRIVATE.test(u.hostname);
  } catch {
    return false;
  }
}

// The live address, or '' when none is configured (callers must then block QR/links).
export function siteBase() {
  return _publicBase && isPublicUrl(_publicBase) ? _publicBase : '';
}

// source: 'qr' (printed code) | 'nfc' | 'wa' (WhatsApp request) | 'sms' (SMS request) | 'link' (copied link)
// A printed QR encodes the plain address, e.g. https://smart-review-agent.onrender.com/review/jatan
// (the review page counts a visit without ?s= as a QR scan). Other sources add ?s=…; campaigns add ?c=….
// campaign: optional campaign tag (e.g. 'diwali-2026') → separate, trackable QR per campaign.
export function campaignTag(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}
export function reviewUrl(slug, source = 'qr', campaign = '') {
  const base = siteBase();
  const c = campaignTag(campaign);
  if (!base) return '';
  const q = [source && source !== 'qr' ? `s=${source}` : '', c ? `c=${c}` : ''].filter(Boolean).join('&');
  return `${base}/review/${encodeURIComponent(slug)}${q ? '?' + q : ''}`;
}

// Q = 25% error correction (keeps the centre logo badge and worn prints scannable); margin 4 = the standard
// 4-module white quiet zone that phone cameras need; pure black on white for maximum contrast.
const QR_OPTS = { errorCorrectionLevel: 'Q', margin: 4, color: { dark: '#000000', light: '#ffffff' } };

function assertPublic(url) {
  if (!isPublicUrl(url)) throw new Error('Refusing to create a QR code for a non-public address: ' + url);
}

export async function qrPng(url, width = 1024) {
  assertPublic(url);
  return QRCode.toDataURL(url, { ...QR_OPTS, width });
}

// TESTING ONLY: QR for this computer's Wi-Fi address (http://192.168.x.x:3000/…) so a phone on the same
// network can open the local app. Only private addresses are accepted, so it can never become a customer QR.
export async function testQrPng(url, width = 400) {
  const u = new URL(url);
  if (u.protocol !== 'http:' || !PRIVATE.test(u.hostname)) throw new Error('testQrPng is only for local network addresses');
  return QRCode.toDataURL(url, { ...QR_OPTS, width });
}

// Facts about the code for a URL (same settings as the PNG/SVG).
export function qrInfo(url) {
  const q = QRCode.create(url, { errorCorrectionLevel: QR_OPTS.errorCorrectionLevel });
  return { version: q.version, modules: q.modules.size, ecl: QR_OPTS.errorCorrectionLevel };
}

export async function qrSvg(url) {
  assertPublic(url);
  return QRCode.toString(url, { ...QR_OPTS, type: 'svg' });
}

export function download(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// next/font gives Inter / Noto Sans Devanagari internal family names; read them from the CSS
// variables set in app/layout.js so posters keep using the same fonts (falls back to the plain names).
function cssFont(name, fallback) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  } catch {
    return fallback;
  }
}
function canvasFont(weight, size, devanagari = true) {
  const noto = devanagari ? cssFont("--font-noto", "\"Noto Sans Devanagari\"") + ", " : "";
  return `${weight} ${size}px ${cssFont("--font-inter", "Inter")}, ${noto}Arial, sans-serif`;
}

function fitText(ctx, text, maxWidth, startSize, weight = 700, min = 26) {
  let size = startSize;
  do {
    ctx.font = canvasFont(weight, size);
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  } while (size > min);
  return size;
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Logo (or initials) in a white rounded badge at the centre of the QR code. Error-correction level Q
// keeps the code scannable. External logos that block cross-origin use fall back to initials.
async function drawCentreBadge(ctx, business, cx, cy, size) {
  const r = 22;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(cx - size / 2, cy - size / 2, size, size, r) : ctx.rect(cx - size / 2, cy - size / 2, size, size);
  ctx.fill();
  const inner = size - 24;
  let drawn = false;
  if (business.logo_url) {
    try {
      const img = await new Promise((res, rej) => {
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = business.logo_url;
      });
      const s = Math.min(inner / img.width, inner / img.height);
      const w = img.width * s, h = img.height * s;
      ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
      ctx.getImageData(cx, cy, 1, 1); // throws if the logo made the canvas unreadable
      drawn = true;
    } catch {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - inner / 2, cy - inner / 2, inner, inner);
    }
  }
  if (!drawn) {
    const brand = business.primary_color || '#1F3A5F';
    ctx.fillStyle = brand;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cx - inner / 2, cy - inner / 2, inner, inner, 16) : ctx.rect(cx - inner / 2, cy - inner / 2, inner, inner);
    ctx.fill();
    ctx.fillStyle = inkFor(brand);
    ctx.font = canvasFont(800, 46, false);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = String(business.short_name || business.name || '?').replace(/[|].*$/, '').split(/\s+/).filter(Boolean);
    ctx.fillText(words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?', cx, cy + 2);
  }
  ctx.restore();
}

// opts.label: optional line printed under the QR (e.g. the campaign name).
export async function posterPng(business, url, opts = {}) {
  assertPublic(url);
  if (document.fonts?.ready) await document.fonts.ready;
  const W = 1200, H = 1650;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const brand = business.primary_color || '#1F3A5F';
  const accent = business.accent_color || brand;
  const ink = inkFor(brand);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = brand;
  ctx.fillRect(0, 0, W, 330);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 330, W, 12);
  ctx.fillRect(0, H - 24, W, 24);

  ctx.textAlign = 'center';
  ctx.fillStyle = ink;
  const name = business.short_name || business.name;
  const size = fitText(ctx, name, W - 140, 78);
  ctx.font = canvasFont(700, size);
  ctx.fillText(name, W / 2, 165);
  ctx.globalAlpha = 0.85;
  ctx.font = canvasFont(500, 32);
  const sub = [business.category, business.location].filter(Boolean).join(' · ');
  wrap(ctx, sub, W - 160).slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, 230 + i * 42));
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#16181d';
  ctx.font = canvasFont(700, 58);
  ctx.fillText('Share your feedback', W / 2, 450);
  ctx.fillStyle = '#646b78';
  ctx.font = canvasFont(500, 34);
  ctx.fillText('तुमचा अभिप्राय द्या  ·  अपना फीडबैक दें', W / 2, 505);

  const qrSize = 760;
  const qr = await loadImage(await qrPng(url, qrSize));
  const qx = (W - qrSize) / 2, qy = 555;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e3e6eb';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(qx - 20, qy - 20, qrSize + 40, qrSize + 40, 32) : ctx.rect(qx - 20, qy - 20, qrSize + 40, qrSize + 40);
  ctx.fill();
  ctx.stroke();
  ctx.drawImage(qr, qx, qy, qrSize, qrSize);
  await drawCentreBadge(ctx, business, W / 2, qy + qrSize / 2, 132);

  if (opts.label) {
    ctx.fillStyle = brand;
    ctx.font = canvasFont(700, 28);
    ctx.fillText(opts.label, W / 2, 1370);
  }

  ctx.fillStyle = '#16181d';
  ctx.font = canvasFont(600, 40);
  ctx.fillText('Scan with your phone camera', W / 2, 1420);
  ctx.fillStyle = '#646b78';
  ctx.font = canvasFont(500, 30);
  ctx.fillText('English · मराठी · हिंदी   •   Takes under a minute', W / 2, 1475);
  ctx.font = canvasFont(400, 24, false);
  ctx.fillText('You choose your rating and post it yourself on Google.', W / 2, 1560);

  return c.toDataURL('image/png');
}
