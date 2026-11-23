// Fake Gemini server for automated tests (no API key or cost).
// Start:  node scripts/mock-gemini.mjs   (port 3999)
// Then run the app with GEMINI_API_KEY=test GEMINI_API_BASE=http://localhost:3999
// It answers like Gemini, echoing what the real prompt allowed, so tests can check the rules.
import http from 'node:http';

let n = 0;
http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      n++;
      const b = JSON.parse(body || '{}');
      const sys = b.systemInstruction?.parts?.[0]?.text || '';
      const user = b.contents?.[0]?.parts?.[0]?.text || '';
      const name = (sys.match(/business name "([^"]+)"/) || [])[1] || '?';
      // Chat page: only a keyword the customer tapped is in the prompt ("Include this search phrase … : X.")
      const kws = ((sys.match(/search phrases?[^:]*?: ([^.]+)\./) || [])[1] || '')
        .split(' | ')
        .filter(Boolean);
      const lang = (sys.match(/write the whole review in (\w+)/) || [])[1] || 'English';
      const sel = (user.match(/CUSTOMER SELECTIONS:\n([\s\S]*?)\nCUSTOMER'S OWN WORDS/) || [])[1] || '';
      // MOCK_QUOTA=1 → behave like an exhausted free quota (HTTP 429)
      if (process.env.MOCK_QUOTA === '1') {
        res.writeHead(429, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 429, message: 'Resource has been exhausted (e.g. check quota).', status: 'RESOURCE_EXHAUSTED' } }));
        return;
      }
      // 3-draft review funnel and owner reply assistant ask for JSON.
      if (sys.includes('{"drafts"')) {
        const nm = (sys.match(/Mention "([^"]+)" at most once/) || [])[1] || '?';
        const facts = sel.replace(/\n/g, ' ; ');
        const drafts = [1, 2, 3].map((i) => `Mock AI draft ${n}.${i} about ${nm}: ${facts || 'no selections'}.`);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ drafts }) }] } }] }));
        return;
      }
      if (sys.includes('{"replies"')) {
        const replies = [1, 2].map((i) => `Mock AI reply ${n}.${i}: thank you for your feedback, we appreciate it and hope to see you again.`);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ replies }) }] } }] }));
        return;
      }
      const dev = lang === 'Marathi' ? ' अनुभव छान होता.' : lang === 'Hindi' ? ' अनुभव अच्छा रहा.' : '';
      const text =
        `Mock review ${n}: my experience with ${name} was good${kws[0] ? `, a ${kws[0]} worth noting` : ''}.${dev}` +
        ` [allowed: ${kws.join(' / ') || 'none'}] [facts: ${sel.replace(/\n/g, ' ; ')}]`;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
    });
  })
  .listen(Number(process.env.MOCK_PORT || 3999), () => console.log('mock Gemini on', process.env.MOCK_PORT || 3999));
