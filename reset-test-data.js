import { db, prospects, enrichments, enrichmentActivity } from './db/index.js';

async function reset() {
  try {
    console.log('Deleting test prospects with placeholder emails...');
    
    // Delete all test data
    await db.delete(enrichmentActivity).execute();
    await db.delete(enrichments).execute();
    await db.delete(prospects).execute();
    
    console.log('✅ All test data cleared');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

reset();
