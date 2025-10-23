import { db, prospects } from './db/index.js';
import { eq } from 'drizzle-orm';

async function checkDiscovered() {
  try {
    const discovered = await db
      .select()
      .from(prospects)
      .where(eq(prospects.enrichmentStatus, 'discovered'));

    console.log(`\nProspects with 'discovered' status: ${discovered.length}`);
    
    if (discovered.length > 0) {
      console.log('\nDetails:');
      discovered.forEach(p => {
        console.log(`- ${p.email} (Apollo ID: ${p.apolloId}) | Created: ${p.createdAt}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDiscovered();
