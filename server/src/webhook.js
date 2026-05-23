import { buildSubmissionHtml } from "./template.js";
import { htmlToPdf } from "./pdf.js";
import { sendHrEmail } from "./email.js";

function verifySecret(req) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    throw new Error("WEBHOOK_SECRET is not configured on the server");
  }
  const provided = req.get("X-Webhook-Secret");
  if (!provided || provided !== expected) {
    return false;
  }
  return true;
}

function validatePayload(body) {
  if (!body || typeof body !== "object") return "Invalid JSON body";
  if (!body.fields || typeof body.fields !== "object") {
    return "Missing fields object";
  }
  return null;
}

export async function handleSheetRowWebhook(req, res) {
  if (!verifySecret(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const validationError = validatePayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { fields, rowNumber, submittedAt, responseToken, sheetName } = req.body;
  const formTitle = process.env.FORM_TITLE || "Form submission";
  const companyName = process.env.COMPANY_NAME || "";

  try {
    const html = buildSubmissionHtml({
      formTitle,
      companyName,
      fields,
      meta: {
        rowNumber,
        submittedAt: submittedAt || new Date().toISOString(),
        responseToken,
        sheetName,
      },
    });

    const pdfBuffer = await htmlToPdf(html);
    const filename = `submission-row-${rowNumber || "unknown"}.pdf`;

    await sendHrEmail({
      pdfBuffer,
      filename,
      subject: `${formTitle} — Row ${rowNumber ?? "?"}`,
      rowNumber,
      responseToken,
    });

    return res.json({ ok: true, emailed: true });
  } catch (err) {
    console.error("Webhook processing failed:", err);
    return res.status(500).json({ error: err.message || "Processing failed" });
  }
}
