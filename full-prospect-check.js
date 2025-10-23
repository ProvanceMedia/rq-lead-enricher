import { db, prospects } from './db/index.js';
import { desc, or, eq } from 'drizzle-orm';

async function fullCheck() {
  try {
    // Check all prospects
    const all = await db.select().from(prospects).orderBy(desc(prospects.createdAt));
    
    console.log(`\n📊 Total prospects in database: ${all.length}\n`);
    
    // Group by apollo_id to see duplicates
    const byApolloId = {};
    all.forEach(p => {
      if (!byApolloId[p.apolloId]) {
        byApolloId[p.apolloId] = [];
      }
      byApolloId[p.apolloId].push({
        email: p.email,
        status: p.enrichmentStatus,
        created: p.createdAt
      });
    });
    
    console.log('By Apollo ID:');
    Object.entries(byApolloId).forEach(([apolloId, prospects]) => {
      console.log(`\nApollo ID: ${apolloId}`);
      prospects.forEach(p => {
        console.log(`  - Email: ${p.email} | Status: ${p.status} | Created: ${p.created}`);
      });
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fullCheck();
