import { db, prospects, enrichmentActivity } from '@/db';
import { eq } from 'drizzle-orm';
import { HubSpotService } from './hubspot';

/**
 * Process Apollo enrichment matches and create HubSpot contacts
 * This is shared logic used by both the webhook endpoint and direct sync responses
 */
export async function processApolloMatches(matches: any[]) {
  const hubspot = new HubSpotService();
  const isPlaceholderEmail = (email?: string | null) =>
    typeof email === 'string' && /not[_-]?unlocked/i.test(email.toLowerCase());

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

      const matchStatus = (match.status || '').toLowerCase();
      if (matchStatus && matchStatus !== 'success') {
        console.warn(
          `Apollo enrichment returned non-success status for ${match.id}: ${match.status || 'unknown'}`
        );

        await db
          .update(prospects)
          .set({
            apolloEnrichedData: match,
            apolloEnrichedAt: new Date(),
            enrichmentStatus: 'failed',
            updatedAt: new Date(),
          })
          .where(eq(prospects.id, prospect.id));

        await db.insert(enrichmentActivity).values({
          prospectId: prospect.id,
          action: 'apollo_enrichment_failed',
          details: {
            apolloId: match.id,
            status: match.status || 'unknown',
            error: match.error || match.error_message,
          },
          performedBy: 'apollo-webhook',
        });

        failed++;
        processed++;
        continue;
      }

      const contactEmailsRaw = [
        ...(Array.isArray(match.contact_emails) ? match.contact_emails : []),
        ...(match.contact?.contact_emails ? match.contact.contact_emails : []),
      ];

      const extractEmailValue = (value: any): string | undefined => {
        if (!value) return undefined;
        if (typeof value === 'string') return value;
        return value.email || value.value || value.address;
      };

      // Log the full match object to see what Apollo is returning
      console.log(
        `Processing match for Apollo ID ${match.id}:`,
        JSON.stringify(
          {
            id: match.id,
            email: match.email,
            contact_email: match.contact?.email,
            personal_emails: match.personal_emails,
            contact_emails: contactEmailsRaw,
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
          .map(extractEmailValue)
          .filter((value: string | undefined): value is string => Boolean(value)) || [];

      const contactEmails: string[] =
        contactEmailsRaw
          .map(extractEmailValue)
          .filter((value: string | undefined): value is string => Boolean(value)) || [];

      const possibleEmails = [
        ...personalEmails,
        ...contactEmails,
        extractEmailValue(match.contact?.email),
        match.email,
        match.contact?.email,
        match.person?.email,
      ].filter((value: string | undefined | null): value is string => Boolean(value));

      const candidateEmails = possibleEmails.filter(email => !isPlaceholderEmail(email));

      let enrichedEmail: string | null =
        candidateEmails[0] ||
        (prospect.email && !isPlaceholderEmail(prospect.email) ? prospect.email : null);

      type ApolloPhone = {
        type?: string;
        type_cd?: string;
        status?: string;
        status_cd?: string;
        sanitized_number?: string;
        sanitizedNumber?: string;
        raw_number?: string;
        rawNumber?: string;
      };

      const phoneNumbers: Array<{
        type: string;
        status: string;
        sanitized: string;
        raw: string;
      }> = ((match.phone_numbers || []) as ApolloPhone[]).map((phone) => ({
        type: phone.type || phone.type_cd || '',
        status: phone.status || phone.status_cd || '',
        sanitized: phone.sanitized_number || phone.sanitizedNumber || '',
        raw: phone.raw_number || phone.rawNumber || '',
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

      let finalEmail = enrichedEmail ?? prospect.email ?? null;

      console.log(`Extracted data - Email: ${finalEmail}, Work Phone: ${workPhone}, Mobile: ${mobilePhone}`);

      if (!finalEmail || isPlaceholderEmail(finalEmail)) {
        // Check if Apollo says this was already revealed
        if (match.revealed_for_current_team === true) {
          console.log(
            `Email was previously revealed for ${match.id}. Trying People Search API to retrieve it...`
          );

          // Try to get the revealed email from People Search API by searching for this specific person
          try {
            const { ApolloService } = await import('./apollo');
            const apollo = new ApolloService();

            // Search for this exact person by name and organization
            const searchCriteria: any = {
              perPage: 10,
              contactEmailStatus: ['verified'],
            };

            // Add organization search if available
            if (match.organization?.name) {
              searchCriteria.q_organization_name = match.organization.name;
            }

            const searchResults = await apollo.searchPeople(searchCriteria);

            // Find this person in search results by Apollo ID
            const searchMatch = searchResults.find((p: any) => p.id === match.id);
            if (searchMatch && searchMatch.email && !searchMatch.email.includes('email_not_unlocked')) {
              console.log(`✅ Found revealed email via People Search: ${searchMatch.email}`);
              finalEmail = searchMatch.email;
              // Continue with HubSpot creation below
            } else {
              throw new Error('Email still not found in People Search');
            }
          } catch (searchError) {
            console.error(`Failed to retrieve revealed email from People Search: ${(searchError as Error).message}`);
          }
        }

        // If still no email after trying People Search
        if (!finalEmail || isPlaceholderEmail(finalEmail)) {
          console.warn(
            `Apollo enrichment did not return an unlocked email for ${match.id}; marking prospect as failed.`
          );

          await db
            .update(prospects)
            .set({
              apolloEnrichedData: match,
              apolloEnrichedAt: new Date(),
              enrichmentStatus: 'failed',
              updatedAt: new Date(),
            })
            .where(eq(prospects.id, prospect.id));

          await db.insert(enrichmentActivity).values({
            prospectId: prospect.id,
            action: 'apollo_enrichment_failed',
            details: {
              apolloId: match.id,
              reason: 'email_not_unlocked',
              revealedForTeam: match.revealed_for_current_team || false,
            },
            performedBy: 'apollo-webhook',
          });

          failed++;
          processed++;
          continue;
        }
      }

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
