import { db, prospects, enrichmentActivity } from '@/db';
import { eq } from 'drizzle-orm';
import { HubSpotService } from './hubspot';

/**
 * Process Apollo enrichment matches and create HubSpot contacts
 * This is shared logic used by both the webhook endpoint and direct sync responses
 */
export async function processApolloMatches(matches: any[]) {
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

      // Extract enriched data from Apollo response
      const enrichedEmail = match.email || prospect.email; // Use enriched email or fall back to original
      const workPhone = match.phone_numbers?.find((p: any) =>
        p.type === 'work' && p.status === 'valid'
      )?.sanitized_number;

      const mobilePhone = match.mobile_phone;

      // Update prospect with enriched data
      await db
        .update(prospects)
        .set({
          email: enrichedEmail, // Update with enriched email
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
          email: enrichedEmail,
          phone: workPhone,
          mobilePhone: mobilePhone,
          apolloId: match.id,
        },
        performedBy: 'apollo-webhook',
      });

      // Create HubSpot contact
      try {
        const hubspotContact = await hubspot.createOrUpdateContact({
          email: enrichedEmail, // Use enriched email from Apollo
          firstname: prospect.firstName || undefined,
          lastname: prospect.lastName || undefined,
          phone: workPhone || undefined,
          mobilephone: mobilePhone || undefined,
          company: prospect.companyName || undefined,
          website: prospect.companyDomain || undefined,
          jobtitle: prospect.title || undefined,
          lifecyclestage: '1101494863', // Enriched Prospect ID in HubSpot
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
            email: enrichedEmail,
            phone: workPhone,
            mobilePhone: mobilePhone,
          },
          performedBy: 'apollo-webhook',
        });

        created++;
      } catch (hubspotError: any) {
        console.error(`Failed to create HubSpot contact for ${enrichedEmail}:`, hubspotError.message);

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

  return { processed, created, failed };
}
