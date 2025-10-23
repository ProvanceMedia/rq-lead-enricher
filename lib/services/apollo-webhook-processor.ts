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

      // Log the full match object to see what Apollo is returning
      console.log(
        `Processing match for Apollo ID ${match.id}:`,
        JSON.stringify(
          {
            id: match.id,
            email: match.email,
            personal_emails: match.personal_emails,
            phone_numbers: match.phone_numbers,
            mobile_phone: match.mobile_phone,
            employment_history: match.employment_history?.[0],
          },
          null,
          2
        )
      );

      // Extract enriched data from Apollo response
      // Apollo puts revealed emails in personal_emails array, not in email field!
      const personalEmails: string[] =
        (match.personal_emails || [])
          .map((value: any) => {
            if (!value) return undefined;
            if (typeof value === 'string') return value;
            return value.email || value.value || value.address;
          })
          .filter((value: string | undefined): value is string => Boolean(value)) || [];

      let enrichedEmail: string | null = personalEmails[0] || match.email || prospect.email || null;
      const placeholderEmail = enrichedEmail?.startsWith('email_not_unlocked@');
      if (placeholderEmail) {
        // Keep existing prospect email if Apollo returns the locked placeholder
        enrichedEmail = personalEmails[0] || prospect.email || null;
      }

      const phoneNumbers = (match.phone_numbers || []).map((phone: any) => ({
        type: phone.type || phone.type_cd,
        status: phone.status || phone.status_cd,
        sanitized: phone.sanitized_number || phone.sanitizedNumber,
        raw: phone.raw_number || phone.rawNumber,
      }));

      const isValid = (status?: string) => {
        if (!status) return false;
        return status === 'valid' || status === 'valid_number' || status === 'approved';
      };

      const workPhone =
        phoneNumbers.find(
          (phone) =>
            isValid(phone.status) &&
            phone.sanitized &&
            ['work', 'direct', 'hq', 'office'].includes((phone.type || '').toLowerCase())
        )?.sanitized ||
        phoneNumbers.find((phone) => isValid(phone.status) && phone.sanitized)?.sanitized;

      const mobilePhone =
        phoneNumbers.find(
          (phone) =>
            isValid(phone.status) &&
            phone.sanitized &&
            ['mobile', 'cell'].includes((phone.type || '').toLowerCase())
        )?.sanitized || match.mobile_phone;

      const finalEmail = enrichedEmail ?? prospect.email ?? null;

      console.log(`Extracted data - Email: ${finalEmail}, Work Phone: ${workPhone}, Mobile: ${mobilePhone}`);

      // Update prospect with enriched data
      await db
        .update(prospects)
        .set({
          email: finalEmail, // Update with enriched email if available
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
          email: finalEmail,
          phone: workPhone,
          mobilePhone: mobilePhone,
          apolloId: match.id,
        },
        performedBy: 'apollo-webhook',
      });

      // Create HubSpot contact
      try {
        const hubspotContact = await hubspot.createOrUpdateContact({
          email: finalEmail || undefined, // Use enriched email from Apollo
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
            email: finalEmail,
            phone: workPhone,
            mobilePhone: mobilePhone,
          },
          performedBy: 'apollo-webhook',
        });

        created++;
      } catch (hubspotError: any) {
        console.error(`Failed to create HubSpot contact for ${finalEmail || prospect.email}:`, hubspotError.message);

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
