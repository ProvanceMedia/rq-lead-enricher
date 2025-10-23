import { NextRequest, NextResponse } from 'next/server';
import { db, prospects, enrichmentActivity } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import { ApolloService } from '@/lib/services/apollo';

export const dynamic = 'force-dynamic';

/**
 * Send approved prospects to Hub Spot
 *
 * Flow:
 * 1. User approves discovered prospects
 * 2. System triggers Apollo bulk enrichment (phone/email)
 * 3. Apollo processes asynchronously and sends to webhook
 * 4. Webhook creates HubSpot contacts with enriched data
 */
export async function POST(request: NextRequest) {
  try {
    const { prospectIds } = await request.json();

    if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json(
        { error: 'prospectIds array is required' },
        { status: 400 }
      );
    }

    // Fetch prospects
    const selectedProspects = await db
      .select()
      .from(prospects)
      .where(inArray(prospects.id, prospectIds));

    if (selectedProspects.length === 0) {
      return NextResponse.json(
        { error: 'No prospects found' },
        { status: 404 }
      );
    }

    // Check if any prospects are not in 'discovered' status
    const invalidProspects = selectedProspects.filter(
      (p) => p.enrichmentStatus !== 'discovered'
    );

    if (invalidProspects.length > 0) {
      return NextResponse.json(
        {
          error: 'Some prospects are not in discovered status',
          invalid: invalidProspects.map((p) => ({
            id: p.id,
            email: p.email,
            status: p.enrichmentStatus,
          })),
        },
        { status: 400 }
      );
    }

    const apollo = new ApolloService();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://monkfish-app-8jphr.ondigitalocean.app';
    const webhookUrl = `${baseUrl}/api/webhooks/apollo-enrichment`;

    // If user selected only one prospect, use single enrichment via person_id
    if (selectedProspects.length === 1) {
      const [prospect] = selectedProspects;

      if (!prospect.apolloId) {
        return NextResponse.json(
          { error: 'Prospect is missing Apollo ID and cannot be enriched.' },
          { status: 400 }
        );
      }

      try {
        console.log(`Enriching single prospect via Apollo ID ${prospect.apolloId}`);

        // Log activity for auditing
        await db.insert(enrichmentActivity).values({
          prospectId: prospect.id,
          action: 'apollo_enrichment_started',
          details: {
            mode: 'single',
            apolloId: prospect.apolloId,
          },
          performedBy: 'user',
        });

        await db
          .update(prospects)
          .set({
            enrichmentStatus: 'apollo_enriching',
            updatedAt: new Date(),
          })
          .where(eq(prospects.id, prospect.id));

        const enrichmentResponse = await apollo.enrichPerson({
          person_id: prospect.apolloId,
          first_name: prospect.firstName || undefined,
          last_name: prospect.lastName || undefined,
          email: prospect.email || undefined,
          organization_name: prospect.companyName || undefined,
          domain: prospect.companyDomain || undefined,
          webhook_url: webhookUrl,
        });

        if (!enrichmentResponse) {
          throw new Error('Apollo did not return enrichment data for this contact.');
        }

        const matches =
          enrichmentResponse.matches ||
          enrichmentResponse.people ||
          (enrichmentResponse.person ? [enrichmentResponse.person] : undefined);

        if (matches && matches.length > 0) {
          // Process match immediately using shared logic
          const { processApolloMatches } = await import('@/lib/services/apollo-webhook-processor');
          const result = await processApolloMatches(matches);

          return NextResponse.json({
            success: true,
            prospectCount: 1,
            processed: result.processed,
            created: result.created,
            failed: result.failed,
            message:
              result.created > 0
                ? 'Apollo enrichment completed and HubSpot updated.'
                : 'Apollo enrichment processed but HubSpot update may have failed. Check activity logs.',
          });
        }

        if (enrichmentResponse.id) {
          await db
            .update(prospects)
            .set({
              apolloEnrichmentId: enrichmentResponse.id,
              enrichmentStatus: 'apollo_enriching',
              updatedAt: new Date(),
            })
            .where(eq(prospects.id, prospect.id));

          return NextResponse.json({
            success: true,
            enrichmentId: enrichmentResponse.id,
            prospectCount: 1,
            message: 'Apollo enrichment started. Results will be processed automatically once ready.',
          });
        }

        throw new Error('Apollo response did not include matches or bulk enrichment ID.');
      } catch (apolloError: any) {
        console.error('Apollo single enrichment error:', apolloError);

        await db
          .update(prospects)
          .set({
            enrichmentStatus: 'failed',
            updatedAt: new Date(),
          })
          .where(eq(prospects.id, prospect.id));

        await db.insert(enrichmentActivity).values({
          prospectId: prospect.id,
          action: 'apollo_enrichment_failed',
          details: {
            mode: 'single',
            error: apolloError.message,
          },
          performedBy: 'system',
        });

        return NextResponse.json(
          {
            error: 'Failed to enrich prospect via Apollo',
            message: apolloError.message,
          },
          { status: 500 }
        );
      }
    }

    // Otherwise fall back to bulk enrichment for multiple prospects
    console.log(`Sending ${selectedProspects.length} prospects to Apollo for enrichment`);
    console.log(`Webhook URL: ${webhookUrl}`);

    // Prepare people for Apollo bulk enrichment - pass Apollo ID when available
    const people = selectedProspects.map((p) => ({
      id: p.apolloId || undefined,
      first_name: p.firstName || undefined,
      last_name: p.lastName || undefined,
      email: p.email || undefined,
      organization_name: p.companyName || undefined,
      domain: p.companyDomain || undefined,
    }));

    try {
      // Trigger Apollo bulk enrichment
      const enrichmentResult = await apollo.bulkEnrichPeople(people, webhookUrl);

      if (!enrichmentResult) {
        throw new Error('Apollo bulk enrichment failed to start');
      }

      console.log(`Apollo bulk enrichment result: ${enrichmentResult.id}, status: ${enrichmentResult.status}`);

      // Check if we got synchronous results
      if (enrichmentResult.matches && enrichmentResult.matches.length > 0) {
        console.log(`Got ${enrichmentResult.matches.length} matches synchronously, processing immediately...`);

        // Process matches immediately using shared logic
        const { processApolloMatches } = await import('@/lib/services/apollo-webhook-processor');
        const result = await processApolloMatches(enrichmentResult.matches);

        return NextResponse.json({
          success: true,
          enrichmentId: enrichmentResult.id,
          prospectCount: selectedProspects.length,
          processed: result.processed,
          created: result.created,
          failed: result.failed,
          message: `Apollo enrichment completed! ${result.created} prospect(s) added to HubSpot.`,
        });
      }

      // Async response - update status and wait for webhook
      await db
        .update(prospects)
        .set({
          enrichmentStatus: 'apollo_enriching',
          apolloEnrichmentId: enrichmentResult.id,
          updatedAt: new Date(),
        })
        .where(inArray(prospects.id, prospectIds));

      // Log activity for each prospect
      for (const prospect of selectedProspects) {
        await db.insert(enrichmentActivity).values({
          prospectId: prospect.id,
          action: 'apollo_enrichment_started',
          details: {
            enrichmentId: enrichmentResult.id,
            webhookUrl,
          },
          performedBy: 'user',
        });
      }

      return NextResponse.json({
        success: true,
        enrichmentId: enrichmentResult.id,
        prospectCount: selectedProspects.length,
        message: `Apollo enrichment started for ${selectedProspects.length} prospects. Results will be sent to HubSpot automatically when ready.`,
      });
    } catch (apolloError: any) {
      console.error('Apollo enrichment error:', apolloError);

      // Mark prospects as failed
      await db
        .update(prospects)
        .set({
          enrichmentStatus: 'failed',
          updatedAt: new Date(),
        })
        .where(inArray(prospects.id, prospectIds));

      // Log failure
      for (const prospect of selectedProspects) {
        await db.insert(enrichmentActivity).values({
          prospectId: prospect.id,
          action: 'apollo_enrichment_failed',
          details: {
            error: apolloError.message,
          },
          performedBy: 'system',
        });
      }

      return NextResponse.json(
        {
          error: 'Failed to start Apollo enrichment',
          message: apolloError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Send to HubSpot error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', message: error.message },
      { status: 500 }
    );
  }
}
