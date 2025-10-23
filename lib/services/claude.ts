import Anthropic from '@anthropic-ai/sdk';

export type CompanyType =
  | 'Online Retailer'
  | 'Direct Mail Agency'
  | 'Ad Agency'
  | 'eComm Agency'
  | 'Marketing Agency';

export interface CompanyClassificationResult {
  companyType: CompanyType;
  reasoning: string;
}

export interface PSLineResult {
  psLine: string;
  source: string;
}

export class ClaudeService {
  private client: Anthropic;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY || '';
    if (!key) {
      throw new Error('Anthropic API key is required');
    }
    this.client = new Anthropic({ apiKey: key });
  }

  async extractAddress(websiteContent: string, companyName: string): Promise<string | null> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Extract the physical business address from the following website content for "${companyName}".

IMPORTANT: Return ONLY the address in this exact format:
Company Name
Street Line 1
Street Line 2 (if applicable)
City, Postal Code
Country

If no address is found, respond with "NO_ADDRESS_FOUND"

Website content:
${websiteContent.substring(0, 8000)}`,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      if (text.includes('NO_ADDRESS_FOUND')) {
        return null;
      }

      return text.trim();
    } catch (error: any) {
      console.error('Claude API error (extract address):', error.message);
      throw new Error(`Failed to extract address: ${error.message}`);
    }
  }

  async classifyCompany(
    companyName: string,
    websiteContent: string,
    companyDescription?: string
  ): Promise<CompanyClassificationResult> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `Classify the following company into ONE of these categories based on the decision tree:

1. Sells products direct to consumers online → "Online Retailer"
2. Core service is direct mail → "Direct Mail Agency"
3. Buys/plans multi-channel paid media (TV/OOH/etc.) → "Ad Agency"
4. Specializes in ecommerce brands/platforms → "eComm Agency"
5. Default → "Marketing Agency"

Company: ${companyName}
${companyDescription ? `Description: ${companyDescription}` : ''}

Website content (sample):
${websiteContent.substring(0, 6000)}

Respond in JSON format:
{
  "companyType": "<category>",
  "reasoning": "<brief explanation>"
}`,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          companyType: result.companyType as CompanyType,
          reasoning: result.reasoning || '',
        };
      }

      return {
        companyType: 'Marketing Agency',
        reasoning: 'Default classification',
      };
    } catch (error: any) {
      console.error('Claude API error (classify company):', error.message);
      return {
        companyType: 'Marketing Agency',
        reasoning: 'Error in classification',
      };
    }
  }

  async generatePSLine(
    companyName: string,
    linkedinProfile?: string,
    companyLinkedin?: string,
    websiteNews?: string
  ): Promise<PSLineResult> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: `Generate a personalized P.S. line (max 20 words) for a direct mail letter to "${companyName}".

Look for recent wins, news, awards, or achievements from the last 3-6 months from these sources:
${linkedinProfile ? `- Personal LinkedIn: ${linkedinProfile}` : ''}
${companyLinkedin ? `- Company LinkedIn: ${companyLinkedin}` : ''}
${websiteNews ? `- Website/News: ${websiteNews}` : ''}

If you find something specific, create a congratulatory or relevant P.S. line.
If nothing found, use the default: "P.S. Life's too short for boring mail. Enjoy the chocolate!"

Respond in JSON format:
{
  "psLine": "<the P.S. line>",
  "source": "<URL where info was found, or 'default' if using default line>"
}`,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          psLine: result.psLine || "P.S. Life's too short for boring mail. Enjoy the chocolate!",
          source: result.source || 'default',
        };
      }

      return {
        psLine: "P.S. Life's too short for boring mail. Enjoy the chocolate!",
        source: 'default',
      };
    } catch (error: any) {
      console.error('Claude API error (generate PS line):', error.message);
      return {
        psLine: "P.S. Life's too short for boring mail. Enjoy the chocolate!",
        source: 'default',
      };
    }
  }
}
