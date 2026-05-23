import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

export async function sendHrEmail({
  pdfBuffer,
  filename,
  subject,
  rowNumber,
  responseToken,
}) {
  const hrEmail = process.env.HR_EMAIL;
  const fromEmail = process.env.FROM_EMAIL;

  if (!hrEmail) throw new Error("HR_EMAIL is not set");
  if (!fromEmail) throw new Error("FROM_EMAIL is not set");

  const resend = getResend();
  const lines = [
    "A new form submission was received and is attached as a PDF.",
    "",
    rowNumber != null ? `Sheet row: ${rowNumber}` : null,
    responseToken ? `Response token: ${responseToken}` : null,
  ].filter(Boolean);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [hrEmail],
    subject,
    text: lines.join("\n"),
    attachments: [
      {
        filename,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    throw new Error(error.message || "Failed to send email");
  }
}
