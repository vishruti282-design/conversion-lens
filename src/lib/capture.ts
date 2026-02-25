import { PageCapture } from "./types";

const THUM_IO_BASE = "https://image.thum.io/get/width/1280/crop/1024/";

function stripHtmlTags(html: string): string {
  // Remove script and style blocks entirely
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  // Remove all tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text;
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

  // Fetch screenshot and HTML in parallel
  const [screenshotResult, htmlResult] = await Promise.allSettled([
    fetch(`${THUM_IO_BASE}${url}`, { signal: AbortSignal.timeout(30000) })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Screenshot service returned ${res.status}`);
        const buffer = await res.arrayBuffer();
        return Buffer.from(buffer).toString("base64");
      }),
    fetch(url, {
      signal: AbortSignal.timeout(30000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Page returned ${res.status}`);
      return res.text();
    }),
  ]);

  // HTML is required — screenshot is best-effort
  if (htmlResult.status === "rejected") {
    const message = htmlResult.reason?.message || String(htmlResult.reason);
    if (message.includes("timeout") || message.includes("Timeout")) {
      throw new Error(
        `Timeout: The page at ${url} took too long to load (30s limit).`
      );
    }
    throw new Error(
      `Network error: Could not reach ${url}. Please check the URL and try again.`
    );
  }

  const html = htmlResult.value;
  const screenshot =
    screenshotResult.status === "fulfilled" ? screenshotResult.value : "";
  const textContent = stripHtmlTags(html);

  return {
    screenshot,
    html,
    textContent,
    url,
  };
}
