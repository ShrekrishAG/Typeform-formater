import fs from "fs";
import puppeteer from "puppeteer";

let browserPromise = null;

const LAUNCH_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

const MAC_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
];

async function launchBrowser() {
  const base = { headless: true, args: LAUNCH_ARGS };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return puppeteer.launch({
      ...base,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    });
  }

  if (process.platform === "darwin") {
    for (const executablePath of MAC_CHROME_PATHS) {
      if (fs.existsSync(executablePath)) {
        console.log("PDF: using Chrome at", executablePath);
        return puppeteer.launch({ ...base, executablePath });
      }
    }
    try {
      console.log("PDF: using system Chrome (channel: chrome)");
      return puppeteer.launch({ ...base, channel: "chrome" });
    } catch {
      // fall through to bundled Chromium
    }
  }

  console.log("PDF: using Puppeteer bundled Chromium");
  return puppeteer.launch(base);
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

export async function htmlToPdf(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
