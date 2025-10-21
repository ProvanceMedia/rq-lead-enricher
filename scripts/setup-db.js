#!/usr/bin/env node

const { Client } = require('pg');

const setupSQL = `
-- Create enum types
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('admin', 'operator', 'read_only');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "EnrichmentStatus" AS ENUM ('awaiting_approval', 'approved', 'rejected', 'updated', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "EventType" AS ENUM ('pulled_from_apollo', 'deduped', 'enriched', 'approval_requested', 'approved', 'rejected', 'hubspot_updated', 'failed', 'skipped', 'queued_for_update', 're_enrichment_requested');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Contact table
CREATE TABLE IF NOT EXISTS "Contact" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "company" TEXT,
    "domain" TEXT,
    "apolloContactId" TEXT,
    "hubspotContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Contact_email_key" ON "Contact"("email");

-- Create Enrichment table
CREATE TABLE IF NOT EXISTS "Enrichment" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" "EnrichmentStatus" NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "country" TEXT,
    "classification" TEXT,
    "psLine" TEXT,
    "psSourceUrl" TEXT,
    "addressSourceUrl" TEXT,
    "approvalBlock" TEXT,
    "error" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Enrichment_pkey" PRIMARY KEY ("id")
);

-- Create Event table
CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL,
    "contactId" TEXT,
    "enrichmentId" TEXT,
    "type" "EventType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'read_only',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- Create Setting table
CREATE TABLE IF NOT EXISTS "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- Add foreign key constraints
DO $$ BEGIN
    ALTER TABLE "Enrichment" ADD CONSTRAINT "Enrichment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Event" ADD CONSTRAINT "Event_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Event" ADD CONSTRAINT "Event_enrichmentId_fkey" FOREIGN KEY ("enrichmentId") REFERENCES "Enrichment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Setting" ADD CONSTRAINT "Setting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Insert admin users
INSERT INTO "User" ("id", "email", "name", "role", "createdAt")
VALUES
    ('clxyz_operator', 'operator@roboquill.io', 'Queue Operator', 'admin', CURRENT_TIMESTAMP),
    ('clxyz_stuart', 'stuart@roboquill.io', 'Stuart', 'admin', CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO UPDATE SET "role" = 'admin';
`;

async function setup() {
  const connectionString = process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_URL_ADMIN environment variable is required');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected! Running setup SQL...');

    await client.query(setupSQL);

    console.log('✓ Database setup complete!');
    console.log('✓ All tables created');
    console.log('✓ Admin users created:');
    console.log('  - operator@roboquill.io');
    console.log('  - stuart@roboquill.io');
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setup();
