/**
 * HubSpot Contact Enrichment Agent
 *
 * Uses Claude Agent SDK to intelligently enrich HubSpot contacts with:
 * - Physical addresses (from website, directories, Companies House)
 * - Company classification
 * - Personalized P.S. lines
 */

import { Anthropic } from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

// Environment variables
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN!;
const APOLLO_API_KEY = process.env.APOLLO_API_KEY!;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Agent instructions - the expertise that makes Claude intelligent
const AGENT_INSTRUCTIONS = `# HubSpot Contact Enrichment Agent

## Agent Profile
You are an experienced CRM data specialist. Execute tasks efficiently with minimal commentary. Provide concise summaries only when approval is needed.

## Core Workflow

### 1. Contact Retrieval
- Use hubspot_search_contact to find the contact by email
- Retrieve existing contact details
- **CRITICAL:** Always verify address with fresh research, regardless of existing data
- Proceed directly to address research

### 2. Address Research Execution

Execute in order - no status updates between steps:

**STEP 1:** Use firecrawl_scrape to scrape the company website homepage (set onlyMainContent: false)

**STEP 2:** If address not found, scrape these pages using firecrawl_scrape:
1. Contact Us page (try /contact, /contact-us, /pages/contact-us)
2. About Us page (try /about, /about-us, /pages/about-us)
3. Privacy Policy (try /privacy-policy, /privacy, /pages/privacy-and-security)
4. Terms and Conditions (try /terms, /terms-and-conditions, /pages/terms)

**STEP 3:** If still not found, use web_search with queries like:
- "{company name} address UK"
- "{company name} contact address"
- Look in business directories (Google Business, Yelp)

**STEP 4:** Last resort - use web_search with:
- "companies house {company name}"
- Find registered office address (note: often outdated)

### 3. Company Classification

Analyze during address research. Apply decision tree:

1. Sells products direct to consumers online → **Online Retailer**
2. Core service is direct mail → **Direct Mail Agency**
3. Buys/plans multi-channel paid media (TV/OOH/etc.) → **Ad Agency**
4. Specializes in ecommerce brands/platforms → **eComm Agency**
5. Default → **Marketing Agency**

### 4. P.S. Line Research

Execute without commentary:
1. Search for recent wins/news (last 3-6 months) from company website or LinkedIn
2. Generate personalized line (max 20 words) with source URL
3. If nothing found, use default: "P.S. Life's too short for boring mail. Enjoy the chocolate!"

### 5. Approval Request

Present findings in this EXACT format:

\`\`\`
CONTACT: [Name] at [Company]
ADDRESS FOUND: [Full address or "Not found"]
SOURCE: [URL where found]
CLASSIFICATION: [Company Type]
P.S. LINE: [Personalized line]
P.S. SOURCE: [URL or "default"]

Ready to update HubSpot?
\`\`\`

### 6. HubSpot Update (After Approval)

**Field Mapping:**
- \`address\` → Company name ONLY
- \`street_address_line_2\` → First line of physical address
- \`street_address_line_3\` → Second line of physical address (usually empty)
- \`city\` → City only
- \`zip\` → Postal code
- \`country\` → Full country name
- \`company_type\` → Classification
- \`lifecyclestage\` → "1101494863" (Enriched Prospect ID)
- \`outbound_cauldron_stage\` → "3. Address Procured"
- \`custom_p_s__line\` → P.S. line

**Address Format Expected:**
Line 1: Company Name
Line 2: Full Street Address (all on ONE line)
Line 3: City, Postal Code
Line 4: Country

Example parsed:
\`\`\`
address: "Muscle Foods Limited"
street_address_line_2: "23-25 Park Lane Business Centre, Park Lane Old Basford"
street_address_line_3: ""
city: "Nottingham"
zip: "NG6 0DW"
country: "United Kingdom"
\`\`\`

Use hubspot_update_contact with the parsed fields.

## Behavioral Rules
- No progress updates or commentary during research
- Execute all research tasks (Steps 1-4) without interruption
- **MUST stop and request approval before any HubSpot updates**
- One-line confirmation after update
- Never update HubSpot without explicit user approval

## Error Handling
- If tools fail, try alternative approach silently
- Only report if completely unable to find address after all sources exhausted
- Be creative and persistent in finding addresses`;

/**
 * Define custom tools for the agent
 */
function createEnrichmentTools() {
  return [
    {
      name: 'hubspot_search_contact',
      description: 'Search for a HubSpot contact by email address',
      input_schema: {
        type: 'object' as const,
        properties: {
          email: {
            type: 'string',
            description: 'Email address to search for'
          }
        },
        required: ['email']
      },
      handler: async (input: { email: string }) => {
        const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filterGroups: [{
              filters: [{
                propertyName: 'email',
                operator: 'EQ',
                value: input.email
              }]
            }],
            properties: [
              'firstname', 'lastname', 'email', 'company',
              'address', 'street_address_line_2', 'street_address_line_3',
              'city', 'state', 'zip', 'country', 'website',
              'company_type', 'lifecyclestage', 'outbound_cauldron_stage',
              'custom_p_s__line'
            ]
          })
        });

        const data = await response.json();
        const results = data.results || [];

        if (results.length === 0) {
          return { error: `No contact found with email: ${input.email}` };
        }

        return results[0];
      }
    },
    {
      name: 'hubspot_update_contact',
      description: 'Update a HubSpot contact with enriched data',
      input_schema: {
        type: 'object' as const,
        properties: {
          contact_id: {
            type: 'string',
            description: 'HubSpot contact ID'
          },
          properties: {
            type: 'object',
            description: 'Properties to update',
            properties: {
              address: { type: 'string' },
              street_address_line_2: { type: 'string' },
              street_address_line_3: { type: 'string' },
              city: { type: 'string' },
              zip: { type: 'string' },
              country: { type: 'string' },
              company_type: { type: 'string' },
              custom_p_s__line: { type: 'string' },
              lifecyclestage: { type: 'string' },
              outbound_cauldron_stage: { type: 'string' }
            }
          }
        },
        required: ['contact_id', 'properties']
      },
      handler: async (input: { contact_id: string; properties: Record<string, string> }) => {
        const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${input.contact_id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ properties: input.properties })
        });

        if (!response.ok) {
          return { error: `Failed to update contact: ${response.statusText}` };
        }

        return { success: true, message: 'Contact updated successfully' };
      }
    },
    {
      name: 'apollo_enrich_person',
      description: 'Enrich person data using Apollo.io',
      input_schema: {
        type: 'object' as const,
        properties: {
          email: { type: 'string', description: 'Email address' },
          first_name: { type: 'string', description: 'First name (optional)' },
          last_name: { type: 'string', description: 'Last name (optional)' }
        },
        required: ['email']
      },
      handler: async (input: { email: string; first_name?: string; last_name?: string }) => {
        const params = new URLSearchParams({ email: input.email });
        if (input.first_name) params.append('first_name', input.first_name);
        if (input.last_name) params.append('last_name', input.last_name);

        const response = await fetch(`https://api.apollo.io/v1/people/match?${params}`, {
          headers: {
            'X-Api-Key': APOLLO_API_KEY,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          return { error: 'Apollo enrichment failed' };
        }

        const data = await response.json();
        return data.person || { error: 'No data found' };
      }
    },
    {
      name: 'firecrawl_scrape',
      description: 'Scrape a website page and return markdown content',
      input_schema: {
        type: 'object' as const,
        properties: {
          url: {
            type: 'string',
            description: 'URL to scrape'
          },
          onlyMainContent: {
            type: 'boolean',
            description: 'Extract only main content (default: false)',
            default: false
          }
        },
        required: ['url']
      },
      handler: async (input: { url: string; onlyMainContent?: boolean }) => {
        const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: input.url,
            pageOptions: {
              onlyMainContent: input.onlyMainContent ?? false
            }
          })
        });

        if (!response.ok) {
          return { error: `Failed to scrape ${input.url}` };
        }

        const data = await response.json();
        if (data.success && data.data) {
          return {
            url: input.url,
            content: data.data.markdown || data.data.html || '',
            length: (data.data.markdown || data.data.html || '').length
          };
        }

        return { error: 'No content retrieved' };
      }
    },
    {
      name: 'web_search',
      description: 'Search the web for information (uses Google search)',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          }
        },
        required: ['query']
      },
      handler: async (input: { query: string }) => {
        // This is a placeholder - in production you'd use:
        // - Google Custom Search API
        // - Brave Search API
        // - SerpAPI
        // For now, we return a helpful message
        return {
          note: 'Web search requires additional API setup',
          suggestion: 'Try using firecrawl_scrape with specific URLs instead',
          query: input.query
        };
      }
    }
  ];
}

/**
 * Prompt user for input
 */
function getUserInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

/**
 * Run the enrichment agent for a contact
 */
async function enrichContact(email: string) {
  console.log(`\n🚀 Starting enrichment for: ${email}\n`);

  const tools = createEnrichmentTools();
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Please enrich the HubSpot contact with email: ${email}

Follow the enrichment workflow:
1. Search for the contact in HubSpot
2. Enrich with Apollo if needed
3. Research the company address (website → directories → Companies House)
4. Classify the company type
5. Generate a personalized P.S. line
6. Present findings for approval
7. Wait for my approval before updating HubSpot

Begin now.`
    }
  ];

  let continueLoop = true;
  let iterationCount = 0;
  const MAX_ITERATIONS = 20;

  while (continueLoop && iterationCount < MAX_ITERATIONS) {
    iterationCount++;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: AGENT_INSTRUCTIONS,
      messages,
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema
      }))
    });

    console.log(`\n[Iteration ${iterationCount}] Stop reason: ${response.stop_reason}`);

    // Add assistant response to messages
    messages.push({
      role: 'assistant',
      content: response.content
    });

    // Handle tool calls
    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.MessageParam['content'] = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`\n🔧 Tool: ${block.name}`);
          console.log(`   Input: ${JSON.stringify(block.input, null, 2).substring(0, 200)}...`);

          const tool = tools.find(t => t.name === block.name);
          if (tool) {
            try {
              const result = await tool.handler(block.input as any);
              console.log(`   Result: ${JSON.stringify(result, null, 2).substring(0, 200)}...`);

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result)
              });
            } catch (error: any) {
              console.error(`   Error: ${error.message}`);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify({ error: error.message }),
                is_error: true
              });
            }
          }
        }
      }

      // Add tool results to messages
      messages.push({
        role: 'user',
        content: toolResults
      });
    } else if (response.stop_reason === 'end_turn') {
      // Claude has finished and is waiting for approval
      for (const block of response.content) {
        if (block.type === 'text') {
          console.log(`\n${block.text}`);
        }
      }

      // Check if this is the approval request
      const lastText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b: Anthropic.TextBlock) => b.text)
        .join('\n');

      if (lastText.includes('Ready to update HubSpot?')) {
        // This is the approval request - get user input
        const userResponse = await getUserInput('\n👉 Type "yes" to approve or "no" to cancel: ');

        // Add user response to messages
        messages.push({
          role: 'user',
          content: userResponse
        });

        // If user said no, stop the loop
        if (userResponse === 'no' || userResponse === 'n') {
          console.log('\n❌ Update cancelled by user');
          continueLoop = false;
        }
        // Otherwise continue the loop - agent will process the approval
      } else {
        // Agent finished without requesting approval
        continueLoop = false;
      }
    } else {
      // Unexpected stop reason
      console.log(`\nUnexpected stop reason: ${response.stop_reason}`);
      continueLoop = false;
    }
  }

  if (iterationCount >= MAX_ITERATIONS) {
    console.log('\n⚠️  Reached maximum iterations');
  }

  return messages;
}

// CLI interface
async function main() {
  const email = process.argv[2] || 'rich.milham@musclefood.com';

  try {
    await enrichContact(email);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { enrichContact, createEnrichmentTools };
