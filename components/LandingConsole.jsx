'use client';

import { useState } from 'react';

const TABS = [
  {
    id: 'analytics',
    label: 'Live Analytics',
    title: 'See every scan turn into a review',
    text: 'Your own dashboard shows QR scans, AI drafts, copied reviews and Google opens, day by day. Know exactly how your counter card is performing.',
    points: ['14-day visit chart', 'Full review funnel', 'Ratings & language mix'],
  },
  {
    id: 'poster',
    label: 'QR Poster Studio',
    title: 'Print-ready posters in one click',
    text: 'Download a branded poster for tables and counters, a high-resolution QR for your designer, or simply share the link on WhatsApp.',
    points: ['Your logo & colours', 'PNG and SVG files', 'Link never changes'],
  },
  {
    id: 'draft',
    label: 'AI Draft Assistant',
    title: 'Natural reviews, in their own words',
    text: 'The AI writes from the customer’s own taps and words, in English, Marathi or Hindi. They can edit it or ask for fresh wording anytime.',
    points: ['Honest to every rating', 'Your key services mentioned naturally', '“New wording” in one tap'],
  },
  {
    id: 'settings',
    label: 'Easy Settings',
    title: 'Change questions without calling anyone',
    text: 'Edit greetings, tap-to-answer options and SEO phrases yourself. Preview the customer chat before it goes live.',
    points: ['Questions in 3 languages', 'Up to 8 SEO keywords', 'Live chat preview'],
  },
];

function Panel({ id }) {
  if (id === 'analytics')
    return (
      <div className="cs-mock">
        <div className="cs-mock-head"><b>This week</b><span className="cs-up">▲ Growing</span></div>
        <div className="cs-kpis">
          <div><small>QR scans</small><b>214</b></div>
          <div><small>AI drafts</small><b>168</b></div>
          <div className="hl"><small>To Google</small><b>131</b></div>
        </div>
        <div className="cs-bars" aria-hidden="true">
          {[30, 45, 38, 60, 52, 70, 88].map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}
        </div>
        <p className="cs-note">Sample numbers for illustration</p>
      </div>
    );
  if (id === 'poster')
    return (
      <div className="cs-mock cs-poster">
        <div className="cs-poster-card">
          <span className="cs-poster-logo">YB</span>
          <b>Loved your visit?</b>
          <small>Scan to share a quick Google review</small>
          <div className="cs-qr" aria-hidden="true">
            {Array.from({ length: 25 }).map((_, i) => <i key={i} className={(i * 3 + (i % 4)) % 2 ? 'on' : ''} />)}
          </div>
          <span className="cs-stars">★★★★★</span>
        </div>
      </div>
    );
  if (id === 'draft')
    return (
      <div className="cs-mock">
        <p className="cs-label">✨ AI draft · English</p>
        <div className="cs-draft">“Lovely experience! The staff were warm and patient, and the service was quick. Will surely visit again.”</div>
        <p className="cs-label">✨ AI draft · मराठी</p>
        <div className="cs-draft">“खूप छान अनुभव! स्टाफ मनमिळाऊ होता आणि सेवा जलद मिळाली. पुन्हा नक्की येईन.”</div>
      </div>
    );
  return (
    <div className="cs-mock">
      <p className="cs-label">Question</p>
      <div className="cs-input">What did you like most?</div>
      <p className="cs-label">Answer options</p>
      <div className="cs-tags">
        {['Friendly staff', 'Quick service', 'Great value', 'Clean place', '+ Add'].map((t) => <span key={t}>{t}</span>)}
      </div>
      <div className="cs-save">✓ Saved · Live on your QR</div>
    </div>
  );
}

export default function LandingConsole() {
  const [tab, setTab] = useState(TABS[0].id);
  const t = TABS.find((x) => x.id === tab);
  return (
    <div className="cs">
      <div className="cs-tabs" role="tablist" aria-label="Dashboard features">
        {TABS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === tab} className={x.id === tab ? 'on' : ''} onClick={() => setTab(x.id)}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="cs-body" role="tabpanel" key={tab}>
        <div className="cs-copy">
          <h3>{t.title}</h3>
          <p>{t.text}</p>
          <ul>{t.points.map((p) => <li key={p}><span>✓</span>{p}</li>)}</ul>
        </div>
        <Panel id={tab} />
      </div>
    </div>
  );
}
