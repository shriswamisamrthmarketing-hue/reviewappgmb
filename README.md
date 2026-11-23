# Smart Google Review Agent

A ChatGPT-style feedback assistant for **four businesses only**:

| Business | Customer link (QR) |
|---|---|
| Jatan By The Dhruta Construction | `/review/jatan` |
| THE DHRUTA CONSTRUCTIONS | `/review/dhruta` |
| Haemoglobbinn – Branding and Integrated Marketing Agency in Pune | `/review/haemoglobbinn` |
| Makoons Wakad – Preschool and Daycare in Wakad | `/review/makoons-wakad` |

A customer scans the business's QR code. The assistant greets them in that business's branding and asks a few
tap-to-answer questions (no typing needed) in English, Marathi or Hindi. Gemini then writes a natural review draft
from **only what they selected**. The customer can edit it, ask for new wording, copy it, and open the business's
Google review page, where they pick their own star rating and post it themselves.

**Built-in guardrails**

- The AI uses only the customer's selections and their optional words. The server checks every answer against the
  saved options, so the browser cannot add made-up claims.
- The draft keeps the customer's real sentiment. "Average" and "Not satisfied" produce honest, polite reviews.
- Every customer gets the same "Post on Google" button. Feedback is never filtered and positive ratings are never
  pushed (this follows Google's rule against review gating).
- Nothing is posted automatically. Review text and personal data are never stored, only anonymous counts.

---

## 1. What's inside

```
app/
  review/[slug]/page.js        Customer chat page (one per business)
  admin/                       Login, dashboard, business editor
  api/generate                 Server-side Gemini call (key never reaches the browser)
  api/event                    Anonymous usage counters
  api/admin/...                Protected admin API
components/ChatAgent.jsx       The chat interface
components/AdminDashboard.jsx  Dashboard with 4 business cards and stats
components/BusinessEditor.jsx  Edit details, questions/options, QR and preview
lib/seed.js                    Default questions for the 4 businesses (EN/MR/HI)
lib/review.js                  Gemini prompt, safety rules, offline fallback writer
lib/store.js                   Supabase storage (local-file fallback for testing)
supabase/schema.sql            Database tables, security and stats view
scripts/e2e-test.mjs           Automated test of all 4 flows plus the admin
scripts/keyword-test.mjs       Automated test of the business-wise keyword rules
scripts/mock-gemini.mjs        Fake Gemini server used by the tests (no key, no cost)
render.yaml                    One-click Render Blueprint
```

Stack: Next.js 16 (React frontend + Node.js API routes), Supabase (Postgres), Google Gemini API. Needs Node.js 20.9+.

---

## 2. Keys you need (environment variables)

| Variable | Required | Where to get it |
|---|---|---|
| `ADMIN_PASSWORD` | Yes | Choose a long password for `/admin` |
| `SESSION_SECRET` | Yes | Any long random string (e.g. from a password generator) |
| `SUPABASE_URL` | Yes (for live use) | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for live use) | Supabase → Project Settings → API → `service_role` secret |
| `GEMINI_API_KEY` | Yes (for AI drafts) | https://aistudio.google.com → **Get API key** |
| `NEXT_PUBLIC_SITE_URL` | No | Leave empty. QR codes use the address the dashboard is opened on (your onrender.com address) |
| `GEMINI_MODEL` | Optional | Default `gemini-3.6-flash`. Cheaper and faster: `gemini-3.5-flash-lite` |

Security notes

- The **service_role** key and the **Gemini** key are used only on the server. Never put them in a variable that
  starts with `NEXT_PUBLIC_`, and never commit them to GitHub (`.env*` files are already in `.gitignore`).
- With no Gemini key, or if Gemini is down, the app still works. It uses a simpler built-in writer, and the dashboard
  shows which one is active.
- With no Supabase, the app saves to a local file (testing only). The dashboard shows a warning.

---

## 3. Set up Supabase (5 minutes)

1. Go to https://supabase.com → **New project** (the free plan is fine). Pick the **Mumbai (ap-south-1)** region.
2. Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`, then click **Run**.
3. Open **Project Settings → API** and copy the **Project URL** and the **service_role** key.

You do not have to add the businesses yourself. The app creates all four the first time it loads.
Note: Supabase pauses free projects after about a week with no activity. Regular QR scans keep it active. If it pauses,
click **Restore** in Supabase.

---

## 4. Run on your computer (optional)

Needs Node.js 20.9+ (22 recommended).

```bash
npm install
cp .env.example .env.local      # then fill in the values
npm run dev                     # http://localhost:3000/admin
```

---

## 5. Put the code on GitHub

1. Create a new **private** repository on https://github.com/new (e.g. `smart-review-agent`). Don't add a README.
2. In the project folder:

```bash
git init
git add .
git commit -m "Smart Google Review Agent"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/smart-review-agent.git
git push -u origin main
```

(No command line? On the new repo page, click **uploading an existing file** and drag in every file and folder
except `node_modules`, `.next` and `.env.local`.)

---

## 6A. Deploy on Vercel (recommended: fast, no sleep)

1. Go to https://vercel.com → **Add New → Project** → import the GitHub repo. Vercel detects Next.js automatically.
2. Open **Environment Variables** and add every variable from section 2.
3. Click **Deploy**. When it finishes, copy your URL (e.g. `https://smart-review-agent.vercel.app`).
4. Set `NEXT_PUBLIC_SITE_URL` to that URL in **Settings → Environment Variables**, then **Deployments → ⋯ → Redeploy**.
5. Optional: add your own domain (e.g. `review.haemoglobbinn.com`) in **Settings → Domains**. Do this **before**
   you print QR codes, then update `NEXT_PUBLIC_SITE_URL` and redeploy.

Note: Vercel's free **Hobby** plan is meant for personal, non-commercial use. For client businesses, Vercel's terms
point to the Pro plan. Render's free plan (below) has no such limit.

## 6B. Deploy on Render (free)

1. Go to https://render.com → **New → Blueprint** → connect the GitHub repo. Render reads `render.yaml`.
2. Fill in the variables it asks for (`SESSION_SECRET` is generated automatically) → **Apply**.
3. When it's live, copy the `https://….onrender.com` URL, set it as `NEXT_PUBLIC_SITE_URL` under
   **Environment**, and click **Manual Deploy → Deploy latest commit**.

Note: Render's free web services sleep after about 15 minutes without visitors. The first scan after that can take
30–60 seconds to load. Render's Starter plan removes the sleep, or you can use Vercel.

---

## 6C. Your free web address

The app runs at the free Render address, e.g. `https://smart-review-agent.onrender.com`. No domain purchase is needed.
QR codes downloaded from the dashboard automatically use that address, so always download them from the live site.

## 7. First-time admin checklist

1. Open `https://YOUR-SITE/admin` and log in with `ADMIN_PASSWORD`.
2. For **each** business, click **Edit** and paste the **public Google Review link** (see below), then **Save**.
3. Check the questions under **AI questions & options** and edit them in any language if needed.
4. Open **Preview chat** and run through the flow once (previews are not counted in stats).
5. Go to the **QR code** tab and download the **printable poster** (or a high-res PNG/SVG for your designer).
   Always download from the **live** site, never from `localhost`.

### Getting the public Google Review link

The `business.google.com/n/…` links are **management** links. Only owners can open them, so customers cannot use
them. The app rejects them in the review-link field.

1. Search the business name on Google (signed in as an owner) or open the management link.
2. Click **Ask for reviews** (sometimes **Read reviews → Get more reviews**).
3. Copy the link, which usually looks like `https://g.page/r/XXXXXXXXXXXX/review`, and paste it into the dashboard.

The QR link (`/review/<business>`) never changes, so printed QR codes keep working when you edit questions or the
Google link later.

---

## 8. Using the admin dashboard

- **Dashboard**: the four business cards with a review-link status, visits, drafts, copies and "opened Google". The
  stats table adds QR scans, 7-day numbers, Gemini vs. basic drafts, re-wordings, the experience mix and review
  languages.
- **Business details**: name, short name (used in chat and reviews), category, location, colours, logo URL, greeting
  (EN/MR/HI), SEO phrases (the AI may use at most one, and only if it matches the customer's choices), and the
  Google review link.
- **AI questions & options**: add, remove or reorder questions and options. Each question has:
  - *Answer type*: one answer or multiple answers
  - *Ask whom*: everyone, customers who chose Excellent/Good/Average ("what did you like"), or customers who chose
    Average/Not satisfied ("what could be better")
  - *Skippable*: shows a Skip button
  - *Short label for the AI*: what the answer means, e.g. "What I liked"

  The first question ("How was your experience?") and the language question are fixed, so every customer goes
  through the same fair flow. Use **Reset questions to default** to undo your changes.
- **SEO keywords** (per business): add up to 8 search phrases, switch each on/off, and optionally link a keyword to
  answers – e.g. “daycare in Wakad” only for parents who picked Daycare, “SEO services in Pune” only for clients who
  picked SEO. The AI uses at most one keyword per review, only where it reads naturally. The dashboard shows how often
  each keyword was used.
- **QR code**: poster PNG, QR-only PNG (2048 px), SVG, and copy link.

---

## 9. Testing

The automated test runs 8 customer conversations (all four businesses; English, Marathi and Hindi; all four
experience levels) plus the admin flows: login, rejecting the management link, saving a review link, editing
options, QR downloads, statistics, and API safety checks.

```bash
npm run build && npm start             # in one terminal
npx playwright install chromium        # first time only
BASE_URL=http://localhost:3000 ADMIN_PASSWORD=your-password npm run test:e2e
```

Screenshots are saved to `test-screenshots/`.

To test the AI path without a Gemini key or cost, use the fake Gemini server:

```bash
npm run mock:gemini                                         # terminal 1 (port 3999)
GEMINI_API_KEY=test GEMINI_API_BASE=http://localhost:3999 npm start   # terminal 2
BASE_URL=http://localhost:3000 ADMIN_PASSWORD=your-password npm run test:keywords
```

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| Dashboard says "local file (testing only)" | Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then redeploy |
| Error mentions "did you run supabase/schema.sql?" | Run the SQL file in the Supabase SQL Editor |
| Dashboard says "AI: not configured" | Add `GEMINI_API_KEY` and redeploy |
| Drafts are the basic style even with a key | Check the server logs for "Gemini failed". The key may be invalid, the quota used up, or the model name wrong. Try `GEMINI_MODEL=gemini-3.5-flash-lite` |
| QR codes open `localhost` | Download QR codes from the live site, or set `NEXT_PUBLIC_SITE_URL` and redeploy |
| "Too many requests" for a customer | One device can make 15 drafts per 10 minutes, to protect your Gemini quota |
| Forgot the admin password | Change `ADMIN_PASSWORD` in Vercel/Render and redeploy |
