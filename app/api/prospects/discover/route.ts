import { NextRequest, NextResponse } from 'next/server';
import { db, prospects, settings, enrichmentActivity } from '@/db';
import { eq } from 'drizzle-orm';
import { ApolloService, type ApolloSearchCriteria } from '@/lib/services/apollo';
import { HubSpotService } from '@/lib/services/hubspot';

export const dynamic = 'force-dynamic';

/**
 * Manual trigger for prospect discovery
 * POST /api/prospects/discover
 */

interface DiscoverySettings {
  enabled: boolean;
  searchCriteria: ApolloSearchCriteria;
  dailyLimit: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const limit = body.limit || undefined;

    // Get discovery settings
    const [settingsRecord] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'prospect_discovery'))
      .limit(1);

    let searchCriteria: ApolloSearchCriteria = {
      personTitles: ['Marketing Director', 'Marketing Manager', 'CMO'],
      personLocations: ['United Kingdom'], // Where the person lives
      organizationLocations: ['United Kingdom'], // Company HQ location
      contactEmailStatus: ['verified'],
      page: 1,
    };

    let maxProspects = limit || 10;
    let currentPage = 1;

    if (settingsRecord && settingsRecord.value) {
      const discoverySettings = settingsRecord.value as any as DiscoverySettings;
      searchCriteria = discoverySettings.searchCriteria;

      // Get current page from settings (for pagination)
      currentPage = (discoverySettings as any).lastSearchPage || 1;
      searchCriteria.page = currentPage;

      if (!limit) {
        maxProspects = discoverySettings.dailyLimit || 10;
      }
    }

    console.log(`Starting manual discovery for ${maxProspects} prospects (page ${currentPage})...`);

    const apolloService = new ApolloService();
    const hubspotService = new HubSpotService();

    // Search Apollo
    const apolloContacts = await apolloService.searchPeople({
      ...searchCriteria,
      perPage: maxProspects,
    });

    console.log(`Found ${apolloContacts.length} contacts from Apollo`);

    let createdCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const contact of apolloContacts) {
      try {
        if (!contact.email) {
          skippedCount++;
          continue;
        }

        // Check if exists
        const existingProspect = await db
          .select()
          .from(prospects)
          .where(eq(prospects.apolloId, contact.id))
          .limit(1);

        if (existingProspect.length > 0) {
          skippedCount++;
          continue;
        }

        // Create prospect
        const [prospect] = await db
          .insert(prospects)
          .values({
            apolloId: contact.id,
            firstName: contact.first_name,
            lastName: contact.last_name,
            email: contact.email,
            companyName: contact.organization?.name,
            companyDomain: contact.organization?.primary_domain || contact.organization?.website_url,
            linkedinUrl: contact.linkedin_url,
            companyLinkedinUrl: contact.organization?.linkedin_url,
            title: contact.title,
            rawData: contact as any,
            enrichmentStatus: 'discovered',
          })
          .returning();

        createdCount++;

        // Log activity
        await db.insert(enrichmentActivity).values({
          prospectId: prospect.id,
          action: 'prospect_discovered',
          details: {
            source: 'manual_discovery',
            apolloId: contact.id,
          },
          performedBy: 'user',
        } as any);

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        errors.push(`${contact.email}: ${error.message}`);
      }
    }

    // Increment page number for next discovery run to avoid duplicates
    const nextPage = currentPage + 1;
    if (settingsRecord) {
      const currentSettings = settingsRecord.value as any;
      await db
        .update(settings)
        .set({
          value: {
            ...currentSettings,
            lastSearchPage: nextPage,
          },
          updatedAt: new Date(),
        })
        .where(eq(settings.key, 'prospect_discovery'));

      console.log(`Updated lastSearchPage to ${nextPage} for next discovery run`);
    }

    return NextResponse.json({
      success: true,
      created: createdCount,
      skipped: skippedCount,
      errors: errors.length,
      errorDetails: errors,
      currentPage: currentPage,
      nextPage: nextPage,
    });
  } catch (error: any) {
    console.error('Error in manual discovery:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to discover prospects' },
      { status: 500 }
    );
  }
}
