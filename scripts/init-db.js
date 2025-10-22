const { Pool } = require("pg");
const { parse } = require("pg-connection-string");

const connectionString = process.env.DATABASE_URL || "";
const config = parse(connectionString);

// First, connect to defaultdb to create the target database if needed
const adminPool = new Pool({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  database: "defaultdb", // Connect to default database first
  ssl: {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined
  },
  connectionTimeoutMillis: 10000
});

async function initDatabase() {
  console.log("Checking database setup...");

  try {
    // Create the target database if it doesn't exist
    const targetDb = config.database || "rq_outreach";
    console.log(`Creating database ${targetDb} if it doesn't exist...`);

    await adminPool.query(`CREATE DATABASE ${targetDb}`);
    console.log(`✓ Database ${targetDb} created`);
  } catch (error) {
    if (error.code === "42P04") {
      console.log("✓ Database already exists");
    } else {
      console.log(`Note: ${error.message}`);
    }
  }

  await adminPool.end();

  // Now connect to the actual database to create tables
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined
    },
    connectionTimeoutMillis: 10000
  });

  try {
    console.log("Creating database schema...");

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create contacts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        first_name TEXT,
        last_name TEXT,
        company TEXT,
        title TEXT,
        linkedin_url TEXT,
        hubspot_contact_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create enrichments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enrichments (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'awaiting_approval',
        classification TEXT,
        ps_line TEXT,
        approval_block TEXT,
        error TEXT,
        decided_by_user_id TEXT,
        decided_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        contact_id TEXT REFERENCES contacts(id) ON DELETE CASCADE,
        enrichment_id TEXT REFERENCES enrichments(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        payload TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_enrichments_contact_id ON enrichments(contact_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_enrichments_status ON enrichments(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_events_contact_id ON events(contact_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_events_enrichment_id ON events(enrichment_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC)`);

    console.log("✓ Database schema initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    console.log("⚠ Continuing anyway - tables may already exist or need manual creation");
    console.log("⚠ If app fails, run: npm run drizzle:push manually with proper credentials");
  } finally {
    await pool.end();
  }
}

initDatabase();
