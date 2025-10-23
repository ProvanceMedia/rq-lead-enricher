-- Migration: Add workflow support for Apollo enrichment and new statuses

-- Step 1: Add new columns to prospects table
ALTER TABLE prospects
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS mobile_phone text,
ADD COLUMN IF NOT EXISTS apollo_enrichment_id text,
ADD COLUMN IF NOT EXISTS apollo_enriched_at timestamp,
ADD COLUMN IF NOT EXISTS apollo_enriched_data jsonb;

-- Step 2: Drop and recreate the enrichment status enum with new values
-- We need to do this carefully to avoid breaking existing data
ALTER TYPE prospect_enrichment_status RENAME TO prospect_enrichment_status_old;

CREATE TYPE prospect_enrichment_status AS ENUM (
  'discovered',
  'apollo_enriching',
  'in_hubspot',
  'enriching',
  'enriched',
  'failed'
);

-- Step 3: Update the prospects table to use the new enum
-- Map old values to new values
ALTER TABLE prospects
ALTER COLUMN enrichment_status DROP DEFAULT;

ALTER TABLE prospects
ALTER COLUMN enrichment_status TYPE prospect_enrichment_status
USING (
  CASE enrichment_status::text
    WHEN 'pending' THEN 'discovered'::prospect_enrichment_status
    WHEN 'enriching' THEN 'enriching'::prospect_enrichment_status
    WHEN 'enriched' THEN 'enriched'::prospect_enrichment_status
    WHEN 'failed' THEN 'failed'::prospect_enrichment_status
    ELSE 'discovered'::prospect_enrichment_status
  END
);

-- Step 4: Set default for new records
ALTER TABLE prospects
ALTER COLUMN enrichment_status SET DEFAULT 'discovered'::prospect_enrichment_status;

-- Step 5: Drop the old enum
DROP TYPE prospect_enrichment_status_old;

-- Step 6: Update existing 'pending' prospects to 'discovered' status
-- (This should already be done by the USING clause above, but just in case)
-- UPDATE prospects SET enrichment_status = 'discovered' WHERE enrichment_status = 'pending';
