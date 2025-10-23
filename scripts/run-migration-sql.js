const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const ssl =
    process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=disable')
      ? { rejectUnauthorized: false }
      : false;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl,
  });

  try {
    const client = await pool.connect();
    console.log('Connected to database');

    const migrationArg = process.argv[2];
    if (!migrationArg) {
      throw new Error('Please provide the path to a SQL file, e.g. node scripts/run-migration-sql.js drizzle/0002_update_prospect_status_enum.sql');
    }

    const migrationPath = path.isAbsolute(migrationArg)
      ? migrationArg
      : path.join(process.cwd(), migrationArg);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    // Read and execute migration
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`Executing migration SQL from: ${migrationPath}`);
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
