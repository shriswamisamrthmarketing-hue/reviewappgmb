'use client';

// Optional spoken guidance for the customer review funnel.
// Uses only the browser's built-in SpeechSynthesis API (free, on-device; no external service).
// If the browser has no speech support, nothing is shown and the funnel works exactly as before.
// It only reads the funnel's state; it never changes it.
import { useCallback, useEffect, useRef, useState } from 'react';

const SAY = {
  rate: {
    en: 'Welcome to {n}. Please rate your experience by tapping one to five stars. One star means very poor, and five stars means excellent. Every honest rating is welcome.',
    hi: '{n} में आपका स्वागत है. कृपया एक से पाँच स्टार पर टैप करके अपना अनुभव बताइए. एक स्टार यानी बहुत खराब, और पाँच स्टार यानी बहुत बढ़िया. हर सच्ची रेटिंग का स्वागत है.',
    mr: '{n} मध्ये तुमचं स्वागत आहे. एक ते पाच स्टार्सवर टॅप करून तुमचा अनुभव सांगा. एक स्टार म्हणजे खूप वाईट, आणि पाच स्टार्स म्हणजे उत्कृष्ट. प्रत्येक प्रामाणिक रेटिंगचं स्वागत आहे.',
  },
  exp: {
    en: 'Thank you. Now pick the highlights that match your experience. You can add a few words of your own, and choose the review language and writing style. Then tap, Write my review. Or tap, I will write it myself.',
    hi: 'धन्यवाद. अब जो बातें आपके अनुभव से मेल खाती हैं, उन्हें चुनिए. चाहें तो अपने शब्दों में कुछ जोड़ें, और रिव्यू की भाषा और लिखने का अंदाज़ चुनें. फिर, मेरा रिव्यू लिखें, बटन दबाइए. या, खुद लिखना है, पर टैप कीजिए.',
    mr: 'धन्यवाद. आता तुमच्या अनुभवाशी जुळणाऱ्या गोष्टी निवडा. हवं असल्यास तुमच्या शब्दांत काही जोडा, आणि रिव्ह्यूची भाषा व लेखनशैली निवडा. मग, माझा रिव्ह्यू लिहा, हे बटण दाबा. किंवा, मी स्वतः लिहीन, वर टॅप करा.',
  },
  drafts: {
    en: 'Review suggestions for your rating are ready. Tap a suggestion to copy it and open Google, where you choose your own stars. To add your own words first, tap, Edit first. For different suggestions, tap, Refresh. You can also add your own experience in your own words, and tap, Update suggestions.',
    hi: 'आपकी रेटिंग के लिए रिव्यू सुझाव तैयार हैं. किसी सुझाव पर टैप करें, वह कॉपी होगा और Google खुलेगा, जहाँ आप अपनी स्टार रेटिंग खुद चुनेंगे. पहले अपने शब्द जोड़ने के लिए, पहले बदलें, दबाएँ. दूसरे सुझावों के लिए, नए सुझाव, पर टैप करें. चाहें तो अपना अनुभव अपने शब्दों में जोड़ें, और, सुझाव अपडेट करें, दबाएँ.',
    mr: 'तुमच्या रेटिंगसाठी रिव्ह्यू सूचना तयार आहेत. एखाद्या सूचनेवर टॅप करा, ती कॉपी होईल आणि Google उघडेल, जिथे तुम्ही तुमचे स्टार्स स्वतः निवडाल. आधी तुमचे शब्द जोडण्यासाठी, आधी बदला, दाबा. वेगळ्या सूचनांसाठी, नवीन सूचना, वर टॅप करा. हवं तर तुमचा अनुभव तुमच्या शब्दांत जोडा, आणि, सूचना अपडेट करा, दाबा.',
  },
  edit: {
    en: 'Now make the review yours. Change any words you like in the box. Post it only if it reflects your genuine experience. You can tap Copy to copy it. When you are ready, tap, Continue to Google.',
    hi: 'अब इस रिव्यू को अपना बनाइए. बॉक्स में जो चाहें बदलें. तभी पोस्ट करें जब यह आपका सच्चा अनुभव हो. कॉपी करने के लिए कॉपी बटन दबाएँ. तैयार होने पर, Google पर आगे बढ़ें, दबाइए.',
    mr: 'आता हा रिव्ह्यू तुमचा बनवा. बॉक्समध्ये हवं ते बदला. हा तुमचा खरा अनुभव असेल तरच पोस्ट करा. कॉपी करण्यासाठी कॉपी बटण दाबा. तयार झाल्यावर, Google वर पुढे जा, दाबा.',
  },
  editManual: {
    en: 'Please write your review in your own words in the box. When you are ready, tap, Continue to Google.',
    hi: 'कृपया बॉक्स में अपना रिव्यू अपने शब्दों में लिखिए. तैयार होने पर, Google पर आगे बढ़ें, दबाइए.',
    mr: 'कृपया बॉक्समध्ये तुमचा रिव्ह्यू तुमच्या शब्दांत लिहा. तयार झाल्यावर, Google वर पुढे जा, दाबा.',
  },
  post: {
    en: 'Last step. Tap the button, Copy and open Google Reviews. Your review is copied and Google opens. On Google, choose your own star rating, long-press to paste the text, and tap Post.',
    hi: 'आखिरी कदम. बटन दबाइए, कॉपी करें और Google रिव्यू खोलें. आपका रिव्यू कॉपी होगा और Google खुलेगा. Google पर अपनी स्टार रेटिंग खुद चुनें, दबाकर रखें और टेक्स्ट पेस्ट करें, फिर Post दबाएँ.',
    mr: 'शेवटची पायरी. बटण दाबा, कॉपी करा आणि Google रिव्ह्यू उघडा. तुमचा रिव्ह्यू कॉपी होईल आणि Google उघडेल. Google वर तुमचे स्टार्स स्वतः निवडा, दाबून ठेवून मजकूर पेस्ट करा, आणि Post वर टॅप करा.',
  },
  postNoLink: {
    en: 'Last step. Tap Copy to copy your review, so you can share it.',
    hi: 'आखिरी कदम. अपना रिव्यू कॉपी करने के लिए कॉपी बटन दबाइए.',
    mr: 'शेवटची पायरी. तुमचा रिव्ह्यू कॉपी करण्यासाठी कॉपी बटण दाबा.',
  },
  done: {
    en: 'Thank you for sharing your honest feedback with {n}. Have a wonderful day!',
    hi: '{n} के साथ अपना सच्चा फीडबैक साझा करने के लिए धन्यवाद. आपका दिन शुभ हो!',
    mr: '{n} सोबत तुमचा प्रामाणिक अभिप्राय शेअर केल्याबद्दल धन्यवाद. तुमचा दिवस छान जावो!',
  },
};

const UI = {
  start: { en: 'Tap to Start Voice Experience', hi: 'आवाज़ गाइड शुरू करने के लिए टैप करें', mr: 'आवाज मार्गदर्शन सुरू करण्यासाठी टॅप करा' },
  startSub: { en: 'A friendly voice guides you through each step', hi: 'हर कदम पर एक आवाज़ आपको रास्ता बताएगी', mr: 'प्रत्येक पायरीवर आवाज तुम्हाला मार्ग दाखवेल' },
  noThanks: { en: 'No thanks', hi: 'नहीं, धन्यवाद', mr: 'नको, धन्यवाद' },
  guide: { en: 'Voice guide', hi: 'आवाज़ गाइड', mr: 'आवाज मार्गदर्शन' },
  speaking: { en: 'Speaking…', hi: 'बोल रहा है…', mr: 'बोलत आहे…' },
  on: { en: 'Speaker on', hi: 'आवाज़ चालू', mr: 'आवाज चालू' },
  off: { en: 'Speaker off', hi: 'आवाज़ बंद', mr: 'आवाज बंद' },
  replay: { en: 'Replay', hi: 'फिर सुनें', mr: 'पुन्हा ऐका' },
  fallbackHi: { en: '', hi: '', mr: 'या फोनवर मराठी आवाज नाही, म्हणून हिंदी आवाज वापरत आहोत.' },
  fallbackEn: {
    en: '',
    hi: 'इस फ़ोन पर हिंदी आवाज़ नहीं है, इसलिए गाइड अंग्रेज़ी में है.',
    mr: 'या फोनवर मराठी/हिंदी आवाज नाही, म्हणून मार्गदर्शन इंग्रजीत आहे.',
  },
};

const LOCALE = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };
const fill = (s, n) => String(s || '').replace(/\{n\}/g, n);

function speechSupported() {
  try {
    return typeof window !== 'undefined' && !!window.speechSynthesis && typeof window.speechSynthesis.speak === 'function' && typeof window.SpeechSynthesisUtterance === 'function';
  } catch {
    return false;
  }
}

// Best installed voice for a language ('en' | 'hi' | 'mr'), or null.
function findVoice(voices, code) {
  const want = voices.filter((v) => (v.lang || '').toLowerCase().replace('_', '-').startsWith(code));
  if (!want.length) return null;
  const score = (v) => {
    const l = (v.lang || '').toLowerCase();
    let s = 0;
    if (l.endsWith('-in')) s += 4; // Indian accent first
    if (v.localService) s += 1; // on-device voices start faster and work offline
    if (/google|natural|neural|online/i.test(v.name)) s += 2;
    return s;
  };
  return [...want].sort((a, b) => score(b) - score(a))[0];
}

// Picks a voice for the page language. Marathi falls back to a Hindi voice (same Devanagari script),
// then to English text, so a customer never hears silence or garbled speech.
export function pickVoice(voices, lang) {
  const own = findVoice(voices, lang);
  if (own) return { voice: own, textLang: lang, locale: own.lang || LOCALE[lang], note: '' };
  if (lang === 'mr') {
    const hi = findVoice(voices, 'hi');
    if (hi) return { voice: hi, textLang: 'mr', locale: hi.lang || 'hi-IN', note: 'fallbackHi' };
  }
  if (lang !== 'en' && voices.length) {
    const en = findVoice(voices, 'en');
    return { voice: en, textLang: 'en', locale: en?.lang || 'en-IN', note: 'fallbackEn' };
  }
  // Voices not loaded yet (or none listed): let the browser choose from the locale.
  return { voice: null, textLang: lang, locale: LOCALE[lang], note: '' };
}

// Which instruction belongs to the current funnel state (null = nothing to say yet).
export function instructionKey({ step, busy, error, draftsCount, manual, hasGoogleLink }) {
  if (step === 'rate') return 'rate';
  if (step === 'exp') return 'exp';
  if (step === 'drafts') return !busy && !error && draftsCount > 0 ? 'drafts' : null;
  if (step === 'edit') return manual ? 'editManual' : 'edit';
  if (step === 'post') return hasGoogleLink ? 'post' : 'postNoLink';
  if (step === 'done') return 'done';
  return null;
}

// Short sentences: Chrome cuts off long utterances, and it lets cancel() act quickly.
const sentences = (text) => text.match(/[^.!?।]+[.!?।]*/g)?.map((s) => s.trim()).filter(Boolean) || [text];

export default function VoiceGuide({ lang, step, busy, error, draftsCount, manual, hasGoogleLink, name }) {
  const [supported, setSupported] = useState(false);
  const [phase, setPhase] = useState('offer'); // offer | on | off | dismissed
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const [hidden, setHidden] = useState(false);
  const spoken = useRef(new Set()); // "key|lang" already played automatically
  const run = useRef(0); // invalidates callbacks from cancelled speech

  const key = instructionKey({ step, busy, error, draftsCount, manual, hasGoogleLink });
  const choice = pickVoice(voices, lang);

  useEffect(() => {
    if (!speechSupported()) return;
    setSupported(true);
    const synth = window.speechSynthesis;
    const load = () => {
      try {
        setVoices(synth.getVoices() || []);
      } catch {}
    };
    load();
    try {
      synth.addEventListener?.('voiceschanged', load);
    } catch {}
    // Stop talking when the customer leaves for Google or closes the page.
    const stop = () => {
      try {
        synth.cancel();
      } catch {}
    };
    window.addEventListener('pagehide', stop);
    // While the customer is on the Google tab this page is hidden: stay quiet, speak again when they return.
    const vis = () => {
      const h = document.visibilityState === 'hidden';
      setHidden(h);
      if (h) stop();
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      try {
        synth.removeEventListener?.('voiceschanged', load);
      } catch {}
      window.removeEventListener('pagehide', stop);
      document.removeEventListener('visibilitychange', vis);
      stop();
    };
  }, []);

  const stop = useCallback(() => {
    run.current += 1;
    setSpeaking(false);
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }, []);

  const speak = useCallback(
    (k) => {
      if (!k || !speechSupported()) return;
      stop(); // never talk over a previous instruction
      const id = run.current;
      const { voice, textLang, locale } = choice;
      const text = fill(SAY[k]?.[textLang] || SAY[k]?.en, name);
      // Spoken synchronously so a tap counts as the user gesture iOS Safari requires.
      try {
        const synth = window.speechSynthesis;
        if (synth.paused) synth.resume();
        const parts = sentences(text);
        parts.forEach((part, i) => {
          const u = new window.SpeechSynthesisUtterance(part);
          u.lang = locale;
          if (voice) u.voice = voice;
          u.rate = textLang === 'en' ? 0.98 : 0.92;
          u.pitch = 1;
          if (i === 0) u.onstart = () => id === run.current && setSpeaking(true);
          if (i === parts.length - 1) {
            u.onend = () => id === run.current && setSpeaking(false);
          }
          u.onerror = () => id === run.current && setSpeaking(false);
          synth.speak(u);
        });
      } catch {
        setSpeaking(false);
      }
    },
    [choice, name, stop]
  );

  // Changing step always silences the old instruction. Each instruction plays automatically only once
  // per language; the Replay button plays it again on request.
  const last = useRef('');
  useEffect(() => {
    if (!supported) return;
    const now = `${key}|${lang}`;
    if (last.current && last.current !== now) stop();
    last.current = now;
    if (phase !== 'on' || !key || hidden || spoken.current.has(now)) return;
    spoken.current.add(now);
    speak(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lang, phase, supported, hidden]);

  const begin = () => {
    // Speak inside the tap itself (mobile browsers only allow speech that starts from a gesture).
    if (key) spoken.current.add(`${key}|${lang}`);
    setPhase('on');
    speak(key);
  };

  if (!supported || phase === 'dismissed') return null;

  const u = (k) => UI[k][lang] || UI[k].en;

  if (phase === 'offer') {
    return (
      <div className="vg-offer">
        <button type="button" className="vg-start" onClick={begin}>
          <span className="vg-start-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M3 10v4a1 1 0 0 0 1 1h3l4 4V5L7 9H4a1 1 0 0 0-1 1zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" /></svg>
          </span>
          <span className="vg-start-txt">
            <b>{u('start')}</b>
            <small>{u('startSub')}</small>
          </span>
          <span className="vg-start-go" aria-hidden="true">▶</span>
        </button>
        <button type="button" className="vg-skip" onClick={() => setPhase('dismissed')}>{u('noThanks')}</button>
      </div>
    );
  }

  const on = phase === 'on';
  const note = on && choice.note ? UI[choice.note][lang] : '';
  return (
    <div className={'vg-bar' + (speaking ? ' talking' : '')} role="region" aria-label={u('guide')}>
      <span className="vg-wave" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className="vg-status" aria-live="polite">{on ? (speaking ? u('speaking') : u('guide')) : u('off')}</span>
      <button
        type="button"
        className={'vg-btn' + (on ? ' on' : '')}
        aria-pressed={on}
        aria-label={on ? u('on') : u('off')}
        title={on ? u('on') : u('off')}
        onClick={() => {
          if (on) {
            stop();
            setPhase('off');
          } else {
            begin();
          }
        }}
      >
        {on ? '🔊' : '🔇'} <span>{on ? u('on') : u('off')}</span>
      </button>
      <button
        type="button"
        className="vg-btn"
        disabled={!key}
        title={u('replay')}
        onClick={begin}
      >
        ↻ <span>{u('replay')}</span>
      </button>
      {note && <small className="vg-note">{note}</small>}
    </div>
  );
}
