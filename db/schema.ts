import { pgTable, text, timestamp, integer, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// Enums
export const enrichmentStatusEnum = pgEnum('enrichment_status', [
  'pending',
  'in_progress',
  'awaiting_approval',
  'approved',
  'rejected',
  'failed'
]);

export const prospectEnrichmentStatusEnum = pgEnum('prospect_enrichment_status', [
  'pending',
  'enriching',
  'enriched',
  'failed'
]);

export const companyTypeEnum = pgEnum('company_type', [
  'Online Retailer',
  'Direct Mail Agency',
  'Ad Agency',
  'eComm Agency',
  'Marketing Agency'
]);

// Prospects table - contacts pulled from Apollo
export const prospects = pgTable('prospects', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  apolloId: text('apollo_id').unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email'),
  companyName: text('company_name'),
  companyDomain: text('company_domain'),
  linkedinUrl: text('linkedin_url'),
  companyLinkedinUrl: text('company_linkedin_url'),
  title: text('title'),
  rawData: jsonb('raw_data'), // Store full Apollo response

  // Enrichment tracking
  enrichmentStatus: prospectEnrichmentStatusEnum('enrichment_status').default('pending'),
  lastEnrichmentAttempt: timestamp('last_enrichment_attempt'),
  enrichmentAttempts: integer('enrichment_attempts').default(0),

  // HubSpot integration
  hubspotContactId: text('hubspot_contact_id'),
  hubspotCompanyId: text('hubspot_company_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Enrichments table - enrichment results awaiting approval
export const enrichments = pgTable('enrichments', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  prospectId: text('prospect_id').references(() => prospects.id).notNull(),
  status: enrichmentStatusEnum('status').default('pending').notNull(),

  // Address fields
  addressFound: boolean('address_found').default(false),
  companyNameForAddress: text('company_name_for_address'), // Maps to 'address' field
  streetAddressLine2: text('street_address_line_2'),
  streetAddressLine3: text('street_address_line_3'),
  city: text('city'),
  zip: text('zip'),
  country: text('country'),
  addressSource: text('address_source'), // URL where address was found

  // Company classification
  companyType: companyTypeEnum('company_type'),
  classificationReasoning: text('classification_reasoning'),

  // P.S. Line
  psLine: text('ps_line'),
  psSource: text('ps_source'), // URL where P.S. info was found

  // Metadata
  enrichmentStartedAt: timestamp('enrichment_started_at'),
  enrichmentCompletedAt: timestamp('enrichment_completed_at'),
  approvedAt: timestamp('approved_at'),
  approvedBy: text('approved_by'), // User ID or email
  rejectedAt: timestamp('rejected_at'),
  rejectedBy: text('rejected_by'),
  rejectionReason: text('rejection_reason'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Enrichment activity log - audit trail
export const enrichmentActivity = pgTable('enrichment_activity', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  enrichmentId: text('enrichment_id').references(() => enrichments.id),
  prospectId: text('prospect_id').references(() => prospects.id).notNull(),
  action: text('action').notNull(), // 'created', 'enrichment_started', 'enrichment_completed', 'approved', 'rejected', 'hubspot_updated', 'failed'
  details: jsonb('details'), // Additional context
  performedBy: text('performed_by'), // System or user identifier
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Settings table - configuration
export const settings = pgTable('settings', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  key: text('key').unique().notNull(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports for TypeScript
export type Prospect = typeof prospects.$inferSelect;
export type NewProspect = typeof prospects.$inferInsert;

export type Enrichment = typeof enrichments.$inferSelect;
export type NewEnrichment = typeof enrichments.$inferInsert;

export type EnrichmentActivity = typeof enrichmentActivity.$inferSelect;
export type NewEnrichmentActivity = typeof enrichmentActivity.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
