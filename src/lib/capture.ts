import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { existsSync } from "fs";
import { PageCapture } from "./types";

const REMOTE_CHROMIUM_URL =
  "https://github.com/nicholasgasior/chromium-builds/releases/download/128.0.6566.0/chromium-pack.tar";

const LOCAL_CHROME_PATHS = [
  // macOS
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  // Linux
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

function findLocalChrome(): string {
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH;
  }
  for (const p of LOCAL_CHROME_PATHS) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    "Chrome not found locally. Install Google Chrome or set CHROME_EXECUTABLE_PATH env var."
  );
}

async function launchBrowser() {
  const isServerless =
    !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isServerless) {
    const executablePath = await chromium.executablePath(REMOTE_CHROMIUM_URL);
    return puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
  }

  // Local development — use installed Chrome
  return puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    executablePath: findLocalChrome(),
    headless: true,
  });
}

export async function capturePage(url: string): Promise<PageCapture> {
  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(
      `Invalid URL protocol: ${parsed.protocol}. Only http and https are supported.`
    );
  }

  let browser;
  try {
    browser = await launchBrowser();

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const screenshot = await page.screenshot({
      fullPage: true,
      encoding: "base64",
    });

    const html = await page.content();

    const textContent = await page.evaluate(
      () => document.body.innerText
    );

    return {
      screenshot: screenshot as string,
      html,
      textContent,
      url,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    if (message.includes("net::ERR_")) {
      throw new Error(
        `Network error: Could not reach ${url}. Please check the URL and try again.`
      );
    }
    if (message.includes("timeout") || message.includes("Timeout")) {
      throw new Error(
        `Timeout: The page at ${url} took too long to load (30s limit).`
      );
    }

    throw new Error(`Failed to capture page: ${message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
