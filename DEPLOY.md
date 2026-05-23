# Deploy + connect Google Apps Script

Follow in order: **Part 1 (Render)** → **Part 2 (Apps Script)** → **Part 3 (Test)**.

---

## Part 1 — Deploy the PDF server on Render

### 1. Push code to GitHub

```bash
cd "/Users/shreyakrishna/Desktop/Typeform formater"
git init
git add .
git commit -m "Typeform formatter: PDF server and Apps Script bridge"
```

Create a new repo on GitHub (empty, no README), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/typeform-formatter.git
git branch -M main
git push -u origin main
```

### 2. Create the Render service

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint** (or **Web Service**).
2. Connect your GitHub repo.
3. If using **Blueprint**, Render reads `render.yaml` (Node + health check).
4. If manual: **Language** = Node, **Root directory** = `server`, **Build** = `npm install`, **Start** = `npm start`.

### 3. Set environment variables on Render

In the service → **Environment**, add the same values as your local `server/.env`:

| Key | Example |
|-----|---------|
| `WEBHOOK_SECRET` | (same secret you use in Apps Script) |
| `HR_EMAIL` | `micahel@dollfamilyoffice.com` |
| `RESEND_API_KEY` | `re_...` |
| `FROM_EMAIL` | `notifications@dollfamilyoffice.com` (verified domain) |
| `FORM_TITLE` | `New Career Interest Form Submission` |
| `COMPANY_NAME` | `Doll Family Office` |

Do **not** commit `.env` to GitHub.

### 4. Deploy and copy your URL

After deploy succeeds, open:

```
https://YOUR-SERVICE-NAME.onrender.com/health
```

You should see `{"ok":true}`.

Your **webhook URL** for Apps Script:

```
https://YOUR-SERVICE-NAME.onrender.com/webhooks/sheet-row
```

> Free Render services sleep after ~15 min idle. First request after sleep can take 30–60s. Apps Script may timeout once; the 5-minute poll will retry.

---

## Part 2 — Connect Google Apps Script

### 1. Open the Typeform Google Sheet

Use the spreadsheet that receives Typeform responses (row 1 = question headers).

### 2. Open Apps Script

**Extensions** → **Apps Script**

### 3. Paste the code

- Delete any default `Code.gs` content.
- Copy all of [`apps-script/Code.gs`](apps-script/Code.gs) and paste it.
- **Save** (Ctrl/Cmd + S).

### 4. Script properties

**Project settings** (gear) → **Script properties** → Add:

| Property | Value |
|----------|--------|
| `WEBHOOK_URL` | `https://YOUR-SERVICE-NAME.onrender.com/webhooks/sheet-row` |
| `WEBHOOK_SECRET` | Same as `WEBHOOK_SECRET` on Render |

Optional (if responses are not on the active tab):

| Property | Value |
|----------|--------|
| `SHEET_NAME` | `Form Responses 1` (exact tab name) |

### 5. Run setup once

1. In the function dropdown, choose **`setupTriggers`** → **Run**.
2. Click **Review permissions** → choose your Google account → **Allow**.
3. You may see “Google hasn’t verified this app” → **Advanced** → **Go to … (unsafe)** — this is your own script.

### 6. Skip old rows (recommended on first connect)

So you don’t email PDFs for every historical row:

1. Note the **last row number** that already exists in the sheet (e.g. row 50).
2. **Project settings** → **Script properties** → add:

   | Property | Value |
   |----------|--------|
   | `lastProcessedRow` | `50` (use your last existing data row) |

Only **new** rows after that will be sent.

### 7. Test from Apps Script

1. Select **`testProcessNewRows`** → **Run**.
2. **Executions** (clock icon): should show **Completed**.
3. If it fails, open the execution log — common issues:
   - Wrong `WEBHOOK_URL` or secret
   - Render service sleeping (open `/health` in browser first, then run again)

---

## Part 3 — End-to-end test

1. Submit a **new** test answer on your Typeform.
2. Confirm a new row appears in the sheet.
3. Within ~5 minutes (or immediately if `onChange` fires), HR should get the PDF email.
4. Check **Apps Script → Executions** and **Render → Logs** if not.

---

## Quick reference

| What | Where |
|------|--------|
| Webhook URL | `https://YOUR-APP.onrender.com/webhooks/sheet-row` |
| Health check | `https://YOUR-APP.onrender.com/health` |
| Apps Script code | `apps-script/Code.gs` |
| Server env | Render dashboard (mirror `server/.env`) |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Apps Script: `PDF service returned 401` | `WEBHOOK_SECRET` must match exactly on Render and Script Properties |
| Apps Script: timeout / failed to fetch | Wake Render: visit `/health`, rerun `testProcessNewRows` |
| Duplicate emails for old rows | Set `lastProcessedRow` to current last row before going live |
| Wrong sheet tab | Set `SHEET_NAME` script property to exact tab name |
| Email works locally but not on Render | Check Render env vars; use verified `FROM_EMAIL` |
