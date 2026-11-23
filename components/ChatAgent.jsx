'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LANGS, RATINGS, T, tr, questionVisible } from '@/lib/i18n';
import { brandVars, initials } from '@/lib/brand';

let _id = 0;
const nid = () => ++_id;

function joinML(items) {
  const out = {};
  for (const k of ['en', 'mr', 'hi']) out[k] = items.map((x) => x[k] || x.en).join(', ');
  return out;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function ChatAgent({ business, preview = false, source = 'link' }) {
  const [lang, setLang] = useState('en');
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState(null);
  const [typing, setTyping] = useState(false);
  const [rating, setRating] = useState(null);
  const [answers, setAnswers] = useState({});
  const [reviewLang, setReviewLang] = useState(null);
  const [details, setDetails] = useState('');
  const [multi, setMulti] = useState([]);
  const [draft, setDraft] = useState('');
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const scrollRef = useRef(null);
  const timers = useRef([]);
  const name = business.short_name || business.name;

  const queue = useMemo(
    () => (rating ? (business.questions || []).filter((q) => questionVisible(q, rating)) : []),
    [rating, business.questions]
  );

  const track = (type, extra = {}) => {
    if (preview) return;
    fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: business.slug, type, ...extra }),
      keepalive: true,
    }).catch(() => {});
  };

  const aiSay = (contents, nextStep, delay = 650) => {
    setStep(null);
    setTyping(true);
    const t = setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, ...contents.map((c) => ({ id: nid(), role: 'ai', content: c }))]);
      setStep(nextStep);
    }, delay);
    timers.current.push(t);
  };
  const userSay = (content) => setMessages((m) => [...m, { id: nid(), role: 'user', content }]);

  const start = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setMessages([]);
    setRating(null);
    setAnswers({});
    setReviewLang(null);
    setDetails('');
    setDraft('');
    setEdited(false);
    setMulti([]);
    aiSay([business.greeting, { ...T.askRating, _vars: { name } }], { type: 'rating' }, 500);
  };

  useEffect(() => {
    const nav = (navigator.language || '').toLowerCase();
    if (nav.startsWith('mr')) setLang('mr');
    else if (nav.startsWith('hi')) setLang('hi');
    track('visit', { source });
    start();
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, step, draft === '']);

  /* ---------------- step handlers ---------------- */
  const askQuestion = (i, q = queue) => {
    if (i < q.length) aiSay([q[i].prompt], { type: 'question', index: i });
    else aiSay([T.askLanguage], { type: 'language' });
  };

  const onRating = (r) => {
    userSay(r.label);
    setRating(r.id);
    const q = (business.questions || []).filter((x) => questionVisible(x, r.id));
    askQuestion(0, q);
  };

  const onSingle = (q, o, i) => {
    userSay(o.label);
    setAnswers((a) => ({ ...a, [q.id]: [o.id] }));
    askQuestion(i + 1);
  };

  const onMultiDone = (q, i) => {
    const chosen = q.options.filter((o) => multi.includes(o.id));
    userSay(joinML(chosen.map((o) => o.label)));
    setAnswers((a) => ({ ...a, [q.id]: chosen.map((o) => o.id) }));
    setMulti([]);
    askQuestion(i + 1);
  };

  const onSkip = (i) => {
    userSay(T.skipped);
    setMulti([]);
    askQuestion(i + 1);
  };

  const onLanguage = (l) => {
    userSay({ en: l.native, mr: l.native, hi: l.native });
    setReviewLang(l.code);
    aiSay([T.askDetails], { type: 'details' });
  };

  const generate = async (mode = 'new', overrides = {}) => {
    const payload = {
      slug: business.slug,
      rating,
      answers,
      language: reviewLang,
      details,
      preview,
      mode,
      previousDraft: mode === 'regenerate' ? draft : undefined,
      ...overrides,
    };
    setBusy(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setDraft(json.draft);
      setEdited(false);
      return true;
    } catch (e) {
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onDetails = async (text) => {
    const clean = text.trim();
    if (clean) userSay({ en: clean, mr: clean, hi: clean });
    else userSay(T.noDetails);
    setDetails(clean);
    setStep(null);
    setTyping(true);
    setMessages((m) => [...m, { id: nid(), role: 'ai', content: T.writing }]);
    const ok = await generate('new', { details: clean });
    setTyping(false);
    if (ok) {
      setMessages((m) => [...m, { id: nid(), role: 'ai', content: T.ready }]);
      setStep({ type: 'done' });
    } else {
      setMessages((m) => [...m, { id: nid(), role: 'ai', content: T.error }]);
      setStep({ type: 'error', details: clean });
    }
  };

  const retry = async () => {
    setStep(null);
    setTyping(true);
    const ok = await generate('new');
    setTyping(false);
    if (ok) {
      setMessages((m) => [...m, { id: nid(), role: 'ai', content: T.ready }]);
      setStep({ type: 'done' });
    } else setStep({ type: 'error' });
  };

  const regenerate = async () => {
    if (edited && !window.confirm(tr(T.confirmRegenerate, lang))) return;
    await generate('regenerate');
  };

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const onCopy = async () => {
    if (await copyText(draft)) {
      flash(tr(T.copied, lang));
      track('copy', { language: reviewLang });
    }
  };

  const onGoogle = () => {
    copyText(draft);
    track('google_open', { language: reviewLang });
    flash(tr(T.googleHint, lang));
  };

  /* ---------------- render ---------------- */
  const render = (c) => tr(c, lang, c?._vars || {});
  const q = step?.type === 'question' ? queue[step.index] : null;

  return (
    <div className="chat-shell" style={brandVars(business)}>
      <header className="chat-header">
        <div className="brand">
          {business.logo_url ? (
            <img className="avatar img" src={business.logo_url} alt="" />
          ) : (
            <div className="avatar">{initials(name)}</div>
          )}
          <div className="brand-text">
            <div className="brand-name">{name}</div>
            <div className="brand-sub">
              <span className="dot" /> {tr(T.online, lang)}
            </div>
          </div>
        </div>
        <div className="lang-switch" role="group" aria-label="Language">
          {LANGS.map((l) => (
            <button
              key={l.code}
              className={lang === l.code ? 'on' : ''}
              onClick={() => setLang(l.code)}
              aria-pressed={lang === l.code}
            >
              {l.code === 'en' ? 'EN' : l.native}
            </button>
          ))}
        </div>
      </header>

      {preview && <div className="preview-bar">{tr(T.preview, lang)}</div>}

      <main className="chat-scroll" ref={scrollRef}>
        <div className="chat-inner">
          {messages.map((m) => (
            <div key={m.id} className={'msg ' + m.role}>
              {m.role === 'ai' && <div className="mini-avatar">{initials(name)}</div>}
              <div className="bubble">{render(m.content)}</div>
            </div>
          ))}

          {typing && (
            <div className="msg ai">
              <div className="mini-avatar">{initials(name)}</div>
              <div className="bubble typing" aria-label="typing">
                <span /> <span /> <span />
              </div>
            </div>
          )}

          {step?.type === 'done' && (
            <div className="draft-card">
              <label htmlFor="draft">{tr(T.yourReview, lang)}</label>
              <textarea
                id="draft"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setEdited(true);
                }}
                rows={7}
                disabled={busy}
              />
              <div className="draft-meta">{draft.trim().split(/\s+/).filter(Boolean).length} {tr(T.words, lang)}</div>
              <div className="draft-actions">
                <button className="btn ghost" onClick={onCopy} disabled={busy || !draft.trim()}>
                  {tr(T.copy, lang)}
                </button>
                <button className="btn ghost" onClick={regenerate} disabled={busy}>
                  {busy ? '…' : tr(T.regenerate, lang)}
                </button>
              </div>
              {business.google_review_url ? (
                <a
                  className={'btn primary block' + (!draft.trim() ? ' disabled' : '')}
                  href={business.google_review_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onGoogle}
                >
                  ★ {tr(T.openGoogle, lang)}
                </a>
              ) : (
                <p className="note warn">{tr(T.noGoogleLink, lang)}</p>
              )}
              <p className="note">{tr(T.thanks, lang)}</p>
              <button className="link-btn" onClick={start}>
                ↺ {tr(T.startOver, lang)}
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="composer">
        {step?.type === 'rating' && (
          <div className="options grid2">
            {RATINGS.map((r) => (
              <button key={r.id} className="chip big" onClick={() => onRating(r)}>
                <span className="emoji">{r.emoji}</span> {tr(r.label, lang)}
              </button>
            ))}
          </div>
        )}

        {q && q.type === 'single' && (
          <div className="options">
            {q.options.map((o) => (
              <button key={o.id} className="chip" onClick={() => onSingle(q, o, step.index)}>
                {tr(o.label, lang)}
              </button>
            ))}
            {q.optional && (
              <button className="chip subtle" onClick={() => onSkip(step.index)}>
                {tr(T.skip, lang)}
              </button>
            )}
          </div>
        )}

        {q && q.type === 'multi' && (
          <>
            <div className="options">
              {q.options.map((o) => {
                const on = multi.includes(o.id);
                return (
                  <button
                    key={o.id}
                    className={'chip' + (on ? ' selected' : '')}
                    aria-pressed={on}
                    onClick={() => setMulti((m) => (on ? m.filter((x) => x !== o.id) : [...m, o.id]))}
                  >
                    {on ? '✓ ' : ''}
                    {tr(o.label, lang)}
                  </button>
                );
              })}
            </div>
            <div className="composer-actions">
              {q.optional && (
                <button className="btn ghost" onClick={() => onSkip(step.index)}>
                  {tr(T.skip, lang)}
                </button>
              )}
              <button className="btn primary" disabled={!multi.length} onClick={() => onMultiDone(q, step.index)}>
                {tr(T.continue, lang)} →
              </button>
            </div>
          </>
        )}

        {step?.type === 'language' && (
          <div className="options grid3">
            {LANGS.map((l) => (
              <button key={l.code} className="chip big" onClick={() => onLanguage(l)}>
                {l.native}
              </button>
            ))}
          </div>
        )}

        {step?.type === 'details' && <DetailsBox lang={lang} onDone={onDetails} />}

        {step?.type === 'error' && (
          <div className="composer-actions">
            <button className="btn primary" onClick={retry}>
              {tr(T.tryAgain, lang)}
            </button>
          </div>
        )}

        {toast && <div className="toast" role="status">{toast}</div>}
        <p className="fineprint">{tr(T.footer, lang)}</p>
      </footer>
    </div>
  );
}

function DetailsBox({ lang, onDone }) {
  const [text, setText] = useState('');
  return (
    <div className="details-box">
      <textarea
        value={text}
        maxLength={300}
        rows={2}
        placeholder={tr(T.detailsPlaceholder, lang)}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="composer-actions">
        <button className="btn ghost" onClick={() => onDone('')}>
          {tr(T.noDetails, lang)}
        </button>
        <button className="btn primary" disabled={!text.trim()} onClick={() => onDone(text)}>
          {tr(T.add, lang)} →
        </button>
      </div>
    </div>
  );
}
