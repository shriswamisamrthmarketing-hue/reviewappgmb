'use client';

// Admin: one real, scannable QR code per business. The preview IS the PNG that gets downloaded
// (same data), and the SVG encodes exactly the same URL with the same settings.
// Each code is checked against the live site so a QR that would open a 404 is clearly flagged.
import { useState } from 'react';
import { reviewUrl, qrPng, qrSvg, qrInfo, download } from '@/lib/qr-client';
import { Modal } from '@/components/ReviewTools';

const PNG_SIZE = 1200; // px – prints sharply up to ~10 cm at 300 dpi

function QrRow({ b, onPreview }) {
  const url = reviewUrl(b.slug);
  const [qr, setQr] = useState(null); // { png, svg, url, info, at }
  const [live, setLive] = useState(null); // { state: 'checking'|'ok'|'bad', text }
  const [err, setErr] = useState('');

  const checkLive = async () => {
    setLive({ state: 'checking', text: 'Checking the live page…' });
    try {
      const j = await (await fetch(`/api/live-check?b=${encodeURIComponent(b.slug)}`, { cache: 'no-store' })).json();
      setLive(j.ok ? { state: 'ok', text: 'Live page opens ✓' } : { state: 'bad', text: j.reason || 'Live page not working.' });
    } catch {
      setLive({ state: 'bad', text: 'Could not check the live page.' });
    }
  };
  const generate = async () => {
    setErr('');
    try {
      const [png, svg] = await Promise.all([qrPng(url, PNG_SIZE), qrSvg(url)]);
      setQr({ png, svg, url, info: qrInfo(url), at: new Date() });
      checkLive();
    } catch (e) {
      setErr(e.message);
    }
  };
  const guard = () => live?.state !== 'bad' || window.confirm('Warning: the live page for this QR is not working yet, so customers would see an error. Download anyway (for testing)?');

  return (
    <div className={'aq-row' + (live?.state === 'bad' ? ' bad' : '')}>
      <div className="aq-img">
        {qr ? (
          <button type="button" className="aq-thumb" onClick={() => onPreview({ b, qr })} title="Preview">
            <img src={qr.png} alt={`QR code for ${b.short_name || b.name}`} />
          </button>
        ) : (
          <div className="aq-empty">No QR yet</div>
        )}
      </div>
      <div className="aq-body">
        <b>{b.short_name || b.name}</b>
        <div className="aq-url">
          <span>Encoded URL:</span> <code>{qr?.url || url || '—'}</code>
        </div>
        {qr && (
          <div className="aq-meta">
            Version {qr.info.version} · error correction {qr.info.ecl} · {qr.info.modules}×{qr.info.modules} modules + 4-module white border · PNG {PNG_SIZE}×{PNG_SIZE}px · generated {qr.at.toLocaleTimeString()}
          </div>
        )}
        {live && <div className={'aq-live ' + live.state}>{live.state === 'bad' ? '⚠️ ' : live.state === 'ok' ? '✅ ' : '⏳ '}{live.text}</div>}
        {err && <div className="aq-live bad">⚠️ {err}</div>}
        <div className="aq-actions">
          {!qr ? (
            <button type="button" className="btn small primary" disabled={!url} onClick={generate}>Generate QR Code</button>
          ) : (
            <>
              <button type="button" className="btn small" onClick={() => onPreview({ b, qr })}>Preview</button>
              <button type="button" className="btn small primary" onClick={() => guard() && download(qr.png, `${b.slug}-review-qr.png`)}>Download PNG</button>
              <button type="button" className="btn small" onClick={() => guard() && download('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(qr.svg), `${b.slug}-review-qr.svg`)}>Download SVG</button>
              <button type="button" className="btn small" onClick={generate}>↻ Regenerate</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminQr({ businesses, publicBase }) {
  const [preview, setPreview] = useState(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="section" id="qr-codes">
      <div className="adm-section-head">
        <h2 style={{ margin: 0 }}>QR codes</h2>
        <button type="button" className="btn small" onClick={() => setOpen((o) => !o)}>{open ? 'Hide' : `Show all (${businesses.length})`}</button>
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Real QR codes (free <code>qrcode</code> library) that encode each business’s customer link on the live site
        {publicBase ? <> <b>{publicBase}</b></> : ''}. The preview is exactly the PNG you download; the SVG encodes the same link.
      </p>
      {!publicBase && <div className="alert warn">PUBLIC_SITE_URL is not set, so no customer QR codes can be made.</div>}
      {open && publicBase && (
        <div className="aq-list">
          {businesses.map((b) => <QrRow key={b.slug} b={b} onPreview={setPreview} />)}
        </div>
      )}
      {preview && (
        <Modal title={`QR code · ${preview.b.short_name || preview.b.name}`} onClose={() => setPreview(null)}>
          <div className="aq-preview">
            <img src={preview.qr.png} alt="QR code preview" />
            <code>{preview.qr.url}</code>
            <p className="muted" style={{ fontSize: 13 }}>Scan this with your phone camera: it should open the link above.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
