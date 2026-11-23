'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { initials } from '@/lib/brand';
import { reviewUrl, qrPng, qrSvg, posterPng, download, setPublicBase, testQrPng } from '@/lib/qr-client';
import { PublicUrlAlert, LiveStatus, ReviewRequest } from '@/components/ReviewTools';
import { FeedbackView, RepliesView, ReportsView, CampaignQr } from '@/components/OwnerInsights';

const RATING_LABELS = { excellent: 'Excellent', good: 'Good', average: 'Average', not_satisfied: 'Not satisfied' };
const RATING_EMOJI = { excellent: '😍', good: '🙂', average: '😐', not_satisfied: '🙁' };
const LANG_LABELS = { en: 'English', mr: 'मराठी (Marathi)', hi: 'हिंदी (Hindi)' };

function Icon({ d, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  );
}
const I = {
  star: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  qr: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" />,
  store: <path d="M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6" />,
  chat: <path d="M4 5h16v10H8l-4 4zM8 9h8M8 12h5" />,
  tag: <path d="M3 12V3h9l9 9-9 9zM7.5 7.5h.01" />,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  out: <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  pulse: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  scan: <path d="M3 7V3h4M17 3h4v4M21 17v4h-4M7 21H3v-4M7 12h10" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></>,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  google: <path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5a4.3 4.3 0 0 1-1.9 2.8v2.3h3A9 9 0 0 0 21 12.2zM12 21a8.9 8.9 0 0 0 6.1-2.2l-3-2.3a5.5 5.5 0 0 1-8.2-2.9H3.8v2.4A9 9 0 0 0 12 21zM6.9 13.6a5.4 5.4 0 0 1 0-3.4V7.8H3.8a9 9 0 0 0 0 8.2zM12 6.6a4.9 4.9 0 0 1 3.4 1.3L18 5.3A8.6 8.6 0 0 0 12 3a9 9 0 0 0-8.2 4.8l3.1 2.4A5.4 5.4 0 0 1 12 6.6z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
};

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const fmtDay = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function OwnerDashboard({ adminSlug = '' }) {
  const q = adminSlug ? `?b=${encodeURIComponent(adminSlug)}` : '';
  const amp = adminSlug ? `&b=${encodeURIComponent(adminSlug)}` : '';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('overview');
  const [navOpen, setNavOpen] = useState(false);
  const [replyPrefill, setReplyPrefill] = useState(null); // feedback item to draft a reply for

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/owner/business' + q, { cache: 'no-store' });
      if (res.status === 401) return (window.location.href = adminSlug ? '/admin/login' : '/login');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error || 'Could not load your dashboard.');
      else {
        setPublicBase(json.publicBase); // customer links always use the live address
        setData(json);
      }
    })();
    const v = new URLSearchParams(window.location.search).get('view');
    if (['overview', 'analytics', 'feedback', 'replies', 'reports', 'qr', 'request', 'account'].includes(v)) setView(v);
  }, [q, adminSlug]);

  const go = (v) => {
    setView(v);
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const logout = async () => {
    if (adminSlug) return (window.location.href = '/admin');
    await fetch('/api/owner/logout', { method: 'POST' });
    window.location.href = '/login?notice=loggedout';
  };

  if (error) return <div className="od-loading"><div className="alert warn">{error}</div></div>;
  if (!data) return <div className="od-loading"><span className="od-spinner" /> Loading your dashboard…</div>;

  const { business: b, stats: s, daily, role, owner } = data;
  const name = b.short_name || b.name;
  const settings = (tab) => `/dashboard/settings?tab=${tab}${amp}`;
  const who = owner?.name || 'Administrator';

  const NavBtn = ({ id, icon, children, badge }) => (
    <button type="button" className={'od-nav-item' + (view === id ? ' on' : '')} onClick={() => go(id)}>
      <span className="od-nav-ic"><Icon d={icon} size={18} /></span>{children}
      {badge && <span className="od-badge">{badge}</span>}
    </button>
  );
  const NavLink = ({ href, icon, children }) => (
    <Link className="od-nav-item" href={href}><span className="od-nav-ic"><Icon d={icon} size={18} /></span>{children}</Link>
  );

  return (
    <div className="od">
      {/* ---------------- sidebar ---------------- */}
      <aside className={'od-side' + (navOpen ? ' open' : '')}>
        <div className="od-brand">
          <span className="od-brand-mark"><Icon d={I.star} size={20} /></span>
          <span>
            <b>Smart Review</b>
            <small>Business console</small>
          </span>
          <button type="button" className="od-close" onClick={() => setNavOpen(false)} aria-label="Close menu"><Icon d={I.x} /></button>
        </div>

        <nav className="od-nav" aria-label="Dashboard">
          <p className="od-nav-h">Overview</p>
          <NavBtn id="overview" icon={I.grid}>Dashboard</NavBtn>
          <NavBtn id="analytics" icon={I.chart}>Analytics</NavBtn>
          <NavBtn id="feedback" icon={I.star}>Customer Feedback</NavBtn>
          <NavBtn id="replies" icon={I.spark}>Reply Assistant</NavBtn>
          <NavBtn id="reports" icon={I.pulse}>Monthly Reports</NavBtn>

          <p className="od-nav-h">Growth tools</p>
          <NavBtn id="qr" icon={I.qr}>Review QR</NavBtn>
          <NavBtn id="request" icon={I.chat}>Send Review Request</NavBtn>
          <NavLink href={settings('details')} icon={I.store}>Business Details</NavLink>
          <NavLink href={settings('questions')} icon={I.chat}>Questions &amp; Answers</NavLink>
          <NavLink href={settings('keywords')} icon={I.tag}>SEO Keywords</NavLink>
          <NavLink href={settings('preview')} icon={I.eye}>Preview Chat</NavLink>

          <p className="od-nav-h">Account</p>
          {role === 'owner' && <NavBtn id="account" icon={I.lock}>Account &amp; Password</NavBtn>}
        </nav>

        <div className="od-user">
          <span className="od-user-av">{initials(who)}</span>
          <span className="od-user-txt">
            <b>{who}</b>
            <small>{role === 'admin' ? 'Admin view' : 'Business owner'}</small>
          </span>
        </div>
        <button type="button" className="od-signout" onClick={logout}>
          <Icon d={I.out} size={17} /> {role === 'admin' ? 'Back to admin' : 'Sign out'}
        </button>
      </aside>
      {navOpen && <div className="od-scrim" onClick={() => setNavOpen(false)} />}

      {/* ---------------- main ---------------- */}
      <main className="od-main">
        <div className="od-mobilebar">
          <button type="button" onClick={() => setNavOpen(true)} aria-label="Open menu"><Icon d={I.menu} /></button>
          <b>{name}</b>
        </div>

        {role === 'admin' && (
          <div className="od-adminbar">
            <span>👁 You are viewing <b>{name}</b>’s dashboard as the administrator.</span>
            <Link href="/admin">← All businesses</Link>
          </div>
        )}

        <header className="od-head">
          <span className="od-head-av" style={{ background: b.primary_color || '#1f7a3a' }}>
            {b.logo_url ? <img src={b.logo_url} alt="" /> : initials(name)}
            <i className={b.google_review_url ? 'ok' : ''} />
          </span>
          <div className="od-head-txt">
            <h1>
              {b.name}
              {b.google_review_url ? <span className="od-live">● Live</span> : <span className="od-setup">Setup needed</span>}
            </h1>
            {(b.location || b.category) && (
              <p><Icon d={I.pin} size={15} /> {[b.category, b.location].filter(Boolean).join(' · ')}</p>
            )}
          </div>
          <div className="od-head-cta">
            <div className="od-funnel-pill">
              <span className="od-funnel-ic"><Icon d={I.pulse} size={17} /></span>
              <span><small>Review funnel</small><b>{b.google_review_url ? 'Active & ready' : 'Add Google link'}</b></span>
            </div>
            <button type="button" className="od-btn-green" onClick={() => go('qr')}>
              <span><b>Manage QR tools</b><small>Poster, QR code &amp; link</small></span>
              <span className="od-btn-arrow"><Icon d={I.arrow} size={16} /></span>
            </button>
          </div>
        </header>

        {view === 'overview' && <Overview b={b} s={s} daily={daily} settings={settings} go={go} />}
        {view === 'analytics' && <Analytics b={b} s={s} daily={daily} />}
        {view === 'feedback' && <FeedbackView adminSlug={adminSlug} onReply={(f) => { setReplyPrefill(f); go('replies'); }} />}
        {view === 'replies' && <RepliesView adminSlug={adminSlug} business={b} prefill={replyPrefill} />}
        {view === 'reports' && <ReportsView adminSlug={adminSlug} />}
        {view === 'qr' && <QrView b={b} settings={settings} problem={data.publicBaseProblem} adminSlug={adminSlug} testBase={data.testBase} />}
        {view === 'qr' && data.publicBase && <CampaignQr business={b} />}
        {view === 'request' && (
          <section className="od-card">
            <h3 className="od-h3">Send a review request</h3>
            <p className="od-sub">Send a customer a ready-made WhatsApp or SMS message with your review link. It opens straight on their phone.</p>
            <PublicUrlAlert problem={data.publicBaseProblem} />
            <LiveStatus slug={b.slug} adminSlug={adminSlug} />
            <ReviewRequest business={b} adminSlug={adminSlug} />
          </section>
        )}
        {view === 'account' && role === 'owner' && <Account owner={owner} />}

        <p className="od-foot">
          🔒 Private to your business. Customer feedback (stars, highlights and the review text they kept) is visible only
          to you and the administrator. No customer names or phone numbers are collected, and every review is posted by
          the customer from their own Google account.
        </p>
      </main>
    </div>
  );
}

/* ================================ overview ================================ */
function Overview({ b, s, daily, settings, go }) {
  const steps = [
    { done: Boolean(b.google_review_url), icon: I.google, title: 'Google review link', text: 'Connect your public Google “write a review” link.', href: settings('details') },
    { done: Boolean(b.category && b.location), icon: I.store, title: 'Business details', text: 'Add your category and area so reviews sound local.', href: settings('details') },
    { done: (b.keywords || []).some((k) => k.enabled !== false), icon: I.tag, title: 'SEO keywords', text: 'Up to 8 search phrases the AI can mention naturally.', href: settings('keywords') },
    { done: (b.questions || []).length >= 2, icon: I.chat, title: 'Questions & answers', text: 'Tap-to-answer options customers pick from.', href: settings('questions') },
    { done: Boolean(b.logo_url), icon: I.star, title: 'Logo & colours', text: 'Show your brand on the customer chat and poster.', href: settings('details') },
  ];
  const done = steps.filter((x) => x.done).length;

  return (
    <>
      {done < steps.length && (
        <section className="od-card od-setupcard">
          <div className="od-setup-head">
            <span className="od-rocket">🚀</span>
            <div>
              <h2>Quick setup steps <span className="od-chip">{done} of {steps.length} completed ({pct(done, steps.length)}%)</span></h2>
              <p>Finish these to get the most reviews from every scan.</p>
            </div>
            <div className="od-progress" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={steps.length}>
              <i style={{ width: `${pct(done, steps.length)}%` }} />
            </div>
          </div>
          <div className="od-steps">
            {steps.map((st) => (
              <Link key={st.title} href={st.href} className="od-step">
                <div className="od-step-top">
                  <span className="od-step-ic"><Icon d={st.icon} size={19} /></span>
                  {st.done ? <span className="od-done">✓ Done</span> : <span className="od-todo">○ Needs setup</span>}
                </div>
                <b>{st.title}</b>
                <small>{st.text}</small>
                <span className="od-step-go">{st.done ? 'Edit settings' : 'Set up now'} <span>→</span></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="od-stats">
        <Stat icon={I.scan} label="QR scans" value={s.qr_scans} sub={`${s.visits} total visits`} />
        <Stat icon={I.users} label="Visits (7 days)" value={s.visits_7d} sub="Customers who opened the chat" />
        <Stat icon={I.spark} label="Review drafts" value={s.drafts} sub={`${s.drafts_7d} in the last 7 days`} />
        <Stat icon={I.copy} label="Reviews copied" value={s.copies} sub={`${s.requests || 0} requests sent by WhatsApp/SMS`} />
        <Stat icon={I.google} label="Review link clicks" value={s.google_opens} sub={`${pct(s.google_opens, s.visits)}% of visits`} accent />
      </section>

      <div className="od-two">
        <Funnel s={s} />
        <DailyChart daily={daily} />
      </div>

      <section className="od-card od-guide">
        <span className="od-rocket">🐢</span>
        <div>
          <h2>Slow &amp; steady wins the review game <span className="od-chip">Smart growth</span></h2>
          <p>
            Ask every customer at the right moment: at billing, after a happy conversation, or on handover. A few genuine
            reviews every week look more trustworthy to Google and to new customers than a sudden burst.
          </p>
          <button type="button" className="od-link" onClick={() => go('analytics')}>See full analytics →</button>
        </div>
      </section>
    </>
  );
}

function Stat({ icon, label, value, sub, accent }) {
  return (
    <div className={'od-stat' + (accent ? ' accent' : '')}>
      <div className="od-stat-top"><span className="od-stat-ic"><Icon d={icon} size={18} /></span>{label}</div>
      <b>{Number(value || 0).toLocaleString('en-IN')}</b>
      <small>{sub}</small>
    </div>
  );
}

function Funnel({ s }) {
  const rows = [
    ['Opened the chat', s.visits],
    ['Got an AI draft', s.drafts],
    ['Copied the review', s.copies],
    ['Opened Google', s.google_opens],
  ];
  const max = Math.max(1, s.visits);
  return (
    <section className="od-card">
      <h3 className="od-h3">Review funnel</h3>
      <p className="od-sub">How many customers reach each step (all time).</p>
      <div className="od-bars">
        {rows.map(([label, v], i) => (
          <div key={label} className="od-bar-row" title={`${label}: ${v}${i ? ` (${pct(v, s.visits)}% of visits)` : ''}`}>
            <span className="od-bar-label">{label}</span>
            <span className="od-bar-track"><i style={{ width: `${(v / max) * 100}%` }} /></span>
            <span className="od-bar-val">{v}{i > 0 && <small> · {pct(v, s.visits)}%</small>}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DailyChart({ daily, big }) {
  const max = Math.max(1, ...daily.map((d) => d.visits));
  const total = daily.reduce((a, d) => a + d.visits, 0);
  return (
    <section className="od-card">
      <h3 className="od-h3">Customer visits, last 14 days</h3>
      <p className="od-sub">{total} visits · hover a day for details</p>
      {daily.length ? (
        <div className={'od-cols' + (big ? ' big' : '')} role="img" aria-label={`Daily visits for the last ${daily.length} days`}>
          {daily.map((d) => (
            <div key={d.date} className="od-col" tabIndex={0}>
              <span className="od-col-bar" style={{ height: `${(d.visits / max) * 100}%` }} />
              <span className="od-tip">
                <b>{fmtDay(d.date)}</b>
                {d.visits} visits · {d.drafts} drafts · {d.google_opens} to Google
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="od-sub">No data yet.</p>
      )}
      {daily.length > 0 && (
        <div className="od-cols-axis"><span>{fmtDay(daily[0].date)}</span><span>Today</span></div>
      )}
    </section>
  );
}

function SplitBars({ title, sub, entries }) {
  const total = entries.reduce((a, [, , v]) => a + v, 0);
  const max = Math.max(1, ...entries.map(([, , v]) => v));
  return (
    <section className="od-card">
      <h3 className="od-h3">{title}</h3>
      <p className="od-sub">{sub}</p>
      <div className="od-bars">
        {entries.map(([key, label, v]) => (
          <div key={key} className="od-bar-row" title={`${label}: ${v} (${pct(v, total)}%)`}>
            <span className="od-bar-label">{label}</span>
            <span className="od-bar-track"><i style={{ width: `${(v / max) * 100}%` }} /></span>
            <span className="od-bar-val">{v}<small> · {pct(v, total)}%</small></span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ================================ analytics ================================ */
function Analytics({ b, s, daily }) {
  const kw = (b.keywords || []).map((k) => [k.text, k.text, s.keywords?.[k.text] || 0]);
  return (
    <>
      <section className="od-stats">
        <Stat icon={I.scan} label="QR scans" value={s.qr_scans} sub="All time" />
        <Stat icon={I.users} label="All visits" value={s.visits} sub={`${s.visits_7d} in 7 days`} />
        <Stat icon={I.spark} label="AI drafts" value={s.ai_drafts} sub={`${s.drafts} drafts in total`} />
        <Stat icon={I.chat} label="New wordings" value={s.regenerations} sub="Times customers asked to reword" />
        <Stat icon={I.google} label="Review link clicks" value={s.google_opens} sub={`${pct(s.google_opens, s.drafts)}% of drafts`} accent />
      </section>
      <DailyChart daily={daily} big />
      <div className="od-two">
        <Funnel s={s} />
        <SplitBars
          title="How customers rated their visit"
          sub="Chosen in the chat before the draft is written."
          entries={Object.entries(s.ratings).map(([k, v]) => [k, `${RATING_EMOJI[k]} ${RATING_LABELS[k]}`, v])}
        />
      </div>
      <div className="od-two">
        <SplitBars
          title="Review language"
          sub="Language of each draft."
          entries={Object.entries(s.languages).map(([k, v]) => [k, LANG_LABELS[k], v])}
        />
        {kw.length ? (
          <SplitBars title="SEO keyword usage" sub="Drafts in which the AI used each keyword." entries={kw} />
        ) : (
          <section className="od-card">
            <h3 className="od-h3">SEO keyword usage</h3>
            <p className="od-sub">No keywords yet. Add a few in SEO Keywords to see how often they appear.</p>
          </section>
        )}
      </div>
      <section className="od-card">
        <h3 className="od-h3">Daily report</h3>
        <div className="table-wrap">
          <table className="stats od-table">
            <thead><tr><th>Date</th><th>Visits</th><th>Drafts</th><th>Opened Google</th></tr></thead>
            <tbody>
              {[...daily].reverse().map((d) => (
                <tr key={d.date}><td>{fmtDay(d.date)}</td><td>{d.visits}</td><td>{d.drafts}</td><td>{d.google_opens}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ================================ QR ================================ */
function QrView({ b, settings, problem, adminSlug, testBase }) {
  const [img, setImg] = useState('');
  const [testImg, setTestImg] = useState('');
  const [note, setNote] = useState('');
  const [live, setLive] = useState(null);
  const url = reviewUrl(b.slug); // always the live address ('' if not configured)
  const testUrl = testBase ? `${testBase}/review/${b.slug}` : '';
  useEffect(() => {
    if (url) qrPng(url, 600).then(setImg).catch(() => setImg(''));
  }, [url]);
  useEffect(() => {
    if (testUrl) testQrPng(testUrl, 400).then(setTestImg).catch(() => setTestImg(''));
  }, [testUrl]);
  if (!url) return <section className="od-card"><PublicUrlAlert problem={problem} /></section>;
  const broken = live?.status === 'bad' && live.notFound;
  return (
    <>
    {broken && (
      <div className="alert warn od-qr-broken" role="alert">
        <b>⚠️ Don’t print this QR code yet: it currently opens a “404 – page not found” on the live site.</b>
        <p style={{ margin: '6px 0 0' }}>{live.reason}</p>
        {testUrl && <p style={{ margin: '6px 0 0' }}>Meanwhile you can test the review page on your phone with the <b>Wi-Fi test QR</b> below.</p>}
      </div>
    )}
    <div className="od-two od-qr">
      <section className={'od-card od-qr-card' + (broken ? ' od-qr-dim' : '')}>
        {img && <img src={img} alt={`Review QR code for ${b.short_name || b.name}`} />}
        <code>{url}</code>
        <p className="od-sub">This link never changes, so printed QR codes keep working after you edit anything.</p>
      </section>
      <section className="od-card">
        <h3 className="od-h3">Download &amp; share</h3>
        <LiveStatus slug={b.slug} adminSlug={adminSlug} onResult={setLive} />
        {!b.google_review_url && (
          <div className="alert warn">Add your Google review link in <Link href={settings('details')}>Business Details</Link> before printing.</div>
        )}
        <div className="od-qr-actions">
          <button className="od-action" onClick={async () => download(await posterPng(b, url), `${b.slug}-review-qr-poster.png`)}>
            <b>🖼 Printable poster (PNG)</b><small>Ready for a table stand or counter</small>
          </button>
          <button className="od-action" onClick={async () => download(await qrPng(url, 2048), `${b.slug}-review-qr.png`)}>
            <b>⬇ QR code only (high-res PNG)</b><small>2048 × 2048 px</small>
          </button>
          <button className="od-action" onClick={async () => download('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(await qrSvg(url)), `${b.slug}-review-qr.svg`)}>
            <b>✏️ QR code (SVG)</b><small>For your print designer</small>
          </button>
          <button className="od-action" onClick={() => navigator.clipboard.writeText(reviewUrl(b.slug, 'link')).then(() => setNote('Link copied ✓'))}>
            <b>🔗 Copy review link</b><small>{note || 'Share on WhatsApp, SMS or email'}</small>
          </button>
        </div>
      </section>
    </div>
    {testUrl && (
      <section className="od-card od-qr-test">
        {testImg && <img src={testImg} alt="Wi-Fi test QR code (testing only)" />}
        <div>
          <h3 className="od-h3">📱 Test on your phone now <span className="od-setup">testing only · do not print</span></h3>
          <p className="od-sub">
            This QR opens the review page running on <b>this computer</b>. It works only for a phone on the <b>same Wi-Fi</b>
            while this computer is on. Customers must use the QR code above.
          </p>
          <code>{testUrl}</code>
          <p className="od-sub" style={{ marginTop: 6 }}>Doesn’t open? Allow Node.js through the Windows Firewall (private networks) when Windows asks.</p>
        </div>
      </section>
    )}
    </>
  );
}

/* ================================ account ================================ */
function Account({ owner }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) return setMsg({ type: 'err', text: 'The new passwords do not match.' });
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/owner/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current: form.current, next: form.next }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ type: 'err', text: json.error || 'Could not change password.' });
    setForm({ current: '', next: '', confirm: '' });
    setMsg({ type: 'ok', text: 'Password changed ✓ Other devices have been signed out.' });
  };
  return (
    <div className="od-two">
      <section className="od-card">
        <h3 className="od-h3">Your account</h3>
        <dl className="od-dl">
          <dt>Name</dt><dd>{owner?.name}</dd>
          <dt>Email</dt><dd>{owner?.email}</dd>
          <dt>Role</dt><dd>Business owner</dd>
        </dl>
        <p className="od-sub">To change your name or email, contact your administrator.</p>
      </section>
      <section className="od-card">
        <h3 className="od-h3">Change password</h3>
        <form onSubmit={submit} className="od-form">
          <label>Current password<input type="password" autoComplete="current-password" value={form.current} onChange={set('current')} required /></label>
          <label>New password<input type="password" autoComplete="new-password" value={form.next} onChange={set('next')} required minLength={8} /></label>
          <label>Confirm new password<input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required minLength={8} /></label>
          <small className="od-sub">At least 8 characters, with letters and numbers.</small>
          {msg && <p className={'msgline ' + msg.type}>{msg.text}</p>}
          <button className="od-btn-solid" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
        </form>
      </section>
    </div>
  );
}
