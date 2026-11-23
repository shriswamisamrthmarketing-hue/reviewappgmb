'use client';

import { useState } from 'react';
import Link from 'next/link';

export function Icon({ d, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
  );
}
const STAR = <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />;
const EYE = <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>;
const EYE_OFF = <><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>;
export const ARROW = <path d="M5 12h14M13 6l6 6-6 6" />;

const PERKS = [
  { icon: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />, title: 'AI review drafts', text: 'Customers get a natural review from their own taps, in English, मराठी or हिंदी.' },
  { icon: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" />, title: 'Printable QR posters', text: 'Download table cards and counter posters whenever you need them.' },
  { icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />, title: 'Live review analytics', text: 'Track scans, drafts, copies and Google opens, day by day.' },
  { icon: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z M9 12l2 2 4-4" />, title: 'Private & Google-friendly', text: 'Your data stays yours. Customers always post their own reviews.' },
];

// Left half of every sign-in / sign-up page.
export function AuthLeft({ title, accent, lead }) {
  return (
    <section className="lg-left">
      <Link href="/" className="lg-back"><Icon d={<path d="M19 12H5M11 18l-6-6 6-6" />} size={18} /> Back to homepage</Link>
      <Link href="/" className="lg-logo">
        <span className="lg-mark"><Icon d={STAR} size={24} /></span>
        <span>
          <b>Smart Review <em>Agent</em></b>
          <small>Helping customers share honest reviews</small>
        </span>
      </Link>
      <span className="lg-badge"><i /> Google review platform · Business portal</span>
      <h1>{title || 'Grow your Google reviews &'} <span>{accent || 'win more local customers'}</span></h1>
      <p className="lg-lead">
        {lead ||
          'Sign in to your business dashboard to download your review QR, see how many customers turn into reviews, and fine-tune the questions your customers answer.'}
      </p>
      <div className="lg-perks">
        {PERKS.map((p) => (
          <div key={p.title} className="lg-perk">
            <span className="lg-perk-ic"><Icon d={p.icon} size={19} /></span>
            <span><b>{p.title}</b><small>{p.text}</small></span>
          </div>
        ))}
      </div>
      <div className="lg-trust">
        <span>⭐ Built for local businesses</span>
        <span>⚡ Reviews in under a minute</span>
        <span>🔒 Encrypted, secure sign-in</span>
      </div>
    </section>
  );
}

export function PasswordInput({ value, onChange, autoComplete = 'current-password', placeholder = '••••••••', autoFocus, invalid, id }) {
  const [show, setShow] = useState(false);
  return (
    <span className="lg-pw">
      <input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus} aria-invalid={invalid || undefined} />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
        <Icon size={20} d={show ? EYE_OFF : EYE} />
      </button>
    </span>
  );
}

export function AuthFoot() {
  return (
    <div className="lg-foot">
      <span>⚡ Instant access</span>
      <span>·</span>
      <span>🔒 Secure, encrypted login</span>
    </div>
  );
}

const NOTICES = {
  registered: 'Registration successful! 🎉 Sign in with your email and password to open your dashboard.',
  pending: 'Registration received! 🎉 Your account is waiting for administrator approval. You can sign in as soon as it is approved.',
  reset: 'Your password has been changed. Sign in with your new password.',
  loggedout: 'You have been signed out.',
};

export default function OwnerLogin({ initialRole = 'owner', notice = '', prefill = '', signupOpen = true, adminUsesEmail = false }) {
  const isAdminPage = initialRole === 'admin';
  const [identifier, setIdentifier] = useState(isAdminPage ? (adminUsesEmail ? '' : 'admin') : prefill);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return setError('Enter your email/username and password.');
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password, remember }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        window.location.href = json.redirect || '/dashboard';
        return;
      }
      setError(json.error || 'Login failed. Please try again.');
    } catch {
      setError('Could not reach the server. Check your internet connection and try again.');
    }
    setBusy(false);
  };

  return (
    <main className="lg">
      <AuthLeft />
      <section className="lg-right">
        <form className="lg-card" onSubmit={submit} noValidate>
          <h2>{isAdminPage ? 'Administrator Login' : 'Business Login'}</h2>
          <p className="lg-sub">{isAdminPage ? 'Sign in with the administrator email (or “admin”) and the admin password' : 'Enter your credentials to access your review dashboard'}</p>

          {NOTICES[notice] && <div className="lg-ok" role="status">{NOTICES[notice]}</div>}

          <label className="lg-field">
            <span>{isAdminPage ? 'Admin email or username' : 'Email or username'}</span>
            <input
              type="text"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={isAdminPage ? 'admin@yourcompany.com or admin' : 'yourbusiness or name@business.com'}
              autoFocus={!identifier}
            />
          </label>
          <label className="lg-field">
            <span>Password</span>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoFocus={Boolean(identifier)} />
          </label>

          <div className="lg-row">
            <label className="lg-check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me</label>
            {!isAdminPage && <Link className="lg-link" href="/forgot-password">Forgot Password?</Link>}
          </div>

          {error && <div className="lg-err" role="alert">{error}</div>}

          <button className="lg-btn" disabled={busy}>
            {busy ? 'Signing in…' : isAdminPage ? 'Sign In as Administrator' : 'Sign In to Dashboard'}
            {!busy && <Icon d={ARROW} size={19} />}
          </button>

          {isAdminPage ? (
            <p className="lg-help">The admin password is set on the server (ADMIN_PASSWORD). Business owner? <Link href="/login"><b>Business login</b></Link></p>
          ) : signupOpen ? (
            <>
              <div className="lg-or"><span>New here?</span></div>
              <Link href="/signup" className="lg-btn-outline">Create a business account</Link>
              <p className="lg-help">Don’t have an account? <Link href="/signup"><b>Sign up free</b></Link></p>
            </>
          ) : (
            <>
              <div className="lg-or"><span>Need access?</span></div>
              <p className="lg-help">Don’t have an account? <b>Ask your administrator</b> to create your business login.</p>
            </>
          )}
          {!isAdminPage && <p className="lg-help" style={{ marginTop: 6 }}>Administrator? <Link href="/admin/login">Admin login</Link></p>}
          <AuthFoot />
        </form>
      </section>
    </main>
  );
}
