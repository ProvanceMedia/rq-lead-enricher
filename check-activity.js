import { db, enrichmentActivity } from './db/index.js';
import { desc } from 'drizzle-orm';

async function checkActivity() {
  try {
    const recentActivity = await db
      .select()
      .from(enrichmentActivity)
      .orderBy(desc(enrichmentActivity.createdAt))
      .limit(20);

    console.log('\n📋 Recent Activity:\n');
    for (const activity of recentActivity) {
      const timestamp = new Date(activity.createdAt).toLocaleTimeString();
      const details = activity.details ? JSON.stringify(activity.details) : 'no details';
      console.log(`${timestamp} | ${activity.action} | Prospect: ${activity.prospectId}`);
      console.log(`  Details: ${details}\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkActivity();
