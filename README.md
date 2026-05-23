# Typeform → Google Sheets → PDF → HR

When Typeform adds a row to your Google Sheet, Apps Script sends the row to this service. The service builds a styled PDF and emails it to HR.

## Architecture

```
Typeform → Google Sheet (new row)
              ↓
         Apps Script (trigger or every 5 min)
              ↓ POST JSON + secret header
         This server (/webhooks/sheet-row)
              ↓
         PDF (Puppeteer) → Email (Resend) → HR
```

---

## Step 1 — Accounts you need

| Service | Purpose |
|---------|---------|
| [Resend](https://resend.com) | Send email with PDF attachment (free tier for testing) |
| [Render](https://render.com) (or Railway) | Host the PDF server 24/7 with a public URL |
| Google account | Sheet + Apps Script |

Generate a long random **webhook secret** (e.g. `openssl rand -hex 32`) — you will use the same value in Apps Script and on the server.

---

## Step 2 — Run the PDF server locally (test first)

```bash
cd server
cp .env.example .env
```

Edit `.env`:

- `WEBHOOK_SECRET` — your random secret
- `HR_EMAIL` — where PDFs go
- `RESEND_API_KEY` — from Resend dashboard
- `FROM_EMAIL` — use `onboarding@resend.dev` for testing, or your verified domain
- `FORM_TITLE` / `COMPANY_NAME` — optional branding on the PDF

Install and start:

```bash
npm install
npm run dev
```

Health check: open `http://localhost:3847/health` — should return `{"ok":true}`.

Test the webhook (replace secret):

```bash
curl -X POST http://localhost:3847/webhooks/sheet-row \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: YOUR_SECRET" \
  -d '{
    "rowNumber": 2,
    "submittedAt": "2026-05-21T12:00:00Z",
    "responseToken": "test-token",
    "sheetName": "Form Responses 1",
    "fields": {
      "Full name": "Jane Doe",
      "Department": "Engineering"
    }
  }'
```

HR should receive an email with a PDF. Fix any Resend/domain errors before deploying.

---

> **Full deploy + Apps Script checklist:** see [DEPLOY.md](DEPLOY.md)

## Step 3 — Deploy the server (Render)

1. Push this repo to GitHub (or connect Render to your folder).
2. On [Render](https://dashboard.render.com) → **New** → **Blueprint** or **Web Service**.
3. If using the blueprint: point at this repo; `render.yaml` sets `rootDir: server`.
4. If manual: **Root directory** = `server`, **Build** = `npm install`, **Start** = `npm start`.
5. Add environment variables (same as `.env`):
   - `WEBHOOK_SECRET`
   - `HR_EMAIL`
   - `RESEND_API_KEY`
   - `FROM_EMAIL`
   - `FORM_TITLE` (optional)
   - `COMPANY_NAME` (optional)
6. Deploy. Copy your public URL, e.g. `https://typeform-formatter.onrender.com`.

Your webhook URL is:

```
https://YOUR-SERVICE.onrender.com/webhooks/sheet-row
```

> **Note:** Free Render services sleep after inactivity. The first request after sleep may take ~30s. Apps Script may timeout on very slow cold starts — upgrade to a paid instance or use Railway if that happens. The 5-minute poll trigger will retry.

---

## Step 4 — Connect Apps Script to your sheet

1. Open the **Google Sheet** that receives Typeform responses.
2. **Extensions** → **Apps Script**.
3. Delete any default code. Paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs).
4. **Project settings** (gear) → **Script properties** → Add:

   | Property | Value |
   |----------|--------|
   | `WEBHOOK_URL` | `https://YOUR-SERVICE.onrender.com/webhooks/sheet-row` |
   | `WEBHOOK_SECRET` | Same secret as on the server |

5. Save the project.

---

## Step 5 — Authorize and create triggers

1. In the Apps Script editor, select function **`setupTriggers`** → **Run**.
2. Approve permissions (spreadsheet read, external URL, triggers).
3. Select **`testProcessNewRows`** → **Run** once to process any existing rows after row 1 (header).

Triggers installed:

- **onChange** — runs when the sheet changes (Typeform adding a row).
- **Every 5 minutes** — backup poll so nothing is missed.

---

## Step 6 — End-to-end test

1. Submit a test response on your Typeform (or add a row manually below the header).
2. Within a few minutes at most, HR should get the PDF email.
3. If not, check **Apps Script** → **Executions** for errors.
4. Check Render **Logs** for server errors.

---

## Step 7 — Go live checklist

- [ ] Resend: verify your company domain; set `FROM_EMAIL` to e.g. `notifications@yourcompany.com`
- [ ] Use a strong `WEBHOOK_SECRET`; never commit `.env`
- [ ] Restrict access to the Google Sheet (HR data)
- [ ] Confirm header row in the sheet matches question titles (PDF uses column headers as labels)
- [ ] Optional: customize PDF styling in `server/src/template.js`

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Health check fails | Server must be running (`cd server && npm run dev`). Open **http://localhost:3847/health** (not https). Default port is **3847** to avoid clashing with other apps on 3000. Set `PORT` in `.env` to change it. |
| `Failed to launch the browser process` (Mac) | Install [Google Chrome](https://www.google.com/chrome/), restart `npm run dev`. The server will use your Mac’s Chrome instead of a broken Puppeteer download. Or run `npm run browsers:install` in `server/`. |
| 401 Unauthorized | `WEBHOOK_SECRET` mismatch between Script Properties and server |
| Email not sent | Resend dashboard, `FROM_EMAIL` verified, `HR_EMAIL` correct |
| Script timeout | Render cold start; run `testProcessNewRows` again or use paid instance |
| Duplicate emails | `lastProcessedRow` in Script Properties; don’t delete unless you want to reprocess |
| Wrong columns on PDF | Row 1 must be headers; Typeform integration should keep stable column names |

---

## Project layout

```
apps-script/Code.gs    → paste into Google Apps Script
server/                → Node PDF + email service
render.yaml            → optional Render deploy config
```

---

## Customization

- **PDF look:** edit `server/src/template.js` (colors, fonts, layout).
- **Email copy:** edit `server/src/email.js`.
- **Which sheet tab:** in Apps Script, change `getActiveDataSheet_()` to `getSheetByName('Form Responses 1')` if needed.
