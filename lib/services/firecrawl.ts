import axios from 'axios';

const FIRECRAWL_API_BASE = 'https://api.firecrawl.dev/v0';

export interface FirecrawlScrapeOptions {
  url: string;
  onlyMainContent?: boolean;
}

export interface FirecrawlScrapeResult {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: any;
  };
  error?: string;
}

export class FirecrawlService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FIRECRAWL_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(
        'Firecrawl API key is required. Please set FIRECRAWL_API_KEY environment variable in DigitalOcean App Platform: Settings > App-Level Environment Variables'
      );
    }
  }

  async scrape(options: FirecrawlScrapeOptions): Promise<string> {
    try {
      const response = await axios.post(
        `${FIRECRAWL_API_BASE}/scrape`,
        {
          url: options.url,
          pageOptions: {
            onlyMainContent: options.onlyMainContent !== undefined ? options.onlyMainContent : false,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success && response.data.data) {
        return response.data.data.markdown || response.data.data.html || '';
      }

      throw new Error(response.data.error || 'Failed to scrape URL');
    } catch (error: any) {
      console.error('Firecrawl API error:', error.response?.data || error.message);
      throw new Error(`Failed to scrape with Firecrawl: ${error.message}`);
    }
  }

  async scrapeMultiplePages(urls: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const url of urls) {
      try {
        const content = await this.scrape({ url, onlyMainContent: false });
        results.set(url, content);
      } catch (error) {
        console.error(`Failed to scrape ${url}:`, error);
        results.set(url, '');
      }
    }

    return results;
  }
}
