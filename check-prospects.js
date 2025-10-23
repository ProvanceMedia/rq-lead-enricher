import { db, prospects } from './db/index.js';
import { desc } from 'drizzle-orm';

async function checkProspects() {
  try {
    const recentProspects = await db
      .select({
        id: prospects.id,
        email: prospects.email,
        firstName: prospects.firstName,
        lastName: prospects.lastName,
        status: prospects.enrichmentStatus,
        createdAt: prospects.createdAt,
      })
      .from(prospects)
      .orderBy(desc(prospects.createdAt))
      .limit(10);

    console.log('\n📊 Recent Prospects:');
    console.log('Count:', recentProspects.length);
    console.log('\nDetails:');
    recentProspects.forEach(p => {
      console.log(`- ${p.email} | Status: ${p.status} | Created: ${p.createdAt}`);
    });

    // Count by status
    const allProspects = await db.select().from(prospects);
    const statusCounts = allProspects.reduce((acc, p) => {
      acc[p.enrichmentStatus] = (acc[p.enrichmentStatus] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📈 Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProspects();
