import { sql } from "drizzle-orm";
import { db, closeDbPool } from "../db/client";
import * as schema from "../db/schema";

async function initDatabase() {
  console.log("Checking database schema...");

  try {
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create contacts table
    await db.execute(sql`
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
    await db.execute(sql`
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
    await db.execute(sql`
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
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_enrichments_contact_id ON enrichments(contact_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_enrichments_status ON enrichments(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_events_contact_id ON events(contact_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_events_enrichment_id ON events(enrichment_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC)`);

    console.log("✓ Database schema initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  } finally {
    await closeDbPool();
  }
}

initDatabase();
