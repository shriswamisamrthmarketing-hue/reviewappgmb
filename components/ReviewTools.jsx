'use client';

import { useEffect, useState } from 'react';
import { reviewUrl, siteBase } from '@/lib/qr-client';

/* ------------------------------------------------------------------ */
/* Warning shown when no public (live) address is configured.          */
/* ------------------------------------------------------------------ */
export function PublicUrlAlert({ problem }) {
  if (!problem) return null;
  return (
    <div className="alert warn rt-alert">
      <b>QR codes and review links are switched off.</b> {problem}
      <div className="rt-hint">
        Add <code>PUBLIC_SITE_URL=https://smart-review-agent.onrender.com</code> to <code>.env.local</code> (and to Render →
        Environment), then restart. Customer links must never use <code>localhost</code>.
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Live check: does /review/<slug> open on the live site?              */
/* ------------------------------------------------------------------ */
export function LiveStatus({ slug, adminSlug = '', onResult }) {
  const [state, setState] = useState({ status: 'idle' });
  const q = adminSlug ? `?b=${encodeURIComponent(adminSlug)}` : '';
  const run = async () => {
    setState({ status: 'checking' });
    let next;
    try {
      const res = await fetch('/api/live-check' + q, { cache: 'no-store' });
      const j = await res.json();
      next = { status: j.ok ? 'ok' : 'bad', ...j };
    } catch {
      next = { status: 'bad', reason: 'Could not run the check.' };
    }
    setState(next);
    onResult?.(next);
  };
  useEffect(() => {
    if (siteBase()) run();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!siteBase()) return null;
  return (
    <div className={'rt-live ' + state.status}>
      {state.status === 'checking' && <span>⏳ Checking the live link… (the live site may take up to a minute to wake up)</span>}
      {state.status === 'ok' && <span>✅ <b>Live link works</b>: customers can open it ({Math.round(state.ms / 100) / 10}s).</span>}
      {state.status === 'bad' && <span>⚠️ <b>Live link not working.</b> {state.reason}</span>}
      {state.status !== 'checking' && <button type="button" className="rt-link" onClick={run}>Re-check</button>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* WhatsApp / SMS review request                                        */
/* ------------------------------------------------------------------ */
const TEMPLATES = {
  en: (n, b, l) => `Hi${n ? ' ' + n : ''}! Thank you for choosing ${b}. 🙏 Could you share your experience in a quick Google review? It takes less than a minute: ${l}`,
  mr: (n, b, l) => `नमस्कार${n ? ' ' + n : ''}! ${b} निवडल्याबद्दल धन्यवाद. 🙏 तुमचा अनुभव Google review मध्ये शेअर कराल का? एका मिनिटापेक्षा कमी वेळ लागेल: ${l}`,
  hi: (n, b, l) => `नमस्ते${n ? ' ' + n : ''}! ${b} चुनने के लिए धन्यवाद. 🙏 क्या आप Google review में अपना अनुभव शेयर करेंगे? एक मिनट से भी कम लगेगा: ${l}`,
};

// → digits with country code, e.g. "919876543210", or '' if not usable.
export function normalizePhone(raw, cc = '91') {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = cc + d;
  return d.length >= 11 && d.length <= 15 ? d : '';
}

export function ReviewRequest({ business, adminSlug = '' }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [lang, setLang] = useState('en');
  const [note, setNote] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)), []);

  const bizName = business.short_name || business.name;
  const waLink = reviewUrl(business.slug, 'wa');
  const smsLink = reviewUrl(business.slug, 'sms');
  if (!waLink) return <p className="muted">Set the public site address first (see the warning above).</p>;

  const digits = normalizePhone(phone);
  const phoneBad = phone.trim() !== '' && !digits;
  const msg = (link) => TEMPLATES[lang](name.trim(), bizName, link);
  const q = adminSlug ? `?b=${encodeURIComponent(adminSlug)}` : '';
  const log = (channel) =>
    fetch('/api/review-request' + q, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, language: lang }),
    }).catch(() => {});

  const sendWa = () => {
    log('wa');
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg(waLink))}`, '_blank', 'noopener');
    setNote(`WhatsApp opened${digits ? ` for +${digits}` : ''}. Press send in WhatsApp.`);
  };
  const sendSms = () => {
    log('sms');
    window.location.href = `sms:${digits ? '+' + digits : ''}?&body=${encodeURIComponent(msg(smsLink))}`;
    setNote(isMobile ? 'Your SMS app opened. Press send.' : 'SMS opens the messaging app on phones. On a computer, use WhatsApp or “Copy message”.');
  };
  const copy = () =>
    navigator.clipboard.writeText(msg(waLink)).then(() => {
      log('wa');
      setNote('Message copied. Paste it into WhatsApp, SMS or email.');
    });

  return (
    <div className="rt-req">
      <div className="rt-grid">
        <label className="field">Customer name (optional)
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya" maxLength={60} />
        </label>
        <label className="field">Mobile number
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" maxLength={20} aria-invalid={phoneBad || undefined} />
          <small className={phoneBad ? 'rt-err' : 'muted'}>{phoneBad ? 'Enter a 10-digit mobile number (or with country code).' : 'Indian numbers get +91 automatically. Leave empty to pick the contact in WhatsApp.'}</small>
        </label>
        <label className="field">Message language
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="mr">मराठी</option>
            <option value="hi">हिंदी</option>
          </select>
        </label>
      </div>
      <div className="rt-preview">
        <small>Message preview</small>
        <p>{msg(waLink)}</p>
      </div>
      <div className="rt-actions">
        <button type="button" className="btn rt-wa" onClick={sendWa} disabled={phoneBad}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1.1 2.8 1.2 3c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" /></svg>
          Send on WhatsApp
        </button>
        <button type="button" className="btn" onClick={sendSms} disabled={phoneBad}>💬 Send SMS</button>
        <button type="button" className="btn ghost" onClick={copy}>📋 Copy message</button>
      </div>
      {note && <p className="msgline ok">{note}</p>}
      <p className="muted rt-fine">
        Link in the message: <code>{waLink}</code>. Names and numbers are not saved. Only the number of requests sent is
        counted on your dashboard.
      </p>
    </div>
  );
}

/* Simple modal wrapper */
export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="rt-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rt-modal-card">
        <div className="rt-modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
