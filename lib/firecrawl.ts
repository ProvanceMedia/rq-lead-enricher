import { getServerEnv } from "@/lib/env";

const env = getServerEnv();

const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev";

export interface FirecrawlResult {
  url: string;
  content: string;
  raw?: unknown;
}

async function firecrawlFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!env.FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY is not configured");
  }

  const response = await fetch(`${FIRECRAWL_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.FIRECRAWL_API_KEY,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firecrawl request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

export async function scrapeUrls(urls: string[]) {
  const results: FirecrawlResult[] = [];

  for (const url of urls) {
    try {
      const data = await firecrawlFetch<{ content: string; raw?: unknown }>(
        "/v1/scrape",
        {
          method: "POST",
          body: JSON.stringify({ url, onlyMainContent: false })
        }
      );
      results.push({ url, content: data.content, raw: data.raw });
    } catch (error) {
      if (error instanceof Error) {
        // eslint-disable-next-line no-console
        console.warn(`Firecrawl scrape failed for ${url}: ${error.message}`);
      }
    }
  }

  return results;
}
