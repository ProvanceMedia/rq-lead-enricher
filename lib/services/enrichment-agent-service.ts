import { spawn } from 'child_process';
import { db, prospects, enrichments, enrichmentActivity } from '@/db';
import { eq } from 'drizzle-orm';
import * as path from 'path';

/**
 * Enrichment Agent Service
 *
 * Wraps enrichment-agent.ts to run enrichments programmatically
 * and store results in the database for approval workflow.
 */

export interface EnrichmentResult {
  success: boolean;
  enrichmentId?: string;
  error?: string;
  data?: {
    contact: string;
    company: string;
    address?: string;
    addressSource?: string;
    classification?: string;
    psLine?: string;
    psSource?: string;
  };
}

export interface BulkEnrichmentResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    prospectId: string;
    email: string;
    success: boolean;
    enrichmentId?: string;
    error?: string;
  }>;
}

export class EnrichmentAgentService {
  /**
   * Enrich a single prospect by ID
   */
  async enrichProspect(prospectId: string): Promise<EnrichmentResult> {
    try {
      // Get prospect from database
      const [prospect] = await db
        .select()
        .from(prospects)
        .where(eq(prospects.id, prospectId))
        .limit(1);

      if (!prospect) {
        return { success: false, error: 'Prospect not found' };
      }

      if (!prospect.email) {
        return { success: false, error: 'Prospect has no email' };
      }

      // Update prospect status to enriching
      await db
        .update(prospects)
        .set({
          enrichmentStatus: 'enriching',
          lastEnrichmentAttempt: new Date(),
          enrichmentAttempts: (prospect.enrichmentAttempts || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(prospects.id, prospectId));

      // Run enrichment agent
      const agentResult = await this.runEnrichmentAgent(prospect.email);

      if (!agentResult.success) {
        // Mark as failed
        await db
          .update(prospects)
          .set({
            enrichmentStatus: 'failed',
            updatedAt: new Date(),
          })
          .where(eq(prospects.id, prospectId));

        return {
          success: false,
          error: agentResult.error || 'Enrichment failed',
        };
      }

      // Parse enrichment results and create enrichment record
      const parsedData = this.parseAgentOutput(agentResult.output || '');

      const [enrichment] = await db
        .insert(enrichments)
        .values({
          prospectId: prospect.id,
          status: 'awaiting_approval',
          addressFound: !!parsedData.address,
          companyNameForAddress: parsedData.company || prospect.companyName,
          streetAddressLine2: parsedData.addressLine2,
          streetAddressLine3: parsedData.addressLine3,
          city: parsedData.city,
          zip: parsedData.zip,
          country: parsedData.country,
          addressSource: parsedData.addressSource,
          companyType: parsedData.classification as any,
          psLine: parsedData.psLine,
          psSource: parsedData.psSource,
          enrichmentStartedAt: new Date(),
          enrichmentCompletedAt: new Date(),
        })
        .returning();

      // Update prospect status
      await db
        .update(prospects)
        .set({
          enrichmentStatus: 'enriched',
          updatedAt: new Date(),
        })
        .where(eq(prospects.id, prospectId));

      // Log activity
      await db.insert(enrichmentActivity).values({
        enrichmentId: enrichment.id,
        prospectId: prospect.id,
        action: 'enrichment_completed',
        details: {
          addressFound: !!parsedData.address,
          classification: parsedData.classification,
        },
        performedBy: 'system',
      });

      return {
        success: true,
        enrichmentId: enrichment.id,
        data: {
          contact: parsedData.contact || '',
          company: parsedData.company || '',
          address: parsedData.address,
          addressSource: parsedData.addressSource,
          classification: parsedData.classification,
          psLine: parsedData.psLine,
          psSource: parsedData.psSource,
        },
      };
    } catch (error: any) {
      console.error('Enrichment error:', error);

      // Mark as failed
      try {
        await db
          .update(prospects)
          .set({
            enrichmentStatus: 'failed',
            updatedAt: new Date(),
          })
          .where(eq(prospects.id, prospectId));
      } catch (dbError) {
        console.error('Failed to update prospect status:', dbError);
      }

      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Enrich multiple prospects in parallel (with concurrency limit)
   */
  async enrichProspectsBulk(
    prospectIds: string[],
    concurrency: number = 3
  ): Promise<BulkEnrichmentResult> {
    const results: BulkEnrichmentResult['results'] = [];
    let succeeded = 0;
    let failed = 0;

    // Process in batches to respect concurrency limit
    for (let i = 0; i < prospectIds.length; i += concurrency) {
      const batch = prospectIds.slice(i, i + concurrency);

      const batchResults = await Promise.all(
        batch.map(async (prospectId) => {
          const [prospect] = await db
            .select()
            .from(prospects)
            .where(eq(prospects.id, prospectId))
            .limit(1);

          const result = await this.enrichProspect(prospectId);

          if (result.success) {
            succeeded++;
          } else {
            failed++;
          }

          return {
            prospectId,
            email: prospect?.email || '',
            success: result.success,
            enrichmentId: result.enrichmentId,
            error: result.error,
          };
        })
      );

      results.push(...batchResults);

      // Small delay between batches
      if (i + concurrency < prospectIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      total: prospectIds.length,
      succeeded,
      failed,
      results,
    };
  }

  /**
   * Run enrichment-agent.ts as child process
   */
  private async runEnrichmentAgent(email: string): Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const agentPath = path.join(process.cwd(), 'enrichment-agent.ts');
      let output = '';
      let errorOutput = '';

      const child = spawn('npx', ['tsx', agentPath, email], {
        cwd: process.cwd(),
        env: process.env,
      });

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0 || output.includes('Ready to update HubSpot?')) {
          resolve({ success: true, output });
        } else {
          resolve({
            success: false,
            error: errorOutput || 'Agent process failed',
          });
        }
      });

      child.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });

      // Auto-respond "no" to approval prompt (we handle approval in UI)
      setTimeout(() => {
        try {
          child.stdin.write('no\n');
          child.stdin.end();
        } catch (e) {
          // Ignore if stdin already closed
        }
      }, 30000); // Wait 30s for agent to complete, then auto-cancel
    });
  }

  /**
   * Parse agent output to extract enrichment data
   */
  private parseAgentOutput(output: string): {
    contact?: string;
    company?: string;
    address?: string;
    addressLine2?: string;
    addressLine3?: string;
    city?: string;
    zip?: string;
    country?: string;
    addressSource?: string;
    classification?: string;
    psLine?: string;
    psSource?: string;
  } {
    const result: any = {};

    // Extract contact name and company
    const contactMatch = output.match(/CONTACT:\s*(.+?)\s+at\s+(.+)/);
    if (contactMatch) {
      result.contact = contactMatch[1].trim();
      result.company = contactMatch[2].trim();
    }

    // Extract address
    const addressMatch = output.match(/ADDRESS FOUND:\s*(.+)/);
    if (addressMatch && !addressMatch[1].includes('Not found')) {
      result.address = addressMatch[1].trim();

      // Parse address into components
      const addressParts = result.address.split(',').map((p: string) => p.trim());
      if (addressParts.length >= 3) {
        // Format: Street, City Postcode, Country
        result.addressLine2 = addressParts[0];

        // Parse "City Postcode"
        const cityPostal = addressParts[addressParts.length - 2];
        const cityPostalMatch = cityPostal.match(/^(.+?)\s+([A-Z0-9\s-]+)$/);
        if (cityPostalMatch) {
          result.city = cityPostalMatch[1].trim();
          result.zip = cityPostalMatch[2].trim();
        } else {
          result.city = cityPostal;
        }

        result.country = addressParts[addressParts.length - 1];
      }
    }

    // Extract address source
    const sourceMatch = output.match(/SOURCE:\s*(.+)/);
    if (sourceMatch) {
      result.addressSource = sourceMatch[1].trim();
    }

    // Extract classification
    const classificationMatch = output.match(/CLASSIFICATION:\s*(.+)/);
    if (classificationMatch) {
      result.classification = classificationMatch[1].trim();
    }

    // Extract P.S. line
    const psMatch = output.match(/P\.S\. LINE:\s*(.+)/);
    if (psMatch) {
      result.psLine = psMatch[1].trim();
    }

    // Extract P.S. source
    const psSourceMatch = output.match(/P\.S\. SOURCE:\s*(.+)/);
    if (psSourceMatch) {
      result.psSource = psSourceMatch[1].trim();
    }

    return result;
  }
}
