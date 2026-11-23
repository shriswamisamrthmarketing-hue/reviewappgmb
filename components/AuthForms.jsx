'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthLeft, AuthFoot, PasswordInput, Icon, ARROW } from '@/components/OwnerLogin';

async function postJson(url, body) {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { res, json: await res.json().catch(() => ({})) };
  } catch {
    return { res: { ok: false, status: 0 }, json: { error: 'Could not reach the server. Check your internet connection and try again.' } };
  }
}

function Field({ label, error, children, hint }) {
  return (
    <label className={'lg-field' + (error ? ' bad' : '')}>
      <span>{label}</span>
      {children}
      {error ? <small className="lg-ferr">{error}</small> : hint ? <small className="lg-hint">{hint}</small> : null}
    </label>
  );
}

/* ================================ Sign up ================================ */
export function SignupForm({ needsApproval }) {
  const [f, setF] = useState({ name: '', business_name: '', email: '', phone: '', location: '', password: '', confirm: '', terms: false, website: '' });
  const [errs, setErrs] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((x) => ({ ...x, [k]: v }));
    setErrs((x) => ({ ...x, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter your full name.';
    if (f.business_name.trim().length < 2) e.business_name = 'Enter your business name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
    if (f.password.length < 8) e.password = 'At least 8 characters.';
    else if (!/[a-zA-Z]/.test(f.password) || !/[0-9]/.test(f.password)) e.password = 'Use letters and numbers.';
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match.';
    if (!f.terms) e.terms = 'Please accept to continue.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) return setError('Please fix the highlighted fields.');
    setBusy(true);
    setError('');
    const { res, json } = await postJson('/api/auth/signup', { ...f, email: f.email.trim() });
    if (res.ok) {
      const q = new URLSearchParams({ notice: json.status === 'pending' ? 'pending' : 'registered', email: json.email || f.email.trim() });
      window.location.href = '/login?' + q.toString();
      return;
    }
    setErrs(json.fields || {});
    setError(json.error || 'Registration failed. Please try again.');
    setBusy(false);
  };

  return (
    <main className="lg">
      <AuthLeft
        title="Start collecting genuine"
        accent="5-star Google reviews"
        lead="Create your business account in a minute. You’ll get your own review QR, a customer chat in your brand colours and a private dashboard with live stats."
      />
      <section className="lg-right">
        <form className="lg-card" onSubmit={submit} noValidate>
          <h2>Create your account</h2>
          <p className="lg-sub">
            {needsApproval ? 'Register your business. Your account will be activated after a quick admin check.' : 'Register your business and start right away.'}
          </p>

          <div className="lg-grid2">
            <Field label="Your name *" error={errs.name}>
              <input value={f.name} onChange={set('name')} autoComplete="name" placeholder="Priya Sharma" maxLength={80} aria-invalid={!!errs.name || undefined} autoFocus />
            </Field>
            <Field label="Business name *" error={errs.business_name}>
              <input value={f.business_name} onChange={set('business_name')} autoComplete="organization" placeholder="Sunrise Café" maxLength={150} aria-invalid={!!errs.business_name || undefined} />
            </Field>
          </div>
          <Field label="Email address *" error={errs.email} hint="You’ll use this to sign in.">
            <input type="email" value={f.email} onChange={set('email')} autoComplete="email" autoCapitalize="none" placeholder="name@business.com" maxLength={254} aria-invalid={!!errs.email || undefined} />
          </Field>
          <div className="lg-grid2">
            <Field label="Mobile (optional)" error={errs.phone}>
              <input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="+91 98xxx xxxxx" maxLength={20} />
            </Field>
            <Field label="Area / city (optional)" error={errs.location}>
              <input value={f.location} onChange={set('location')} placeholder="Baner, Pune" maxLength={120} />
            </Field>
          </div>
          <div className="lg-grid2">
            <Field label="Password *" error={errs.password} hint="8+ characters, letters & numbers">
              <PasswordInput value={f.password} onChange={set('password')} autoComplete="new-password" invalid={!!errs.password} />
            </Field>
            <Field label="Confirm password *" error={errs.confirm}>
              <PasswordInput value={f.confirm} onChange={set('confirm')} autoComplete="new-password" invalid={!!errs.confirm} />
            </Field>
          </div>

          {/* honeypot: hidden from people, bots fill it in */}
          <input className="lg-hp" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} aria-hidden="true" name="website" />

          <label className={'lg-check lg-terms' + (errs.terms ? ' bad' : '')}>
            <input type="checkbox" checked={f.terms} onChange={set('terms')} />
            <span>I confirm I own or manage this business and agree that customers will always post their own, genuine reviews.</span>
          </label>
          {errs.terms && <small className="lg-ferr">{errs.terms}</small>}

          {error && <div className="lg-err" role="alert">{error}</div>}

          <button className="lg-btn" disabled={busy}>
            {busy ? 'Creating your account…' : 'Create Account'}
            {!busy && <Icon d={ARROW} size={19} />}
          </button>
          <p className="lg-help" style={{ marginTop: 16 }}>Already have an account? <Link href="/login"><b>Sign in</b></Link></p>
          <AuthFoot />
        </form>
      </section>
    </main>
  );
}

/* ================================ Forgot password ================================ */
export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { res, json } = await postJson('/api/auth/forgot', { email: email.trim() });
    setBusy(false);
    setMsg(res.ok ? { type: json.emailed ? 'ok' : 'info', text: json.message } : { type: 'err', text: json.error || 'Something went wrong.' });
  };
  return (
    <main className="lg">
      <AuthLeft />
      <section className="lg-right">
        <form className="lg-card" onSubmit={submit} noValidate>
          <h2>Forgot password?</h2>
          <p className="lg-sub">Enter your account email and we’ll help you set a new password.</p>
          <Field label="Email address">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" placeholder="name@business.com" autoFocus />
          </Field>
          {msg && <div className={msg.type === 'err' ? 'lg-err' : msg.type === 'ok' ? 'lg-ok' : 'lg-info'} role="status">{msg.text}</div>}
          <button className="lg-btn" disabled={busy || !email.trim()}>{busy ? 'Please wait…' : 'Send reset link'}{!busy && <Icon d={ARROW} size={19} />}</button>
          <p className="lg-help" style={{ marginTop: 16 }}><Link href="/login"><b>← Back to sign in</b></Link></p>
          <AuthFoot />
        </form>
      </section>
    </main>
  );
}

/* ================================ Reset password ================================ */
export function ResetForm({ token }) {
  const [state, setState] = useState('checking'); // checking | ok | invalid
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { res, json } = await postJson('/api/auth/reset', { token, check: true });
      if (res.ok) {
        setEmail(json.email);
        setState('ok');
      } else setState('invalid');
    })();
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (pw !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    setError('');
    const { res, json } = await postJson('/api/auth/reset', { token, password: pw });
    if (res.ok) {
      window.location.href = '/login?' + new URLSearchParams({ notice: 'reset', email: json.email || email }).toString();
      return;
    }
    setError(json.error || 'Could not change the password.');
    setBusy(false);
  };

  return (
    <main className="lg">
      <AuthLeft />
      <section className="lg-right">
        <form className="lg-card" onSubmit={submit} noValidate>
          <h2>Set a new password</h2>
          {state === 'checking' && <p className="lg-sub">Checking your link…</p>}
          {state === 'invalid' && (
            <>
              <div className="lg-err" style={{ marginTop: 14 }}>This reset link is invalid or has expired (links work for 1 hour, once).</div>
              <Link href="/forgot-password" className="lg-btn">Request a new link</Link>
            </>
          )}
          {state === 'ok' && (
            <>
              <p className="lg-sub">For <b>{email}</b></p>
              <Field label="New password" hint="8+ characters, letters & numbers">
                <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus />
              </Field>
              <Field label="Confirm new password">
                <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
              </Field>
              {error && <div className="lg-err" role="alert">{error}</div>}
              <button className="lg-btn" disabled={busy || !pw || !confirm}>{busy ? 'Saving…' : 'Save new password'}{!busy && <Icon d={ARROW} size={19} />}</button>
            </>
          )}
          <p className="lg-help" style={{ marginTop: 16 }}><Link href="/login"><b>← Back to sign in</b></Link></p>
          <AuthFoot />
        </form>
      </section>
    </main>
  );
}
