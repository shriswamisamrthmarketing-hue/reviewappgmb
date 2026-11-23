'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { brandVars, initials } from '@/lib/brand';
import { reviewUrl, qrPng, qrSvg, posterPng, download, setPublicBase } from '@/lib/qr-client';
import { PublicUrlAlert, LiveStatus, ReviewRequest } from '@/components/ReviewTools';

const LANGS = [
  ['en', 'English'],
  ['mr', 'मराठी'],
  ['hi', 'हिंदी'],
];
const emptyML = () => ({ en: '', mr: '', hi: '' });

function MLInputs({ value, onChange, textarea, placeholder }) {
  return (
    <div className="row3">
      {LANGS.map(([k, label]) => (
        <div key={k} className="stack" style={{ gap: 3 }}>
          <span className="lang-tag">{label}</span>
          {textarea ? (
            <textarea rows={3} value={value?.[k] || ''} placeholder={k === 'en' ? placeholder : ''} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
          ) : (
            <input type="text" value={value?.[k] || ''} placeholder={k === 'en' ? placeholder : ''} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function BusinessEditor({
  slug,
  api = `/api/admin/businesses/${slug}`,
  home = "/admin",
  homeLabel = "All businesses",
  loginHref = "/admin/login",
}) {
  const [form, setForm] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [tab, setTab] = useState('details');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [qr, setQr] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [stats, setStats] = useState(null);
  const [urlProblem, setUrlProblem] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch(api, { cache: 'no-store' });
      if (res.status === 401) return (window.location.href = loginHref);
      const json = await res.json();
      setPublicBase(json.publicBase); // QR codes and links always use the live address
      setUrlProblem(json.publicBaseProblem || '');
      setForm(json.business);
      setDefaults(json.defaults);
      setStats(json.stats);
      const u = reviewUrl(slug);
      if (u) qrPng(u, 600).then(setQr);
    })();
    const t = new URLSearchParams(window.location.search).get('tab');
    if (['details', 'questions', 'keywords', 'qr', 'request', 'preview'].includes(t)) setTab(t);
  }, [slug, api, loginHref]);

  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (!form) return <div className="admin"><p className="muted">Loading…</p></div>;

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setMsg(null);
  };
  const settings = form.settings || {};
  const setS = (key, value) => set('settings', { ...settings, [key]: value });
  const setQ = (i, patch) => set('questions', form.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const moveQ = (i, d) => {
    const qs = [...form.questions];
    const j = i + d;
    if (j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j], qs[i]];
    set('questions', qs);
  };
  const setOpt = (qi, oi, label) =>
    setQ(qi, { options: form.questions[qi].options.map((o, j) => (j === oi ? { ...o, label } : o)) });

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch(api, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setMsg({ type: 'err', text: json.error || 'Could not save' });
    setForm(json.business);
    setDirty(false);
    setPreviewKey((k) => k + 1);
    setMsg(json.warning ? { type: 'warn', text: 'Saved. ' + json.warning } : { type: 'ok', text: 'Saved ✓' });
  };

  const url = reviewUrl(slug); // '' when no live address is configured
  const adminSlug = api.includes('?b=') || api.startsWith('/api/admin/') ? slug : '';
  const name = form.short_name || form.name;

  return (
    <div className="admin" style={brandVars(form)}>
      <div className="admin-top">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {form.logo_url ? <img className="avatar img" src={form.logo_url} alt="" /> : <div className="avatar">{initials(name)}</div>}
          <div>
            <Link href={home} className="muted" style={{ fontSize: 13 }}>← {homeLabel}</Link>
            <h1 style={{ marginTop: 2 }}>{name}</h1>
          </div>
        </div>
        {!form.google_review_url && <span className="pill bad">Google review link missing</span>}
      </div>

      <div className="tabs">
        {[
          ['details', 'Business details'],
          ['questions', 'AI questions & options'],
          ['keywords', 'SEO keywords'],
          ['qr', 'QR code'],
          ['request', 'Send review request'],
          ['preview', 'Preview chat'],
        ].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="editor">
        <div className="card">
          {tab === 'details' && (
            <>
              <div className="field">
                <label>Google Review link (public) *</label>
                <input type="url" value={form.google_review_url} placeholder="https://g.page/r/XXXXXXXX/review" onChange={(e) => set('google_review_url', e.target.value)} />
                <div className="help">
                  This is where the “Post on Google” button sends customers. How to get it:
                  <ol className="steps">
                    <li>Open your Business Profile (search the business name on Google while signed in, or open the management link below).</li>
                    <li>Click <b>Ask for reviews</b> (or <b>Read reviews → Get more reviews</b>).</li>
                    <li>Copy the link shown (usually <code>https://g.page/r/…/review</code>) and paste it here.</li>
                  </ol>
                </div>
                {form.google_review_url && (
                  <a className="btn small" style={{ alignSelf: 'flex-start' }} href={form.google_review_url} target="_blank" rel="noreferrer">Test this link ↗</a>
                )}
              </div>
              <div className="field">
                <label>Business Profile management link (for your reference only)</label>
                <input type="url" value={form.gbp_manage_url} onChange={(e) => set('gbp_manage_url', e.target.value)} />
                <div className="help">Only you can open this. It is never shown to customers and is not a review link.</div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Full business name</label>
                  <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} />
                </div>
                <div className="field">
                  <label>Short name (used in chat and reviews)</label>
                  <input type="text" value={form.short_name} onChange={(e) => set('short_name', e.target.value)} />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Category / what you do</label>
                  <input type="text" value={form.category} onChange={(e) => set('category', e.target.value)} />
                </div>
                <div className="field">
                  <label>Location</label>
                  <input type="text" value={form.location} onChange={(e) => set('location', e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>SEO keywords</label>
                <div className="help">
                  {form.keywords.filter((k) => k.enabled !== false).length} active keyword(s).{' '}
                  <button className="link-btn" style={{ padding: 0 }} onClick={() => setTab('keywords')}>Manage keywords →</button>
                </div>
              </div>

              {/* Customer review page settings (saved in businesses.settings for THIS business only) */}
              <h3 style={{ fontSize: 15, margin: '18px 0 4px' }}>Customer review page</h3>
              <div className="row">
                <div className="field">
                  <label>Instagram profile (optional)</label>
                  <input type="text" value={settings.instagram_url || ''} placeholder="https://www.instagram.com/yourname" onChange={(e) => setS('instagram_url', e.target.value)} />
                  <div className="help">Shows a “Follow on Instagram” button. Leave empty to hide it.</div>
                </div>
                <div className="field">
                  <label>WhatsApp number (optional)</label>
                  <input type="tel" value={settings.whatsapp || ''} placeholder="+91 98765 43210" onChange={(e) => setS('whatsapp', e.target.value)} />
                  <div className="help">Shows a “Chat on WhatsApp” button. Include the country code. Leave empty to hide it.</div>
                </div>
              </div>
              <div className="row3">
                <div className="field">
                  <label>Page language</label>
                  <select value={settings.language || ''} onChange={(e) => setS('language', e.target.value)}>
                    <option value="">Customer’s phone language</option>
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="mr">मराठी (Marathi)</option>
                  </select>
                </div>
                <div className="field">
                  <label>Review suggestions shown</label>
                  <select value={String(settings.suggestions || 3)} onChange={(e) => setS('suggestions', Number(e.target.value))}>
                    <option value="3">3 suggestions</option>
                    <option value="5">5 suggestions</option>
                    <option value="7">7 suggestions</option>
                  </select>
                </div>
                <div className="field">
                  <label>Experience topics</label>
                  <select value={settings.topics === false ? 'no' : 'yes'} onChange={(e) => setS('topics', e.target.value === 'yes')}>
                    <option value="yes">Show (service, staff, quality…) – default</option>
                    <option value="no">Hidden</option>
                  </select>
                </div>
              </div>
              <div className="help" style={{ marginTop: -6, marginBottom: 12 }}>
                Customers can always switch between English, हिंदी and मराठी. Suggestions are written only from the
                customer&apos;s rating, their own words and the verified facts below, and every customer can edit their review
                before going to Google.
              </div>
              <div className="field">
                <label>Verified business facts (optional, up to 8)</label>
                <div className="help" style={{ marginBottom: 6 }}>
                  Short, <b>true</b> facts about this business, e.g. “ready-possession 2 BHK flats”, “Sahakar Nagar, Pune”,
                  “mechanised parking”. Review suggestions mention them only as facts about the business – never as
                  something the customer did or experienced. No links or phone numbers.
                </div>
                {[...(settings.facts || []), ...((settings.facts || []).length < 8 ? [''] : [])].map((fact, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input
                      type="text"
                      maxLength={100}
                      value={fact}
                      placeholder={i === 0 ? 'e.g. ready-possession 2 BHK flats' : 'Add another fact'}
                      aria-label={`Verified fact ${i + 1}`}
                      onChange={(e) => {
                        const list = [...(settings.facts || [])];
                        list[i] = e.target.value;
                        setS('facts', list.filter((x, j) => x.trim() || j === i).slice(0, 8));
                      }}
                    />
                    {i < (settings.facts || []).length && (
                      <button className="icon-btn" title="Remove fact" onClick={() => setS('facts', (settings.facts || []).filter((_, j) => j !== i))}>✕</button>
                    )}
                  </div>
                ))}
              </div>
              <div className="row">
                <div className="field">
                  <label>Main colour</label>
                  <div className="color-input">
                    <input type="color" value={form.primary_color} onChange={(e) => set('primary_color', e.target.value)} />
                    <input type="text" value={form.primary_color} onChange={(e) => set('primary_color', e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Accent colour</label>
                  <div className="color-input">
                    <input type="color" value={form.accent_color} onChange={(e) => set('accent_color', e.target.value)} />
                    <input type="text" value={form.accent_color} onChange={(e) => set('accent_color', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="field">
                <label>Logo image URL (optional)</label>
                <input type="url" value={form.logo_url} placeholder="https://…/logo.png" onChange={(e) => set('logo_url', e.target.value)} />
                <div className="help">Leave empty to show initials. Tip: upload the logo to your website or Supabase Storage (public bucket) and paste its https link.</div>
              </div>
              <div className="field">
                <label>Greeting message</label>
                <MLInputs textarea value={form.greeting} onChange={(v) => set('greeting', v)} />
              </div>
            </>
          )}

          {tab === 'questions' && (
            <>
              <div className="alert info">
                Every customer is always asked <b>“How was your experience?”</b> (Excellent / Good / Average / Not satisfied) first and
                <b> which language</b> they want at the end – these are fixed so every customer is treated the same. Below are the
                business-specific questions in between. English is required; Marathi/Hindi fall back to English if left empty.
              </div>
              {form.questions.map((q, i) => (
                <div key={i} className="q-card">
                  <div className="q-head">
                    <b>Question {i + 1}</b>
                    <div className="q-tools">
                      <button className="icon-btn" title="Move up" onClick={() => moveQ(i, -1)}>↑</button>
                      <button className="icon-btn" title="Move down" onClick={() => moveQ(i, 1)}>↓</button>
                      <button
                        className="icon-btn"
                        title="Delete question"
                        onClick={() => window.confirm('Delete this question?') && set('questions', form.questions.filter((_, j) => j !== i))}
                      >🗑</button>
                    </div>
                  </div>
                  <div className="field">
                    <label>Question asked by the assistant</label>
                    <MLInputs value={q.prompt} onChange={(v) => setQ(i, { prompt: v })} placeholder="What did you like?" />
                  </div>
                  <div className="field">
                    <label>Short label for the AI (what this answer means)</label>
                    <MLInputs value={q.summary} onChange={(v) => setQ(i, { summary: v })} placeholder="What I liked" />
                  </div>
                  <div className="row3">
                    <div className="field">
                      <label>Answer type</label>
                      <select value={q.type} onChange={(e) => setQ(i, { type: e.target.value })}>
                        <option value="multi">Multiple answers</option>
                        <option value="single">One answer</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Ask whom</label>
                      <select value={q.showFor} onChange={(e) => setQ(i, { showFor: e.target.value })}>
                        <option value="all">Everyone</option>
                        <option value="liked">Excellent / Good / Average</option>
                        <option value="improve">Average / Not satisfied</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Skippable</label>
                      <select value={q.optional ? 'yes' : 'no'} onChange={(e) => setQ(i, { optional: e.target.value === 'yes' })}>
                        <option value="yes">Yes – show “Skip”</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Answer options</label>
                  <div className="opt-row" style={{ marginTop: 6 }}>
                    {LANGS.map(([k, l]) => <span key={k} className="lang-tag">{l}</span>)}
                    <span />
                  </div>
                  {q.options.map((o, oi) => (
                    <div key={oi} className="opt-row">
                      {LANGS.map(([k]) => (
                        <input key={k} type="text" value={o.label?.[k] || ''} onChange={(e) => setOpt(i, oi, { ...o.label, [k]: e.target.value })} />
                      ))}
                      <button className="icon-btn" title="Remove option" onClick={() => setQ(i, { options: q.options.filter((_, j) => j !== oi) })}>✕</button>
                    </div>
                  ))}
                  <button className="btn small" style={{ marginTop: 6 }} onClick={() => setQ(i, { options: [...q.options, { id: '', label: emptyML() }] })}>
                    + Add option
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn"
                  disabled={form.questions.length >= 8}
                  onClick={() =>
                    set('questions', [
                      ...form.questions,
                      { id: '', type: 'multi', showFor: 'all', optional: true, prompt: emptyML(), summary: emptyML(), options: [{ id: '', label: emptyML() }] },
                    ])
                  }
                >+ Add question</button>
                <button
                  className="btn danger"
                  onClick={() => window.confirm('Replace all questions with the original defaults?') && set('questions', defaults.questions)}
                >Reset questions to default</button>
              </div>
            </>
          )}

          {tab === 'keywords' && (
            <KeywordsTab
              form={form}
              stats={stats}
              onChange={(kws) => set('keywords', kws)}
              onReset={() => window.confirm('Replace this business’s keywords with the original defaults?') && set('keywords', defaults.keywords || [])}
            />
          )}

          {tab === 'qr' && (
            <div className="qr-box">
              <div style={{ textAlign: 'left' }}><PublicUrlAlert problem={urlProblem} /></div>
              {url && <div style={{ textAlign: 'left' }}><LiveStatus slug={slug} adminSlug={adminSlug} /></div>}
              {!form.google_review_url && (
                <div className="alert warn" style={{ textAlign: 'left' }}>Add the Google Review link in “Business details” before printing.</div>
              )}
              {qr && <img src={qr} alt={`QR code for ${name}`} />}
              <div className="qr-url">{url || 'Live address not configured'}</div>
              {url && <div className="stack" style={{ maxWidth: 360, margin: '0 auto' }}>
                <button className="btn primary" onClick={async () => download(await posterPng(form, url), `${slug}-review-qr-poster.png`)}>
                  Download printable poster (PNG)
                </button>
                <button className="btn" onClick={async () => download(await qrPng(url, 2048), `${slug}-review-qr.png`)}>Download QR only (PNG, high-res)</button>
                <button
                  className="btn"
                  onClick={async () => download('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(await qrSvg(url)), `${slug}-review-qr.svg`)}
                >Download QR (SVG for print designers)</button>
                <button className="btn ghost" onClick={() => navigator.clipboard.writeText(url).then(() => setMsg({ type: 'ok', text: 'Link copied' }))}>
                  Copy link
                </button>
              </div>}
              <p className="muted" style={{ fontSize: 13 }}>
                The QR link never changes, so printed codes keep working even after you edit questions or the Google link.
              </p>
            </div>
          )}

          {tab === 'request' && (
            <>
              <PublicUrlAlert problem={urlProblem} />
              {url && <LiveStatus slug={slug} adminSlug={adminSlug} />}
              <p className="muted" style={{ marginTop: 0 }}>
                Send a customer a ready-made message with the review link. It opens on their phone, even if they never scanned a QR code.
              </p>
              <ReviewRequest business={form} adminSlug={adminSlug} />
            </>
          )}

          {tab === 'preview' && (
            <>
              {dirty && <div className="alert warn">You have unsaved changes – save to see them in the preview.</div>}
              <div className="phone-frame" style={{ maxWidth: 390, margin: '0 auto' }}>
                <iframe key={previewKey} src={`/review/${slug}?preview=1`} title="Customer chat preview" />
              </div>
              <p className="muted" style={{ textAlign: 'center', fontSize: 13 }}>
                Previews are not counted in statistics. <a href={`/review/${slug}?preview=1`} target="_blank" rel="noreferrer">Open full screen ↗</a>
              </p>
            </>
          )}
        </div>

        <aside className="editor-side">
          <div className="card qr-box">
            <h3 style={{ fontSize: 15 }}>Customer QR</h3>
            {qr && <img src={qr} alt="" style={{ maxWidth: 180 }} />}
            <div className="qr-url">/review/{slug}</div>
            <div className="stack">
              <button className="btn small" onClick={() => setTab('qr')}>Download options</button>
              <a className="btn small" href={`/review/${slug}?preview=1`} target="_blank" rel="noreferrer">Preview chat ↗</a>
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: 15 }}>How the AI writes</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              <li>Uses only what the customer selected or typed.</li>
              <li>Keeps their sentiment – including Average / Not satisfied.</li>
              <li>Never posts anything; the customer picks stars and posts on Google.</li>
              <li>Every customer gets the same Google button, whatever they choose.</li>
            </ul>
          </div>
        </aside>
      </div>

      <div className="savebar">
        <div className="inner">
          <span className={'msgline ' + (msg?.type || '')}>{msg?.text || (dirty ? 'Unsaved changes' : 'All changes saved')}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link className="btn" href={home}>Dashboard</Link>
            <button className="btn primary" disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KeywordsTab({ form, stats, onChange, onReset }) {
  const kws = form.keywords || [];
  const setK = (i, patch) => onChange(kws.map((k, j) => (j === i ? { ...k, ...patch } : k)));
  const answerGroups = form.questions.map((q) => ({
    id: q.id,
    title: q.prompt?.en || q.id,
    options: q.options.map((o) => ({ key: `${q.id}:${o.id}`, label: o.label?.en || o.id })),
  }));
  return (
    <>
      <div className="alert info">
        These are the search phrases for <b>{form.short_name || form.name}</b>. Every review suggestion includes <b>one</b> of
        them, once – a different one per suggestion (primary first, then services, products and secondary) – written as a
        neutral note for other readers, never as something the customer bought or used, and never stuffed. Customers can
        pick a specific phrase or choose <b>“No search phrase”</b>, and can edit the text before posting. Up to 20 keywords.
      </div>
      {kws.map((k, i) => {
        const restricted = k._restrict || (k.when && k.when.length > 0);
        const uses = stats?.keywords?.[k.text] || 0;
        return (
          <div key={i} className="q-card kw-card">
            <div className="kw-top">
              <input
                type="text"
                className="kw-text"
                value={k.text}
                placeholder="e.g. preschool in Wakad"
                onChange={(e) => setK(i, { text: e.target.value })}
                aria-label="Keyword"
              />
              <select value={k.kind || 'primary'} onChange={(e) => setK(i, { kind: e.target.value })} aria-label="Keyword type" style={{ width: 'auto' }}>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="service">Service</option>
                <option value="product">Product</option>
              </select>
              <label className="switch">
                <input type="checkbox" checked={k.enabled !== false} onChange={(e) => setK(i, { enabled: e.target.checked })} />
                <span>{k.enabled !== false ? 'On' : 'Off'}</span>
              </label>
              <span className="pill" title="Drafts in which the AI used this keyword">{uses} use{uses === 1 ? '' : 's'}</span>
              <button className="icon-btn" title="Delete keyword" onClick={() => onChange(kws.filter((_, j) => j !== i))}>🗑</button>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>When can the AI use it?</label>
              <select
                value={restricted ? 'some' : 'any'}
                onChange={(e) => setK(i, e.target.value === 'any' ? { when: [], _restrict: false } : { _restrict: true })}
              >
                <option value="any">For any customer</option>
                <option value="some">Only when the customer picks certain answers…</option>
              </select>
            </div>
            {restricted && (
              <div className="kw-when">
                {answerGroups.map((g) => (
                  <div key={g.id}>
                    <div className="lang-tag" style={{ margin: '8px 0 4px' }}>{g.title}</div>
                    <div className="kw-opts">
                      {g.options.map((o) => {
                        const on = (k.when || []).includes(o.key);
                        return (
                          <label key={o.key} className={'kw-opt' + (on ? ' on' : '')}>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() =>
                                setK(i, { when: on ? k.when.filter((w) => w !== o.key) : [...(k.when || []), o.key] })
                              }
                            />
                            {o.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          className="btn"
          disabled={kws.length >= 20}
          onClick={() => onChange([...kws, { id: '', text: '', enabled: true, kind: 'primary', when: [] }])}
        >+ Add keyword</button>
        <button className="btn danger" onClick={onReset}>Reset keywords to default</button>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Tip: use phrases people really search, with your area – e.g. “2 BHK flats in Sahakar Nagar”. Google rewards genuine,
        varied reviews, so one natural mention is better than many.
      </p>
    </>
  );
}
