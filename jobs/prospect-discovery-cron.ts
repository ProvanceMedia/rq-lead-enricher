import * as cron from 'node-cron';
import { db, prospects, settings, enrichmentActivity } from '../db';
import { eq } from 'drizzle-orm';
import { ApolloService, type ApolloSearchCriteria } from '../lib/services/apollo';
import { HubSpotService } from '../lib/services/hubspot';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * Prospect Discovery Cron Job
 *
 * Searches Apollo.io for new prospects based on configured criteria,
 * creates them in the database, and pushes to HubSpot as new leads.
 */

interface DiscoverySettings {
  enabled: boolean;
  searchCriteria: ApolloSearchCriteria;
  dailyLimit: number;
  schedule: string;
}

async function getDiscoverySettings(): Promise<DiscoverySettings> {
  try {
    const [settingsRecord] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'prospect_discovery'))
      .limit(1);

    if (settingsRecord && settingsRecord.value) {
      return settingsRecord.value as any as DiscoverySettings;
    }

    // Default settings
    return {
      enabled: false,
      searchCriteria: {
        personTitles: ['Marketing Director', 'Marketing Manager', 'CMO'],
        personLocations: ['United Kingdom'], // Where the person lives
        organizationLocations: ['United Kingdom'], // Company HQ location
        contactEmailStatus: ['verified'],
        perPage: 25,
      },
      dailyLimit: 20,
      schedule: '0 9 * * *', // 9 AM daily
    };
  } catch (error) {
    console.error('Error getting discovery settings:', error);
    return {
      enabled: false,
      searchCriteria: { contactEmailStatus: ['verified'] },
      dailyLimit: 10,
      schedule: '0 9 * * *',
    };
  }
}

async function runDiscoveryJob() {
  console.log(`[${new Date().toISOString()}] Starting prospect discovery job...`);

  try {
    const discoverySettings = await getDiscoverySettings();

    if (!discoverySettings.enabled) {
      console.log('Prospect discovery is disabled in settings. Skipping...');
      return;
    }

    console.log(`Daily limit: ${discoverySettings.dailyLimit} prospects`);
    console.log('Search criteria:', JSON.stringify(discoverySettings.searchCriteria, null, 2));

    const apolloService = new ApolloService();
    const hubspotService = new HubSpotService();

    // Search Apollo for prospects
    const apolloContacts = await apolloService.searchPeople({
      ...discoverySettings.searchCriteria,
      perPage: discoverySettings.dailyLimit,
    });

    console.log(`Found ${apolloContacts.length} contacts from Apollo`);

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const contact of apolloContacts) {
      try {
        // Skip if no email
        if (!contact.email) {
          console.log(`Skipping contact ${contact.id}: no email`);
          skippedCount++;
          continue;
        }

        // Check if prospect already exists
        const existingProspect = await db
          .select()
          .from(prospects)
          .where(eq(prospects.apolloId, contact.id))
          .limit(1);

        if (existingProspect.length > 0) {
          console.log(`Prospect ${contact.email} already exists, skipping`);
          skippedCount++;
          continue;
        }

        // Create prospect in database
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
        console.log(`✓ Created prospect: ${prospect.email}`);

        // Create in HubSpot
        try {
          const hubspotContactId = await hubspotService.createContact(
            prospect.email!,
            prospect.firstName || undefined,
            prospect.lastName || undefined,
            prospect.companyName || undefined
          );

          // Update prospect with HubSpot ID
          await db
            .update(prospects)
            .set({
              hubspotContactId,
              updatedAt: new Date(),
            })
            .where(eq(prospects.id, prospect.id));

          console.log(`  ✓ Created in HubSpot: ${hubspotContactId}`);

          // Log activity
          await db.insert(enrichmentActivity).values({
            prospectId: prospect.id,
            action: 'prospect_created',
            details: {
              source: 'apollo_discovery',
              apolloId: contact.id,
              hubspotContactId,
            },
            performedBy: 'system',
          } as any);
        } catch (hubspotError: any) {
          console.error(`  ✗ Failed to create in HubSpot: ${hubspotError.message}`);
          // Continue even if HubSpot creation fails
        }

        // Add small delay to avoid rate limits
        await delay(500);
      } catch (error: any) {
        console.error(`Error processing contact ${contact.email}:`, error);
        errors.push(`${contact.email}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\nJob completed:`);
    console.log(`  - Created: ${createdCount}`);
    console.log(`  - Skipped: ${skippedCount}`);
    console.log(`  - Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.error('\nErrors during discovery:');
      errors.forEach(error => console.error(`  - ${error}`));
    }
  } catch (error: any) {
    console.error('Fatal error in discovery job:', error);
  }

  console.log(`[${new Date().toISOString()}] Prospect discovery job finished.\n`);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startCronJob() {
  console.log('Prospect Discovery Cron Job Starting...');

  // Get schedule from settings
  const discoverySettings = await getDiscoverySettings();
  const schedule = discoverySettings.schedule;

  console.log(`Cron schedule: ${schedule}`);
  console.log(`Enabled: ${discoverySettings.enabled}`);

  // Schedule the job
  cron.schedule(schedule, async () => {
    await runDiscoveryJob();
  });

  console.log('Cron job scheduled successfully. Press Ctrl+C to exit.');

  // Run once immediately for testing (optional, comment out in production)
  if (process.env.RUN_ON_START === 'true') {
    console.log('Running job immediately (RUN_ON_START=true)...\n');
    await runDiscoveryJob();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down cron job gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down cron job gracefully...');
  process.exit(0);
});

// Start the cron job
startCronJob().catch(error => {
  console.error('Failed to start cron job:', error);
  process.exit(1);
});
