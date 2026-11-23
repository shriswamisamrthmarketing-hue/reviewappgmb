export function inkFor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.4 ? '#111111' : '#ffffff';
}

/* ---- readable shades (WCAG contrast) – the saved brand colours are never changed ---- */
function luminance(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
export function contrastRatio(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const isHex = (h) => /^#?[0-9a-f]{6}$/i.test(h || '');
// The same colour, darkened step by step (toward black) until it reaches `min` contrast on white.
// Colours that are already readable are returned unchanged.
export function readableOnWhite(hex, min = 4.5) {
  if (!isHex(hex)) return hex;
  const n = parseInt(hex.replace('#', ''), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  for (let k = 0; k <= 100; k += 2) {
    const c = '#' + rgb.map((v) => Math.round(v * (1 - k / 100)).toString(16).padStart(2, '0')).join('');
    if (contrastRatio(c, '#ffffff') >= min) return k === 0 ? hex : c;
  }
  return '#111111';
}

export function brandVars(b) {
  const brand = b.primary_color || '#1F3A5F';
  const accent = b.accent_color || brand;
  const ink = inkFor(brand);
  // Solid brand backgrounds with WHITE text (buttons, badges): use a darker shade only when white text
  // would be hard to read. Light colours that already use dark text keep their real colour.
  const solid = isHex(brand) && ink === '#ffffff' && contrastRatio(brand, '#ffffff') < 4.5 ? readableOnWhite(brand) : brand;
  return {
    '--brand': brand,
    '--brand-ink': ink,
    '--accent': accent,
    '--accent-ink': inkFor(accent),
    '--brand-text': isHex(brand) ? readableOnWhite(brand) : brand, // brand-coloured text on white
    '--brand-solid': solid,
    '--brand-solid-ink': ink,
  };
}

export function initials(name = '') {
  const words = String(name)
    .replace(/[|].*$/, '')
    .split(/\s+/)
    .filter((w) => w && !/^(the|by|and|&)$/i.test(w));
  return (words.slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();
}
