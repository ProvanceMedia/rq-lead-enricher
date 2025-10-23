import { NextRequest, NextResponse } from 'next/server';
import { db, prospects, enrichmentActivity } from '@/db';
import { eq } from 'drizzle-orm';
import { HubSpotService } from '@/lib/services/hubspot';

export const dynamic = 'force-dynamic';

/**
 * Webhook endpoint for Apollo.io bulk enrichment callbacks
 *
 * Apollo sends enriched prospect data to this endpoint after processing
 * We then update our database and create HubSpot contacts
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('Apollo enrichment webhook received:', JSON.stringify(payload, null, 2));

    // Apollo bulk enrichment response format:
    // {
    //   "matches": [
    //     {
    //       "id": "apollo_person_id",
    //       "first_name": "John",
    //       "last_name": "Doe",
    //       "email": "john@example.com",
    //       "phone_numbers": [
    //         { "raw_number": "+1234567890", "sanitized_number": "1234567890", "type": "work", "status": "valid" }
    //       ],
    //       "mobile_phone": "+0987654321",
    //       "organization": { ... }
    //     }
    //   ]
    // }

    const matches = payload.matches || [];
    const hubspot = new HubSpotService();

    let processed = 0;
    let created = 0;
    let failed = 0;

    for (const match of matches) {
      try {
        // Find prospect by Apollo ID or email
        const [prospect] = await db
          .select()
          .from(prospects)
          .where(eq(prospects.apolloId, match.id))
          .limit(1);

        if (!prospect) {
          console.warn(`Prospect not found for Apollo ID: ${match.id}`);
          continue;
        }

        // Extract phone numbers from Apollo response
        const workPhone = match.phone_numbers?.find((p: any) =>
          p.type === 'work' && p.status === 'valid'
        )?.sanitized_number;

        const mobilePhone = match.mobile_phone;

        // Update prospect with enriched data
        await db
          .update(prospects)
          .set({
            phone: workPhone || null,
            mobilePhone: mobilePhone || null,
            apolloEnrichedData: match,
            apolloEnrichedAt: new Date(),
            enrichmentStatus: 'in_hubspot', // Will be created in HubSpot next
            updatedAt: new Date(),
          })
          .where(eq(prospects.id, prospect.id));

        // Log activity
        await db.insert(enrichmentActivity).values({
          prospectId: prospect.id,
          action: 'apollo_enriched',
          details: {
            phone: workPhone,
            mobilePhone: mobilePhone,
            apolloId: match.id,
          },
          performedBy: 'apollo-webhook',
        });

        // Create HubSpot contact
        try {
          const hubspotContact = await hubspot.createOrUpdateContact({
            email: prospect.email!,
            firstname: prospect.firstName || undefined,
            lastname: prospect.lastName || undefined,
            phone: workPhone || undefined,
            mobilephone: mobilePhone || undefined,
            company: prospect.companyName || undefined,
            website: prospect.companyDomain || undefined,
            jobtitle: prospect.title || undefined,
            lifecyclestage: '1101494862', // New Prospect ID in HubSpot
          });

          // Update prospect with HubSpot ID
          await db
            .update(prospects)
            .set({
              hubspotContactId: hubspotContact.id,
              updatedAt: new Date(),
            })
            .where(eq(prospects.id, prospect.id));

          // Log HubSpot creation
          await db.insert(enrichmentActivity).values({
            prospectId: prospect.id,
            action: 'hubspot_created',
            details: {
              hubspotContactId: hubspotContact.id,
              phone: workPhone,
              mobilePhone: mobilePhone,
            },
            performedBy: 'apollo-webhook',
          });

          created++;
        } catch (hubspotError: any) {
          console.error(`Failed to create HubSpot contact for ${prospect.email}:`, hubspotError.message);

          // Mark as failed
          await db
            .update(prospects)
            .set({
              enrichmentStatus: 'failed',
              updatedAt: new Date(),
            })
            .where(eq(prospects.id, prospect.id));

          // Log failure
          await db.insert(enrichmentActivity).values({
            prospectId: prospect.id,
            action: 'hubspot_creation_failed',
            details: {
              error: hubspotError.message,
            },
            performedBy: 'apollo-webhook',
          });

          failed++;
        }

        processed++;
      } catch (error: any) {
        console.error(`Error processing match ${match.id}:`, error.message);
        failed++;
      }
    }

    console.log(`Apollo webhook processing complete: ${processed} processed, ${created} created in HubSpot, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed,
      created,
      failed,
    });
  } catch (error: any) {
    console.error('Apollo webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', message: error.message },
      { status: 500 }
    );
  }
}
