import fs from "fs";
import puppeteer from "puppeteer-core";

let browserPromise = null;

const SANDBOX_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

const MAC_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
];

const LINUX_CHROME_PATHS = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
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

  if (process.platform === "linux") {
    for (const executablePath of LINUX_CHROME_PATHS) {
      if (fs.existsSync(executablePath)) {
        console.log("PDF: using Chromium at", executablePath);
        return puppeteer.launch({
          headless: true,
          executablePath,
          args: SANDBOX_ARGS,
        });
      }
    }
  }

  throw new Error(
    "No Chrome/Chromium found. On Render, deploy with Docker (see Dockerfile)."
  );
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
    await page.setContent(html, { waitUntil: "domcontentloaded" });
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
