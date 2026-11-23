'use client';

import { useEffect, useState } from 'react';
import { siteBase } from '@/lib/qr-client';

async function api(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) window.location.href = '/admin/login';
  if (!res.ok) throw new Error(json.error || 'Something went wrong');
  return json;
}

// Readable random password, e.g. "Kite-Rain-48-Moss" (letters + numbers, ~60 bits).
function generatePassword() {
  const words = ['Amber', 'Brook', 'Cedar', 'Delta', 'Ember', 'Frost', 'Grove', 'Harbor', 'Indigo', 'Jade', 'Kite', 'Lotus',
    'Maple', 'Nova', 'Orbit', 'Pearl', 'Quartz', 'River', 'Sage', 'Tiger', 'Umber', 'Velvet', 'Willow', 'Zephyr'];
  const r = new Uint32Array(4);
  crypto.getRandomValues(r);
  return `${words[r[0] % words.length]}-${words[r[1] % words.length]}-${10 + (r[2] % 90)}-${words[r[3] % words.length]}`;
}

// Login links shared with owners must use the live address, not this dashboard's (localhost).
const loginBase = () => siteBase() || (typeof window !== 'undefined' ? window.location.origin : '');
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never');

/* ------------------------------ add business ------------------------------ */
export function AddBusinessForm({ onCreated, onCancel }) {
  const [f, setF] = useState({ name: '', short_name: '', slug: '', category: '', location: '', google_review_url: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const autoSlug = (f.short_name || f.name).split('|')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const { business } = await api('/api/admin/businesses', 'POST', { ...f, slug: f.slug || autoSlug });
      onCreated(business);
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  };

  return (
    <form className="card adm-form" onSubmit={submit}>
      <h2>Add a new business</h2>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        The business starts with default questions in English, Marathi and Hindi. You can edit everything afterwards.
      </p>
      <div className="adm-grid">
        <label className="field">Business name *<input value={f.name} onChange={set('name')} placeholder="Sunrise Café | Best Coffee in Baner" required maxLength={150} /></label>
        <label className="field">Short name<input value={f.short_name} onChange={set('short_name')} placeholder="Sunrise Café" maxLength={80} /></label>
        <label className="field">QR link name
          <input value={f.slug} onChange={set('slug')} placeholder={autoSlug || 'sunrise-cafe'} maxLength={40} />
          <small className="muted">Customers open /review/<b>{f.slug || autoSlug || '…'}</b>. This can’t be changed later.</small>
        </label>
        <label className="field">Category<input value={f.category} onChange={set('category')} placeholder="Café and bakery" maxLength={150} /></label>
        <label className="field">Area / city<input value={f.location} onChange={set('location')} placeholder="Baner, Pune" maxLength={120} /></label>
        <label className="field">Google review link<input value={f.google_review_url} onChange={set('google_review_url')} placeholder="https://g.page/r/…/review" /></label>
      </div>
      {err && <p className="msgline err">{err}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" disabled={busy || !f.name.trim()}>{busy ? 'Creating…' : 'Create business'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* ------------------------------ owner accounts ------------------------------ */
const EMPTY = { name: '', email: '', username: '', business_slug: '', password: '' };

export function OwnerAccounts({ businesses, onChange }) {
  const [owners, setOwners] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState(null); // null | 'new' | owner id being edited
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null); // { email, password } shown once after create / reset
  const [linkFor, setLinkFor] = useState(null); // { email, link } password-reset link
  const [filter, setFilter] = useState('all');

  const load = async () => {
    try {
      setOwners((await api('/api/admin/owners', 'GET')).owners);
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const bizName = (slug) => {
    const b = businesses.find((x) => x.slug === slug);
    return b ? b.short_name || b.name : slug;
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openNew = () => {
    setMode('new');
    setForm({ ...EMPTY, business_slug: businesses[0]?.slug || '', username: businesses[0]?.slug || '', password: generatePassword() });
    setMsg(null);
    setCreated(null);
  };
  const openEdit = (o) => {
    setMode(o.id);
    setForm({ name: o.name, email: o.email, username: o.username || '', business_slug: o.business_slug, password: '' });
    setMsg(null);
    setCreated(null);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'new') {
        await api('/api/admin/owners', 'POST', form);
        setCreated({ email: form.email.trim().toLowerCase(), username: form.username.trim().toLowerCase(), password: form.password });
      } else {
        const patch = { name: form.name, email: form.email, username: form.username, business_slug: form.business_slug };
        if (form.password) patch.password = form.password;
        await api(`/api/admin/owners/${mode}`, 'PATCH', patch);
        if (form.password) setCreated({ email: form.email.trim().toLowerCase(), username: form.username.trim().toLowerCase(), password: form.password });
        else setMsg({ type: 'ok', text: 'Saved ✓' });
      }
      setMode(null);
      await load();
      onChange?.();
    } catch (e2) {
      setMsg({ type: 'err', text: e2.message });
    }
    setBusy(false);
  };

  const setStatus = async (o, status) => {
    if (status === 'suspended' && !window.confirm(`Suspend ${o.email}? They will be signed out and can’t log in until you activate the account again.`)) return;
    if (status === 'rejected' && !window.confirm(`Reject the registration of ${o.email}? They will not be able to sign in. You can still approve it later.`)) return;
    try {
      await api(`/api/admin/owners/${o.id}`, 'PATCH', { status });
      setMsg({ type: 'ok', text: status === 'active' ? `${o.email} is now active ✓` : status === 'rejected' ? `${o.email}: registration rejected.` : `${o.email} is suspended.` });
      await load();
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    }
  };
  const resetLink = async (o) => {
    try {
      const { link } = await api(`/api/admin/owners/${o.id}/reset-link`, 'POST');
      setLinkFor({ email: o.email, link });
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    }
  };
  const remove = async (o) => {
    if (!window.confirm(`Delete the account ${o.email} permanently? This cannot be undone. (The business and its stats are kept.)`)) return;
    try {
      await api(`/api/admin/owners/${o.id}`, 'DELETE');
      await load();
      onChange?.();
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    }
  };

  return (
    <div className="section" id="owners">
      <div className="adm-section-head">
        <div>
          <h2>Business owner accounts</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Each owner signs in at <b>/login</b> and sees only their own business. New owners can also register at <b>/signup</b>.
            Suspending, moving or resetting a password signs them out immediately.
          </p>
        </div>
        {mode !== 'new' && <button className="btn primary small" onClick={openNew} disabled={!businesses.length}>+ New owner account</button>}
      </div>

      {error && <div className="alert warn">{error}</div>}

      {created && (
        <div className="alert info adm-created">
          <b>Login details. Share them privately with the owner:</b>
          <div>Login page: <code>{loginBase()}/login</code></div>
          <div>Email: <code>{created.email}</code></div>
          {created.username && <div>or username: <code>{created.username}</code></div>}
          <div>Password: <code>{created.password}</code></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button
              className="btn small"
              onClick={() =>
                navigator.clipboard.writeText(`Login: ${loginBase()}/login\nEmail: ${created.email}${created.username ? `\nUsername: ${created.username}` : ''}\nPassword: ${created.password}`)
                  .then(() => setMsg({ type: 'ok', text: 'Copied ✓' }))
              }
            >Copy details</button>
            <button className="btn small ghost" onClick={() => setCreated(null)}>Done, hide password</button>
          </div>
          <small className="muted">This password is shown only now. It is stored encrypted and can’t be viewed again.</small>
        </div>
      )}

      {mode && (
        <form className="card adm-form" onSubmit={save}>
          <h3>{mode === 'new' ? 'New owner account' : 'Edit owner account'}</h3>
          <div className="adm-grid">
            <label className="field">Owner name *<input value={form.name} onChange={set('name')} required maxLength={80} /></label>
            <label className="field">Email (login) *<input type="email" value={form.email} onChange={set('email')} required maxLength={254} /></label>
            <label className="field">Username (optional)
              <input value={form.username} onChange={set('username')} maxLength={40} autoCapitalize="none" placeholder="e.g. sunrise-cafe" />
              <small className="muted">Owner can sign in with email or this username.</small>
            </label>
            <label className="field">Business *
              <select
                value={form.business_slug}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({ ...f, business_slug: v, username: mode === 'new' && (!f.username || f.username === f.business_slug) ? v : f.username }));
                }}
                required
              >
                {businesses.map((b) => <option key={b.slug} value={b.slug}>{b.short_name || b.name}</option>)}
              </select>
            </label>
            <label className="field">{mode === 'new' ? 'Password *' : 'New password (leave empty to keep)'}
              <span style={{ display: 'flex', gap: 6 }}>
                <input value={form.password} onChange={set('password')} required={mode === 'new'} minLength={8} maxLength={128} autoComplete="new-password" style={{ flex: 1 }} />
                <button type="button" className="btn small" onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}>Generate</button>
              </span>
              <small className="muted">At least 8 characters with letters and numbers.</small>
            </label>
          </div>
          {msg?.type === 'err' && <p className="msgline err">{msg.text}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : mode === 'new' ? 'Create & activate' : 'Save changes'}</button>
            <button type="button" className="btn" onClick={() => setMode(null)}>Cancel</button>
          </div>
        </form>
      )}
      {!mode && msg && <p className={'msgline ' + msg.type}>{msg.text}</p>}

      {linkFor && (
        <div className="alert info adm-created">
          <b>Password reset link for {linkFor.email}</b>
          <div><code style={{ wordBreak: 'break-all' }}>{linkFor.link}</code></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button className="btn small" onClick={() => navigator.clipboard.writeText(linkFor.link).then(() => setMsg({ type: 'ok', text: 'Link copied ✓' }))}>Copy link</button>
            <button className="btn small ghost" onClick={() => setLinkFor(null)}>Close</button>
          </div>
          <small className="muted">Send it to the owner privately (WhatsApp / email). It works once and expires in 1 hour.</small>
        </div>
      )}

      {owners === null ? (
        <p className="muted">Loading…</p>
      ) : owners.length === 0 ? (
        <div className="card muted" style={{ textAlign: 'center' }}>No owner accounts yet. Create one, or let owners register at /signup.</div>
      ) : (
        (() => {
          const isNew = (o) => o.source === 'signup' && Date.now() - new Date(o.created_at).getTime() < 7 * 864e5;
          const counts = {
            all: owners.length,
            new: owners.filter(isNew).length,
            pending: owners.filter((o) => o.status === 'pending').length,
            rejected: owners.filter((o) => o.status === 'rejected').length,
            suspended: owners.filter((o) => o.status === 'suspended').length,
          };
          const shown = owners
            .filter((o) => filter === 'all' || (filter === 'new' ? isNew(o) : o.status === filter))
            // pending first, then newest first
            .sort((a, b) => (b.status === 'pending') - (a.status === 'pending') || String(b.created_at).localeCompare(String(a.created_at)));
          const PILL = { active: ['ok', 'Active'], pending: ['warn', 'Pending approval'], rejected: ['bad', 'Rejected'], suspended: ['bad', 'Suspended'] };
          return (
            <>
              <div className="adm-filters">
                {[['all', 'All'], ['new', 'New registrations'], ['pending', 'Pending approval'], ['rejected', 'Rejected'], ['suspended', 'Suspended']].map(([k, l]) => (
                  <button key={k} className={'adm-filter' + (filter === k ? ' on' : '') + (k === 'pending' && counts.pending ? ' alert' : '')} onClick={() => setFilter(k)}>
                    {l} <b>{counts[k]}</b>
                  </button>
                ))}
              </div>
              <div className="table-wrap">
                <table className="stats adm-owners">
                  <thead><tr><th>Owner</th><th>Business</th><th>Status</th><th>Registered</th><th>Last login</th><th /></tr></thead>
                  <tbody>
                    {shown.map((o) => (
                      <tr key={o.id} className={o.status === 'pending' ? 'adm-pending' : ''}>
                        <td>
                          <b>{o.name}</b> {isNew(o) && <span className="pill warn">New</span>}
                          <div className="muted" style={{ fontSize: 12 }}>{o.email}{o.username ? ` · @${o.username}` : ''}{o.phone ? ` · ${o.phone}` : ''}</div>
                        </td>
                        <td>{bizName(o.business_slug)}<div className="muted" style={{ fontSize: 12 }}>/review/{o.business_slug}</div></td>
                        <td><span className={'pill ' + PILL[o.status][0]}>{PILL[o.status][1]}</span></td>
                        <td style={{ fontSize: 13 }}>{fmtDate(o.created_at)}<div className="muted" style={{ fontSize: 12 }}>{o.source === 'signup' ? 'Self sign-up' : 'Created by admin'}</div></td>
                        <td style={{ fontSize: 13 }}>{fmtDate(o.last_login_at)}</td>
                        <td>
                          <div className="adm-row-actions">
                            {o.status === 'pending' && <button className="btn small primary" onClick={() => setStatus(o, 'active')}>✓ Approve</button>}
                            {o.status === 'rejected' && <button className="btn small primary" onClick={() => setStatus(o, 'active')}>✓ Approve</button>}
                            {o.status === 'suspended' && <button className="btn small primary" onClick={() => setStatus(o, 'active')}>Activate</button>}
                            {o.status === 'pending' && <button className="btn small" onClick={() => setStatus(o, 'rejected')}>✕ Reject</button>}
                            {o.status === 'active' && <button className="btn small" onClick={() => setStatus(o, 'suspended')}>Suspend</button>}
                            <a className="btn small" href={`/dashboard?b=${o.business_slug}`}>Dashboard</a>
                            <button className="btn small" onClick={() => openEdit(o)}>Edit</button>
                            <button className="btn small" onClick={() => resetLink(o)} title="Create a password reset link">Reset link</button>
                            <button className="btn small danger" onClick={() => remove(o)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!shown.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center' }}>Nothing here.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}
