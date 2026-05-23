import "dotenv/config";
import express from "express";
import { handleSheetRowWebhook } from "./webhook.js";

const app = express();
const port = Number(process.env.PORT) || 3847;

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/webhooks/sheet-row", handleSheetRowWebhook);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`PDF service listening on http://localhost:${port}`);
});
