const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    const client = await pool.connect();
    console.log('Connected to database');

    // Read and execute migration
    const migrationSql = fs.readFileSync(
      path.join(__dirname, '../drizzle/0001_relax_enrichment_activity_enrichment_id.sql'),
      'utf8'
    );

    console.log('Executing migration SQL...');
    console.log(migrationSql);

    await client.query(migrationSql);

    console.log('Migration completed successfully!');

    client.release();
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
