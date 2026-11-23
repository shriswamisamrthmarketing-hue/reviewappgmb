'use client';

// Business dashboard tools: customer feedback, AI reply assistant (with approval), reports,
// and campaign / NFC QR codes. Used by the owner dashboard and (via ?b=) by the admin.
import { useEffect, useState } from 'react';
import { reviewUrl, qrPng, qrSvg, posterPng, download, campaignTag } from '@/lib/qr-client';

const LANGS = [['en', 'English'], ['hi', 'हिंदी'], ['mr', 'मराठी'], ['hl', 'Hinglish']];
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const stars = (n) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
const q = (adminSlug) => (adminSlug ? `?b=${encodeURIComponent(adminSlug)}` : '');
const amp = (adminSlug) => (adminSlug ? `&b=${encodeURIComponent(adminSlug)}` : '');

// CSV with proper quoting; the BOM makes Excel open Hindi/Marathi text correctly.
const csvCell = (v) => {
  const t = v === null || v === undefined ? '' : String(v);
  return /[",\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};
export const toCsv = (rows) => '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
const saveCsv = (rows, file) => download('data:text/csv;charset=utf-8,' + encodeURIComponent(toCsv(rows)), file);
const STYLE_NAMES = { simple: 'Simple', friendly: 'Friendly', professional: 'Professional', detailed: 'Detailed' };
const DRAFT_SRC = { ai: 'AI drafts (Gemini)', fallback: 'Built-in writer drafts', manual: 'Wrote their own' };
const draftInfo = (f) => (f.written_manually ? 'Wrote it themselves' : f.drafts_source ? DRAFT_SRC[f.drafts_source] || f.drafts_source : '');
export function feedbackRows(items, nameOf) {
  const head = ['Date', ...(nameOf ? ['Business'] : []), 'Stars', 'Highlights', 'Own words', 'Review language', 'Style', 'Drafts', 'Final review text', 'Copied', 'Opened Google (link click)', 'Came from', 'Campaign'];
  return [head].concat(items.map((f) => [
    f.created_at ? new Date(f.created_at).toISOString().replace('T', ' ').slice(0, 16) : '',
    ...(nameOf ? [nameOf(f.business_slug)] : []),
    f.stars,
    (f.highlights || []).flatMap((h) => h.values || []).join('; '),
    f.details || '',
    f.language || '',
    STYLE_NAMES[f.style] || f.style || '',
    draftInfo(f),
    f.review_text || '',
    f.copied ? 'yes' : 'no',
    f.google_clicked ? 'yes' : 'no',
    f.source || '',
    f.campaign || '',
  ]));
}

async function api(url, method = 'GET', body) {
  const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Something went wrong');
  return j;
}

/* ================================ Feedback ================================ */
export function FeedbackView({ adminSlug = '', onReply }) {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    api(`/api/owner/feedback${q(adminSlug)}${filter ? `${adminSlug ? '&' : '?'}stars=${filter}` : ''}`).then(setData).catch((e) => setError(e.message));
  }, [adminSlug, filter]);
  if (error) return <section className="od-card"><div className="alert warn">{error}</div></section>;
  if (!data) return <section className="od-card"><p className="od-sub">Loading feedback…</p></section>;
  const s = data.summary;
  const max = Math.max(1, ...Object.values(s.dist));
  const exportCsv = async () => {
    try {
      const all = await api(`/api/owner/feedback?all=1${amp(adminSlug)}${filter ? `&stars=${filter}` : ''}`);
      saveCsv(feedbackRows(all.items), `customer-feedback${filter ? '-' + filter + 'star' : ''}.csv`);
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <>
      <section className="od-stats oi-stats">
        <div className="od-stat"><div className="od-stat-top">Customer feedback</div><b>{s.count}</b><small>Customers who rated and answered</small></div>
        <div className="od-stat"><div className="od-stat-top">Average rating</div><b>{s.count ? s.average : '–'}</b><small>{s.count ? stars(Math.round(s.average)) : 'No ratings yet'}</small></div>
        <div className="od-stat"><div className="od-stat-top">Review link clicks</div><b>{s.google_clicked}</b><small>Tapped “open Google”. Not confirmed reviews.</small></div>
        <div className="od-stat"><div className="od-stat-top">Reviews copied</div><b>{s.copied}</b><small>Copied their final text</small></div>
      </section>
      <div className="od-two">
        <section className="od-card">
          <h3 className="od-h3">Rating distribution</h3>
          <p className="od-sub">Stars chosen by customers in the review page.</p>
          <div className="od-bars">
            {[5, 4, 3, 2, 1].map((n) => (
              <button key={n} type="button" className={'od-bar-row oi-bar-btn' + (filter === n ? ' on' : '')} onClick={() => setFilter(filter === n ? 0 : n)} title={`Show only ${n}-star feedback`}>
                <span className="od-bar-label">{n} ★</span>
                <span className="od-bar-track"><i style={{ width: `${(s.dist[n] / max) * 100}%` }} /></span>
                <span className="od-bar-val">{s.dist[n]}</span>
              </button>
            ))}
          </div>
          {filter > 0 && <button type="button" className="od-link" onClick={() => setFilter(0)}>Show all ratings</button>}
        </section>
        <section className="od-card">
          <h3 className="od-h3">What the numbers mean</h3>
          <ul className="oi-notes">
            <li><b>Feedback</b> = a customer chose stars and highlights on your review page.</li>
            <li><b>Review link clicks</b> = they tapped the button that opens Google. Google does not tell us whether they then posted, so this is <b>not</b> a count of published reviews.</li>
            <li>Every customer, whatever their rating, gets the same Google button.</li>
            <li>No names or phone numbers are collected.</li>
          </ul>
        </section>
      </div>
      <section className="od-card">
        <div className="oi-head-row">
          <h3 className="od-h3">Latest feedback {filter ? `· ${filter} ★ only` : ''}</h3>
          <button type="button" className="od-link" onClick={exportCsv} disabled={!data.items.length}>⬇ Download CSV</button>
        </div>
        {!data.items.length && <p className="od-sub">No feedback yet. Share your QR code or send a review request.</p>}
        <div className="oi-list">
          {data.items.map((f) => (
            <article key={f.id} className="oi-item">
              <div className="oi-item-top">
                <span className="oi-stars" aria-label={`${f.stars} stars`}>{stars(f.stars)}</span>
                <span className="oi-meta">{fmt(f.created_at)} · {LANGS.find(([c]) => c === f.language)?.[1] || f.language || '–'} · via {f.source || 'link'}{f.campaign ? ` · campaign “${f.campaign}”` : ''}</span>
              </div>
              {f.highlights?.length > 0 && (
                <div className="oi-tags">
                  {f.highlights.flatMap((h) => h.values.map((v) => <span key={h.question + v}>{v}</span>))}
                </div>
              )}
              {f.details && <p className="oi-own">“{f.details}”</p>}
              {f.review_text ? <p className="oi-text">{f.review_text}</p> : <p className="od-sub" style={{ margin: 0 }}>Did not copy a final review text.</p>}
              <div className="oi-badges">
                {f.google_clicked ? <span className="pill ok">Opened Google</span> : <span className="pill">Did not open Google</span>}
                {f.copied && <span className="pill">Copied text</span>}
                {draftInfo(f) && <span className="pill">{draftInfo(f)}</span>}
                {f.style && !f.written_manually && <span className="pill">{STYLE_NAMES[f.style] || f.style} style</span>}
                {onReply && f.review_text && <button type="button" className="od-link" onClick={() => onReply(f)}>Draft a reply →</button>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

/* ============================ Reply assistant ============================ */
export function RepliesView({ adminSlug = '', business, prefill }) {
  const [form, setForm] = useState({ reviewer: '', stars: 5, text: '', language: 'en', tone: 'professional', sentiment: '' });
  const [suggestions, setSuggestions] = useState(null);
  const [reply, setReply] = useState('');
  const [replySource, setReplySource] = useState('manual');
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [editing, setEditing] = useState(null); // { id, text }
  const gbp = business?.gbp_manage_url || 'https://business.google.com/reviews';

  const load = () => api(`/api/owner/replies${q(adminSlug)}`).then((j) => setHistory(j.replies)).catch((e) => setMsg({ type: 'err', text: e.message }));
  useEffect(() => {
    load();
  }, [adminSlug]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (prefill) setForm((f) => ({ ...f, stars: prefill.stars || f.stars, text: prefill.review_text || '', language: ['en', 'hi', 'mr'].includes(prefill.language) ? prefill.language : f.language }));
  }, [prefill]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const suggest = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const j = await api(`/api/owner/replies${q(adminSlug)}`, 'POST', { action: 'suggest', ...form });
      setSuggestions(j);
      setReply(j.replies[0] || '');
      setReplySource(j.source);
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    }
    setBusy(false);
  };
  const save = async (approve) => {
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/owner/replies${q(adminSlug)}`, 'POST', { action: 'save', reviewer: form.reviewer, stars: form.stars, review_text: form.text, reply_text: reply, language: form.language, source: replySource, approve });
      setMsg({ type: 'ok', text: approve ? 'Reply approved ✓ You can now copy it to Google.' : 'Saved as draft. Approve it before posting.' });
      setSuggestions(null);
      setReply('');
      setForm((f) => ({ ...f, reviewer: '', text: '' }));
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    }
    setBusy(false);
  };
  const act = async (r, action, extra = {}) => {
    try {
      await api(`/api/owner/replies/${r.id}${q(adminSlug)}`, 'PATCH', { action, ...extra });
      setEditing(null);
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    }
  };
  const copyOpen = async (r) => {
    try {
      await navigator.clipboard.writeText(r.reply_text);
    } catch {}
    window.open(gbp, '_blank', 'noopener');
    setMsg({ type: 'ok', text: 'Reply copied. Paste it under the review on Google, then tap “Mark as posted”.' });
  };
  const PILL = { draft: ['warn', 'Draft · needs approval'], approved: ['ok', 'Approved'], posted: ['', 'Posted'] };

  return (
    <>
      <section className="od-card">
        <h3 className="od-h3">AI review reply assistant</h3>
        <p className="od-sub">Paste a review from Google (positive, neutral or negative). You get two reply suggestions in English, Hindi, Marathi or Hinglish to edit. Nothing is posted until <b>you approve it</b> and paste it on Google yourself.</p>
        <div className="oi-form">
          <label>Reviewer name (optional)<input value={form.reviewer} onChange={set('reviewer')} maxLength={60} placeholder="e.g. Priya S." /></label>
          <label>Rating
            <select value={form.stars} onChange={(e) => setForm((f) => ({ ...f, stars: Number(e.target.value) }))}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{stars(n)} ({n})</option>)}
            </select>
          </label>
          <label>Reply language
            <select value={form.language} onChange={set('language')}>{LANGS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select>
          </label>
          <label>Review type
            <select value={form.sentiment} onChange={set('sentiment')}>
              <option value="">Auto (from the stars)</option>
              <option value="positive">Positive review</option>
              <option value="neutral">Neutral / mixed review</option>
              <option value="negative">Negative review</option>
            </select>
          </label>
          <label>Tone
            <select value={form.tone} onChange={set('tone')}><option value="professional">Professional</option><option value="friendly">Friendly</option></select>
          </label>
          <label className="oi-wide">Review text
            <textarea rows={3} value={form.text} onChange={set('text')} maxLength={2000} placeholder="Paste the customer’s Google review here…" />
          </label>
        </div>
        <div className="oi-actions">
          <button type="button" className="od-btn-solid" disabled={busy} onClick={suggest}>{busy && !suggestions ? 'Writing…' : '✨ Suggest replies'}</button>
          <button type="button" className="od-link" onClick={() => { setSuggestions({ replies: [], source: 'manual' }); setReply(''); setReplySource('manual'); }}>Write it myself</button>
        </div>
        {suggestions && (
          <div className="oi-suggest">
            {suggestions.aiUnavailable && <div className="alert warn">The free AI quota is not available right now, so these suggestions come from built-in templates. Edit them freely.</div>}
            {suggestions.replies.length > 0 && (
              <div className="oi-sugg-list">
                {suggestions.replies.map((r, i) => (
                  <button key={i} type="button" className={'oi-sugg' + (reply === r ? ' on' : '')} onClick={() => setReply(r)}><b>Option {i + 1}</b>{r}</button>
                ))}
              </div>
            )}
            <label className="oi-wide">Your reply (edit freely)
              <textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={2000} />
            </label>
            <div className="oi-actions">
              <button type="button" className="od-btn-solid" disabled={busy || reply.trim().length < 5} onClick={() => save(true)}>✓ Approve reply</button>
              <button type="button" className="od-link" disabled={busy || reply.trim().length < 5} onClick={() => save(false)}>Save as draft</button>
            </div>
          </div>
        )}
        {msg && <p className={'msgline ' + msg.type}>{msg.text}</p>}
      </section>

      <section className="od-card">
        <h3 className="od-h3">Reply history</h3>
        {!history.length && <p className="od-sub">No replies yet.</p>}
        <div className="oi-list">
          {history.map((r) => (
            <article key={r.id} className="oi-item">
              <div className="oi-item-top">
                <span className="oi-stars">{stars(r.stars || 0)}</span>
                <span className="oi-meta">{r.reviewer || 'Customer'} · {fmt(r.created_at)} · {r.source === 'ai' ? 'AI-assisted' : r.source === 'fallback' ? 'Template' : 'Written by you'}</span>
                <span className={'pill ' + PILL[r.status][0]}>{PILL[r.status][1]}</span>
              </div>
              {r.review_text && <p className="oi-own">“{r.review_text}”</p>}
              {editing?.id === r.id ? (
                <>
                  <textarea className="oi-edit" rows={3} value={editing.text} onChange={(e) => setEditing({ id: r.id, text: e.target.value })} />
                  <div className="oi-actions">
                    <button type="button" className="od-btn-solid" onClick={() => act(r, 'edit', { reply_text: editing.text })}>Save (needs approval again)</button>
                    <button type="button" className="od-link" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <p className="oi-text">{r.reply_text}</p>
              )}
              <div className="oi-badges">
                {r.status === 'draft' && <button type="button" className="od-btn-solid sm" onClick={() => act(r, 'approve')}>✓ Approve</button>}
                {r.status === 'approved' && <button type="button" className="od-btn-solid sm" onClick={() => copyOpen(r)}>Copy &amp; open Google</button>}
                {r.status === 'approved' && <button type="button" className="od-link" onClick={() => act(r, 'posted')}>Mark as posted</button>}
                {r.status !== 'posted' && editing?.id !== r.id && <button type="button" className="od-link" onClick={() => setEditing({ id: r.id, text: r.reply_text })}>Edit</button>}
                {r.status === 'approved' && <button type="button" className="od-link" onClick={() => act(r, 'unapprove')}>Undo approval</button>}
                {r.approved_at && <span className="oi-meta">Approved {fmt(r.approved_at)}{r.approved_by ? ` by ${r.approved_by}` : ''}</span>}
                {r.posted_at && <span className="oi-meta">Posted {fmt(r.posted_at)}</span>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

/* ================================ Reports ================================ */
export function ReportsView({ adminSlug = '' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api(`/api/owner/reports${q(adminSlug)}`).then(setData).catch((e) => setError(e.message));
  }, [adminSlug]);
  if (error) return <section className="od-card"><div className="alert warn">{error}</div></section>;
  if (!data) return <section className="od-card"><p className="od-sub">Loading reports…</p></section>;
  const camps = Object.entries(data.campaigns);
  const csv = () => {
    const rows = [['Month', 'Visits', 'QR/NFC scans', 'AI drafts', 'Review link clicks', 'Feedback', 'Average stars', 'Requests sent']]
      .concat(data.monthly.map((m) => [m.month, m.visits, m.scans, m.drafts, m.link_clicks, m.feedback, m.avg_stars ?? '', m.requests]));
    saveCsv(rows, 'monthly-report.csv');
  };
  return (
    <>
      <section className="od-card">
        <div className="oi-head-row">
          <h3 className="od-h3">Monthly report</h3>
          <button type="button" className="od-link" onClick={csv} disabled={!data.monthly.length}>⬇ Download CSV</button>
        </div>
        <p className="od-sub">“Review link clicks” are taps on the Google button, not confirmed published reviews.</p>
        {!data.monthly.length ? <p className="od-sub">No activity yet.</p> : (
          <div className="table-wrap">
            <table className="stats od-table">
              <thead><tr><th>Month</th><th>Visits</th><th>QR/NFC scans</th><th>AI drafts</th><th>Review link clicks</th><th>Feedback</th><th>Avg ★</th><th>Requests sent</th></tr></thead>
              <tbody>
                {data.monthly.map((m) => (
                  <tr key={m.month}>
                    <td>{new Date(m.month + '-15').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</td>
                    <td>{m.visits}</td><td>{m.scans}</td><td>{m.drafts}</td><td>{m.link_clicks}</td><td>{m.feedback}</td><td>{m.avg_stars ?? '–'}</td><td>{m.requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="od-card">
        <h3 className="od-h3">Campaign QR codes</h3>
        <p className="od-sub">Visits, review link clicks and feedback per campaign QR (create them under Review QR).</p>
        {!camps.length ? <p className="od-sub">No campaign QR has been scanned yet.</p> : (
          <div className="table-wrap">
            <table className="stats od-table">
              <thead><tr><th>Campaign</th><th>Visits</th><th>Feedback</th><th>Review link clicks</th></tr></thead>
              <tbody>{camps.map(([c, v]) => <tr key={c}><td><b>{c}</b></td><td>{v.visits}</td><td>{v.feedback}</td><td>{v.link_clicks}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

/* ======================= Admin: feedback across businesses ======================= */
export function AdminFeedback({ businesses }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/api/admin/feedback').then(setData).catch((e) => setError(e.message));
  }, []);
  const nameOf = (slug) => {
    const b = businesses.find((x) => x.slug === slug);
    return b ? b.short_name || b.name : slug;
  };
  return (
    <div className="section">
      <div className="adm-section-head">
        <h2 style={{ margin: 0 }}>Customer feedback (all businesses)</h2>
        <button type="button" className="btn small" disabled={!data?.items?.length} onClick={async () => {
          try {
            const all = await api('/api/admin/feedback?all=1');
            saveCsv(feedbackRows(all.items, nameOf), 'all-customer-feedback.csv');
          } catch (e) { setError(e.message); }
        }}>⬇ Download CSV</button>
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        From the 5-star review page. “Link clicks” = customers who tapped the Google button (not confirmed published reviews).
      </p>
      {error && <div className="alert warn">{error}</div>}
      {!data ? !error && <p className="muted">Loading…</p> : (
        <>
          <div className="table-wrap">
            <table className="stats">
              <thead><tr><th>Business</th><th>Feedback</th><th>Average ★</th><th>5★</th><th>4★</th><th>3★</th><th>2★</th><th>1★</th><th>Link clicks</th><th /></tr></thead>
              <tbody>
                {businesses.map((b) => {
                  const s = data.summaries[b.slug] || { count: 0, average: 0, dist: {}, google_clicked: 0 };
                  return (
                    <tr key={b.slug}>
                      <td><b>{b.short_name || b.name}</b></td>
                      <td>{s.count}</td><td>{s.count ? s.average : '–'}</td>
                      {[5, 4, 3, 2, 1].map((n) => <td key={n}>{s.dist?.[n] || 0}</td>)}
                      <td>{s.google_clicked}</td>
                      <td><a className="btn small" href={`/dashboard?b=${b.slug}&view=feedback`}>Open</a></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data.items.length > 0 && (
            <div className="oi-list" style={{ marginTop: 12 }}>
              {data.items.slice(0, 8).map((f) => (
                <article key={f.id} className="oi-item card">
                  <div className="oi-item-top">
                    <span className="oi-stars">{stars(f.stars)}</span>
                    <span className="oi-meta"><b>{nameOf(f.business_slug)}</b> · {fmt(f.created_at)}{f.campaign ? ` · ${f.campaign}` : ''}</span>
                    {f.google_clicked && <span className="pill ok">Opened Google</span>}
                  </div>
                  {f.review_text && <p className="oi-text">{f.review_text}</p>}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ========================== Campaign / NFC QR codes ========================== */
export function CampaignQr({ business }) {
  const [name, setName] = useState('');
  const [img, setImg] = useState('');
  const [note, setNote] = useState('');
  const tag = campaignTag(name);
  const url = reviewUrl(business.slug, 'qr', tag);
  const nfc = reviewUrl(business.slug, 'nfc', tag);
  useEffect(() => {
    if (url) qrPng(url, 400).then(setImg).catch(() => setImg(''));
  }, [url]);
  if (!url) return null;
  const file = `${business.slug}${tag ? '-' + tag : ''}`;
  return (
    <section className="od-card">
      <h3 className="od-h3">Campaign QR &amp; NFC</h3>
      <p className="od-sub">Make a separate QR for a campaign (e.g. “Diwali 2026”, “Table cards”, “Invoice”) to see which one brings the most feedback. NFC tags use the same link.</p>
      <div className="oi-camp">
        <div>
          <label className="oi-form-l">Campaign name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. diwali-2026" /></label>
          <code className="oi-code">{url}</code>
          <div className="oi-actions wrap">
            <button type="button" className="od-btn-solid sm" onClick={async () => download(await posterPng(business, url, { label: tag ? `Campaign: ${tag}` : '' }), `${file}-poster.png`)}>Poster PNG</button>
            <button type="button" className="od-link" onClick={async () => download(await qrPng(url, 2048), `${file}-qr.png`)}>QR PNG</button>
            <button type="button" className="od-link" onClick={async () => download('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(await qrSvg(url)), `${file}-qr.svg`)}>QR SVG</button>
            <button type="button" className="od-link" onClick={() => navigator.clipboard.writeText(nfc).then(() => setNote('NFC link copied ✓ Write it to an NFC tag with a free app such as “NFC Tools”.'))}>Copy NFC link</button>
          </div>
          {note && <p className="msgline ok">{note}</p>}
        </div>
        {img && <img className="oi-qr" src={img} alt={`QR code${tag ? ' for ' + tag : ''}`} />}
      </div>
    </section>
  );
}

/* ===================== Admin: monthly reports & campaigns (all businesses) ===================== */
const monthName = (m) => new Date(m + '-15').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
export function AdminReports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [pick, setPick] = useState(''); // '' = all businesses
  useEffect(() => {
    api('/api/admin/reports').then(setData).catch((e) => setError(e.message));
  }, []);
  const biz = data?.businesses.find((b) => b.slug === pick);
  const monthly = biz ? biz.monthly : data?.total || [];
  const camps = (data?.businesses || []).filter((b) => !pick || b.slug === pick).flatMap((b) => Object.entries(b.campaigns).map(([c, v]) => ({ business: b.name, campaign: c, ...v })));
  const head = ['Month', 'Visits', 'QR/NFC scans', 'AI drafts', 'Review link clicks', 'Feedback', 'Average stars', 'Requests sent'];
  const csv = () =>
    saveCsv([head].concat(monthly.map((m) => [m.month, m.visits, m.scans, m.drafts, m.link_clicks, m.feedback, m.avg_stars ?? '', m.requests])), `monthly-report-${pick || 'all-businesses'}.csv`);
  const campCsv = () =>
    saveCsv([['Business', 'Campaign', 'Visits', 'Feedback', 'Review link clicks']].concat(camps.map((c) => [c.business, c.campaign, c.visits, c.feedback, c.link_clicks])), `campaigns-${pick || 'all-businesses'}.csv`);
  return (
    <div className="section" id="reports">
      <div className="adm-section-head">
        <h2 style={{ margin: 0 }}>Monthly reports &amp; campaigns</h2>
        {data && (
          <select className="adm-select" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Business">
            <option value="">All businesses</option>
            {data.businesses.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
          </select>
        )}
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>“Review link clicks” are taps on the Google button, not confirmed published reviews.</p>
      {error && <div className="alert warn">{error}</div>}
      {!data ? !error && <p className="muted">Loading…</p> : (
        <>
          <div className="adm-section-head" style={{ marginTop: 4 }}>
            <b>Monthly report · {biz ? biz.name : 'all businesses'}</b>
            <button type="button" className="btn small" onClick={csv} disabled={!monthly.length}>⬇ Download CSV</button>
          </div>
          {!monthly.length ? <p className="muted">No activity yet.</p> : (
            <div className="table-wrap">
              <table className="stats">
                <thead><tr>{['Month', 'Visits', 'QR/NFC scans', 'AI drafts', 'Review link clicks', 'Feedback', 'Avg ★', 'Requests sent'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {monthly.map((m) => (
                    <tr key={m.month}><td>{monthName(m.month)}</td><td>{m.visits}</td><td>{m.scans}</td><td>{m.drafts}</td><td>{m.link_clicks}</td><td>{m.feedback}</td><td>{m.avg_stars ?? '–'}</td><td>{m.requests}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="adm-section-head" style={{ marginTop: 16 }}>
            <b>Campaign QR analytics</b>
            <button type="button" className="btn small" onClick={campCsv} disabled={!camps.length}>⬇ Download CSV</button>
          </div>
          {!camps.length ? <p className="muted">No campaign QR has been scanned yet. Owners (or you, via “Owner view”) create campaign QRs under Review QR.</p> : (
            <div className="table-wrap">
              <table className="stats">
                <thead><tr><th>Business</th><th>Campaign</th><th>Visits</th><th>Feedback</th><th>Review link clicks</th></tr></thead>
                <tbody>{camps.map((c) => <tr key={c.business + c.campaign}><td>{c.business}</td><td><b>{c.campaign}</b></td><td>{c.visits}</td><td>{c.feedback}</td><td>{c.link_clicks}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
