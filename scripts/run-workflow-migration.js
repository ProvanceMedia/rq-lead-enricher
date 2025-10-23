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
      path.join(__dirname, 'migrate-workflow-changes.sql'),
      'utf8'
    );

    console.log('Executing workflow migration SQL...');
    console.log(migrationSql);

    await client.query(migrationSql);

    console.log('✅ Workflow migration completed successfully!');

    client.release();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
