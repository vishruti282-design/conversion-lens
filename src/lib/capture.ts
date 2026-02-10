import puppeteer from "puppeteer";
import { PageCapture } from "./types";

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
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

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
