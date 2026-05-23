import fs from "fs";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

let browserPromise = null;

const SANDBOX_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

const MAC_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
];

async function launchBrowser() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log("PDF: using PUPPETEER_EXECUTABLE_PATH");
    return puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: SANDBOX_ARGS,
    });
  }

  if (process.platform === "darwin") {
    for (const executablePath of MAC_CHROME_PATHS) {
      if (fs.existsSync(executablePath)) {
        console.log("PDF: using Chrome at", executablePath);
        return puppeteer.launch({
          headless: true,
          executablePath,
          args: SANDBOX_ARGS,
        });
      }
    }
  }

  console.log("PDF: using @sparticuz/chromium (Render/Linux)");
  return puppeteer.launch({
    args: [...chromium.args, ...SANDBOX_ARGS],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
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
