'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { brandVars, initials } from '@/lib/brand';
import { reviewUrl, posterPng, qrSvg, download, setPublicBase } from '@/lib/qr-client';
import { AddBusinessForm, OwnerAccounts } from '@/components/AdminOwners';
import { PublicUrlAlert, ReviewRequest, LiveStatus, Modal } from '@/components/ReviewTools';
import { AdminFeedback, AdminReports } from '@/components/OwnerInsights';
import AdminQr from '@/components/AdminQr';

const RATING_COLORS = { excellent: '#16a34a', good: '#84cc16', average: '#f59e0b', not_satisfied: '#ef4444' };
const RATING_LABELS = { excellent: 'Excellent', good: 'Good', average: 'Average', not_satisfied: 'Not satisfied' };

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState('');
  const [requestFor, setRequestFor] = useState(null); // business for the "Send review request" dialog
  const [copied, setCopied] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin/businesses', { cache: 'no-store' });
    if (res.status === 401) return (window.location.href = '/admin/login');
    const json = await res.json();
    if (!res.ok) setError(json.error || 'Could not load');
    else {
      setPublicBase(json.publicBase); // customer links always use the live address
      setData(json);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  if (error) return <div className="admin"><div className="alert warn">{error}</div></div>;
  if (!data) return <div className="admin"><p className="muted">Loading…</p></div>;

  const { businesses, stats, ownerCount = {} } = data;

  const removeBusiness = async (b) => {
    const typed = window.prompt(
      `Delete "${b.short_name || b.name}" permanently?\n\nThis removes its settings, statistics and owner accounts, and its printed QR codes will stop working.\n\nType the QR link name "${b.slug}" to confirm:`
    );
    if (typed === null) return;
    if (typed.trim() !== b.slug) return setNotice('Not deleted: the link name did not match.');
    const res = await fetch(`/api/admin/businesses/${b.slug}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: b.slug }),
    });
    const json = await res.json().catch(() => ({}));
    setNotice(res.ok ? `Deleted ${b.short_name || b.name}.` : json.error || 'Could not delete.');
    load();
  };
  const total = Object.values(stats).reduce(
    (a, s) => ({ visits: a.visits + s.visits, drafts: a.drafts + s.drafts, google: a.google + s.google_opens }),
    { visits: 0, drafts: 0, google: 0 }
  );

  return (
    <div className="admin">
      <div className="admin-top">
        <div>
          <h1>Smart Review Agent</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            {total.visits} visits · {total.drafts} drafts generated · {total.google} opened Google
          </p>
        </div>
        <div className="pills">
          <span className={'pill ' + (data.storage === 'supabase' ? 'ok' : 'warn')}>
            {data.storage === 'supabase' ? 'Database: Supabase' : 'Database: local file (testing only)'}
          </span>
          <span className={'pill ' + (data.ai ? 'ok' : 'warn')}>
            {data.ai ? `AI: Gemini (${data.model})` : 'AI: not configured – using basic templates'}
          </span>
          <button className="btn small" onClick={logout}>Log out</button>
        </div>
      </div>

      <PublicUrlAlert problem={data.publicBaseProblem} />
      {data.publicBase && (
        <div className="rt-banner">
          🌐 Customer QR codes and review links use the live site: <b>{data.publicBase}</b>
        </div>
      )}

      {data.storage !== 'supabase' && (
        <div className="alert warn">
          <b>This dashboard is using a local test file, not the live database.</b> Businesses and accounts you create here
          do <b>not</b> exist on {data.publicBase || 'the live site'}, so their QR codes would not open for customers. To manage
          the live site from this computer, put the <b>same SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY</b> that Render uses
          into <code>.env.local</code> and restart.
        </div>
      )}

      {(data.pendingCount > 0 || data.newSignups > 0) && (
        <div className={'alert ' + (data.pendingCount ? 'warn' : 'info')} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>
            {data.pendingCount > 0 && <><b>{data.pendingCount} new registration{data.pendingCount > 1 ? 's' : ''} waiting for your approval.</b> </>}
            {data.newSignups > 0 && <>{data.newSignups} business{data.newSignups > 1 ? 'es' : ''} signed up in the last 7 days.</>}
          </span>
          <a className="btn small primary" href="#owners">Review accounts ↓</a>
        </div>
      )}

      <div className="adm-section-head" style={{ marginTop: 8 }}>
        <h2 style={{ margin: 0 }}>Businesses ({businesses.length})</h2>
        {!adding && <button className="btn primary small" onClick={() => setAdding(true)}>+ Add business</button>}
      </div>
      {notice && <div className="alert info">{notice}</div>}
      {adding && (
        <AddBusinessForm
          onCancel={() => setAdding(false)}
          onCreated={(b) => {
            setAdding(false);
            setNotice(`Created ${b.short_name || b.name}. Its QR link is /review/${b.slug}. Now create an owner account below.`);
            load();
          }}
        />
      )}

      <div className="biz-grid">
        {businesses.map((b) => {
          const s = stats[b.slug];
          const oc = ownerCount[b.slug] || 0;
          return (
            <div key={b.slug} className="biz-card" style={brandVars(b)}>
              <div className="band" />
              <div className="body">
                <div className="biz-head">
                  {b.logo_url ? <img className="avatar img" src={b.logo_url} alt="" /> : <div className="avatar">{initials(b.short_name || b.name)}</div>}
                  <div>
                    <h2>{b.short_name || b.name}</h2>
                    <div className="slug">/review/{b.slug}</div>
                  </div>
                </div>
                <div className="biz-pills">
                  {b.google_review_url ? (
                    <span className="pill ok">✓ Google review link set</span>
                  ) : (
                    <span className="pill bad">! Add Google review link</span>
                  )}{' '}
                  <span className={'pill ' + (oc ? 'ok' : '')}>{oc ? `👤 ${oc} owner${oc > 1 ? 's' : ''}` : 'No owner account'}</span>
                </div>
                <div className="mini-stats">
                  <div><b>{s.visits}</b><span>Visits</span></div>
                  <div><b>{s.drafts}</b><span>Drafts</span></div>
                  <div><b>{s.copies}</b><span>Copied</span></div>
                  <div><b>{s.google_opens}</b><span>To Google</span></div>
                </div>
                <div className="biz-actions">
                  <Link className="btn small primary" href={`/admin/${b.slug}`}>Edit</Link>
                  <a className="btn small" href={`/review/${b.slug}?preview=1`} target="_blank" rel="noreferrer" title="Preview only, not the customer link (use QR / Copy link for customers)">Preview</a>
                  <button
                    className="btn small"
                    disabled={!data.publicBase}
                    title={data.publicBase ? `QR opens ${reviewUrl(b.slug)}` : 'Set PUBLIC_SITE_URL first'}
                    onClick={async () => download(await posterPng(b, reviewUrl(b.slug)), `${b.slug}-review-qr-poster.png`)}
                  >
                    QR PNG ↓
                  </button>
                  <button
                    className="btn small"
                    disabled={!data.publicBase}
                    title="QR code as SVG (for print designers)"
                    onClick={async () => download('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(await qrSvg(reviewUrl(b.slug))), `${b.slug}-review-qr.svg`)}
                  >
                    SVG ↓
                  </button>
                  <button
                    className={'btn small' + (copied === b.slug ? ' copied' : '')}
                    disabled={!data.publicBase}
                    title={reviewUrl(b.slug, 'link') || 'Set PUBLIC_SITE_URL first'}
                    onClick={() => navigator.clipboard.writeText(reviewUrl(b.slug, 'link')).then(() => { setCopied(b.slug); setTimeout(() => setCopied(''), 2000); }).catch(() => window.prompt('Copy the customer review link:', reviewUrl(b.slug, 'link')))}
                  >
                    {copied === b.slug ? '✓ Copied' : '🔗 Copy link'}
                  </button>
                  <Link className="btn small" href={`/dashboard?b=${b.slug}&view=qr`} title="Open this business’s dashboard (QR codes, feedback, reports)">QR &amp; owner view</Link>
                  <button className="btn small rt-send" disabled={!data.publicBase} onClick={() => setRequestFor(b)} title="Send a review request by WhatsApp or SMS">📲 Request</button>
                  <button className="btn small danger" onClick={() => removeBusiness(b)} title="Delete business">🗑</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AdminQr businesses={businesses} publicBase={data.publicBase} />

      {requestFor && (
        <Modal title={`Send review request · ${requestFor.short_name || requestFor.name}`} onClose={() => { setRequestFor(null); load(); }}>
          <LiveStatus slug={requestFor.slug} adminSlug={requestFor.slug} />
          <ReviewRequest business={requestFor} adminSlug={requestFor.slug} />
        </Modal>
      )}

      <OwnerAccounts businesses={businesses} onChange={load} />

      <AdminFeedback businesses={businesses} />

      <AdminReports />

      <div className="section">
        <h2>SEO keywords by business</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Number = drafts in which the AI used that keyword. Crossed-out keywords are switched off.
        </p>
        <div className="kw-board">
          {businesses.map((b) => (
            <div key={b.slug} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <b>{b.short_name || b.name}</b>
                <Link className="btn small" href={`/admin/${b.slug}?tab=keywords`}>Manage</Link>
              </div>
              {(b.keywords || []).length ? (
                b.keywords.map((k) => (
                  <span key={k.text} className={'kw-chip' + (k.enabled === false ? ' off' : '')} title={k.when?.length ? 'Only for certain answers' : 'Any customer'}>
                    {k.text} <b>{stats[b.slug].keywords?.[k.text] || 0}</b>
                  </span>
                ))
              ) : (
                <span className="muted" style={{ fontSize: 13 }}>No keywords yet</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>Usage statistics</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Counts of activity (no customer names or phone numbers). Admin previews are not counted. Customer feedback is listed below.
        </p>
        <div className="table-wrap">
          <table className="stats">
            <thead>
              <tr>
                <th>Business</th><th>Visits</th><th>QR scans</th><th>Visits 7d</th><th>Drafts</th><th>Drafts 7d</th>
                <th>Gemini drafts</th><th>Re-worded</th><th>Copied</th><th>Opened Google</th><th>Experience chosen</th><th>Review language</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => {
                const s = stats[b.slug];
                const rTotal = Object.values(s.ratings).reduce((a, x) => a + x, 0);
                return (
                  <tr key={b.slug}>
                    <td><b>{b.short_name || b.name}</b></td>
                    <td>{s.visits}</td><td>{s.qr_scans}</td><td>{s.visits_7d}</td><td>{s.drafts}</td><td>{s.drafts_7d}</td>
                    <td>{s.ai_drafts}</td><td>{s.regenerations}</td><td>{s.copies}</td><td>{s.google_opens}</td>
                    <td title={Object.entries(s.ratings).map(([k, v]) => `${RATING_LABELS[k]}: ${v}`).join('\n')}>
                      <div className="bar">
                        {rTotal ? Object.entries(s.ratings).map(([k, v]) => (
                          <i key={k} style={{ width: `${(v / rTotal) * 100}%`, background: RATING_COLORS[k] }} />
                        )) : null}
                      </div>
                      <span className="muted" style={{ fontSize: 11 }}>
                        {Object.entries(s.ratings).map(([k, v]) => `${RATING_LABELS[k][0]}${k === 'not_satisfied' ? 'S' : ''}:${v}`).join(' ')}
                      </span>
                    </td>
                    <td>EN {s.languages.en} · MR {s.languages.mr} · HI {s.languages.hi}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
