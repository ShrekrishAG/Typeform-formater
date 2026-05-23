function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return escapeHtml(iso);
  }
}

export function buildSubmissionHtml({ formTitle, companyName, fields, meta }) {
  const entries = Object.entries(fields).filter(
    ([key]) => key && String(key).trim() !== ""
  );

  const rows = entries
    .map(
      ([label, value]) => `
      <tr>
        <th>${escapeHtml(label)}</th>
        <td>${escapeHtml(value === null || value === undefined ? "" : value)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(formTitle)}</title>
  <style>
    @page { margin: 48px 40px; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #1a1a2e;
      font-size: 11pt;
      line-height: 1.45;
      margin: 0;
    }
    .header {
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .company {
      font-size: 10pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 4px;
    }
    h1 {
      font-size: 22pt;
      font-weight: 600;
      margin: 0;
      color: #0f172a;
    }
    .meta {
      margin-top: 12px;
      font-size: 9.5pt;
      color: #475569;
    }
    .meta span { margin-right: 16px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th, td {
      text-align: left;
      vertical-align: top;
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      width: 38%;
      font-weight: 600;
      color: #334155;
      background: #f8fafc;
    }
    td { color: #0f172a; }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 8.5pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    ${companyName ? `<p class="company">${escapeHtml(companyName)}</p>` : ""}
    <h1>${escapeHtml(formTitle)}</h1>
    <div class="meta">
      <span><strong>Submitted:</strong> ${formatDate(meta.submittedAt)}</span>
      ${meta.rowNumber != null ? `<span><strong>Sheet row:</strong> ${escapeHtml(meta.rowNumber)}</span>` : ""}
      ${meta.responseToken ? `<span><strong>Token:</strong> ${escapeHtml(meta.responseToken)}</span>` : ""}
      ${meta.sheetName ? `<span><strong>Sheet:</strong> ${escapeHtml(meta.sheetName)}</span>` : ""}
    </div>
  </div>

  <table>
    <tbody>
      ${rows || "<tr><td colspan=\"2\">No fields in this submission.</td></tr>"}
    </tbody>
  </table>

  <p class="footer">Generated automatically from Typeform → Google Sheets.</p>
</body>
</html>`;
}
