import * as cron from 'node-cron';
import { db, prospects, settings } from '../db';
import { eq } from 'drizzle-orm';
import { EnrichmentAgentService } from '../lib/services/enrichment-agent-service';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * Autopilot Enrichment Cron Job
 *
 * Automatically enriches prospects pending enrichment based on settings.
 * Runs on a schedule and respects hourly/daily limits.
 */

interface AutopilotSettings {
  enabled: boolean;
  schedule: string; // Cron schedule
  maxPerRun: number; // Max prospects to enrich per run
  concurrency: number; // Parallel enrichments
}

async function getAutopilotSettings(): Promise<AutopilotSettings> {
  try {
    const [settingsRecord] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'autopilot_enrichment'))
      .limit(1);

    if (settingsRecord && settingsRecord.value) {
      return settingsRecord.value as any as AutopilotSettings;
    }

    // Default settings
    return {
      enabled: false,
      schedule: '0 * * * *', // Every hour
      maxPerRun: 10,
      concurrency: 3,
    };
  } catch (error) {
    console.error('Error getting autopilot settings:', error);
    return {
      enabled: false,
      schedule: '0 * * * *',
      maxPerRun: 10,
      concurrency: 3,
    };
  }
}

async function runAutopilotEnrichment() {
  console.log(`[${new Date().toISOString()}] Starting autopilot enrichment job...`);

  try {
    const autopilotSettings = await getAutopilotSettings();

    if (!autopilotSettings.enabled) {
      console.log('Autopilot enrichment is disabled in settings. Skipping...');
      return;
    }

    console.log(`Max per run: ${autopilotSettings.maxPerRun} prospects`);
    console.log(`Concurrency: ${autopilotSettings.concurrency}`);

    // Get pending prospects
    const pendingProspects = await db
      .select()
      .from(prospects)
      .where(eq(prospects.enrichmentStatus, 'in_hubspot'))
      .limit(autopilotSettings.maxPerRun);

    if (pendingProspects.length === 0) {
      console.log('No prospects pending enrichment');
      return;
    }

    console.log(`Found ${pendingProspects.length} prospects to enrich`);

    // Enrich prospects using the service
    const enrichmentService = new EnrichmentAgentService();
    const prospectIds = pendingProspects.map(p => p.id);

    const result = await enrichmentService.enrichProspectsBulk(
      prospectIds,
      autopilotSettings.concurrency
    );

    console.log(`\nAutopilot enrichment completed:`);
    console.log(`  - Total: ${result.total}`);
    console.log(`  - Succeeded: ${result.succeeded}`);
    console.log(`  - Failed: ${result.failed}`);

    if (result.failed > 0) {
      console.error('\nFailed enrichments:');
      result.results
        .filter(r => !r.success)
        .forEach(r => console.error(`  - ${r.email}: ${r.error}`));
    }
  } catch (error: any) {
    console.error('Fatal error in autopilot enrichment job:', error);
  }

  console.log(`[${new Date().toISOString()}] Autopilot enrichment job finished.\n`);
}

async function startCronJob() {
  console.log('Autopilot Enrichment Cron Job Starting...');

  // Get schedule from settings
  const autopilotSettings = await getAutopilotSettings();
  const schedule = autopilotSettings.schedule;

  console.log(`Cron schedule: ${schedule}`);
  console.log(`Enabled: ${autopilotSettings.enabled}`);

  // Schedule the job
  cron.schedule(schedule, async () => {
    await runAutopilotEnrichment();
  });

  console.log('Cron job scheduled successfully. Press Ctrl+C to exit.');

  // Run once immediately for testing (optional, comment out in production)
  if (process.env.RUN_ON_START === 'true') {
    console.log('Running job immediately (RUN_ON_START=true)...\n');
    await runAutopilotEnrichment();
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
