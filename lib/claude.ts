import { getServerEnv } from "@/lib/env";

const env = getServerEnv();

type AnthropicClient = {
  messages: {
    create: (args: {
      model: string;
      max_tokens: number;
      temperature: number;
      system: string;
      messages: Array<{
        role: "user" | "assistant";
        content: Array<{ type: "text"; text: string }>;
      }>;
    }) => Promise<{
      content: Array<{ type: "text"; text: string }>;
    }>;
  };
};

let anthropicClient: AnthropicClient | null = null;

async function getAnthropic() {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  if (!anthropicClient) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    anthropicClient = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY
    }) as AnthropicClient;
  }

  return anthropicClient;
}

export interface EnrichmentPromptInput {
  contact: {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    domain?: string | null;
  };
  scrapedPages: Array<{
    url: string;
    content: string;
  }>;
}

export interface EnrichmentPromptOutput {
  classification: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  country?: string;
  psLine?: string;
  psSourceUrl?: string;
  addressSourceUrl?: string;
  approvalBlock: string;
}

const SYSTEM_PROMPT = `
You are an outreach research assistant that creates structured JSON responses. Always respond with valid JSON.

Classification rules:
- If the company sells products direct to consumers online → "Online Retailer"
- If the company core service is direct mail → "Direct Mail Agency"
- If the company buys or plans multi-channel paid media → "Ad Agency"
- If the company specialises in ecommerce brands or platforms → "eComm Agency"
- Otherwise → "Marketing Agency"

Approval block format:
CONTACT: [Name] at [Company]
ADDRESS FOUND: [Full address]
SOURCE: [URL]
CLASSIFICATION: [Company Type]
P.S. LINE: [Personalized line]
P.S. SOURCE: [URL]

The postal address should be specific enough to mail handwritten letters. If no address is available, leave address fields empty and explain in the approval block.

P.S. line should reference a verifiable update, win, or news item in the last 3-6 months. Must be 20 words or fewer and include a source URL separate from the address source. If nothing is found, use the fallback: "P.S. Life's too short for boring mail. Enjoy the chocolate!" with an empty source URL.

Output schema:
{
  "classification": string,
  "addressLine1": string | null,
  "addressLine2": string | null,
  "city": string | null,
  "postcode": string | null,
  "country": string | null,
  "psLine": string,
  "psSourceUrl": string | null,
  "addressSourceUrl": string | null,
  "approvalBlock": string
}
`.trim();

export async function generateEnrichmentInsights(
  input: EnrichmentPromptInput
): Promise<EnrichmentPromptOutput> {
  const anthropic = await getAnthropic();

  const { contact, scrapedPages } = input;

  const context = scrapedPages
    .map(
      (page) =>
        `URL: ${page.url}
CONTENT:
${page.content.slice(0, 6000)}`
    )
    .join("\n\n---\n\n");

  const response = await anthropic.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 800,
    temperature: 0.2,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `
Contact:
- Name: ${contact.firstName ?? ""} ${contact.lastName ?? ""}
- Company: ${contact.company ?? ""}
- Domain: ${contact.domain ?? ""}

Scraped pages:
${context}
            `.trim()
          }
        ]
      }
    ]
  });

  const textContent = response.content
    .filter((item): item is { type: "text"; text: string } => item.type === "text")
    .map((item) => item.text)
    .join("\n");

  let parsed: EnrichmentPromptOutput | null = null;

  try {
    parsed = JSON.parse(textContent) as EnrichmentPromptOutput;
  } catch (error) {
    throw new Error(
      `Failed to parse Claude enrichment response: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }

  if (!parsed.approvalBlock) {
    throw new Error("Claude enrichment response missing approval block");
  }

  return parsed;
}
