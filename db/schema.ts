import { relations } from "drizzle-orm";
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  role: varchar("role", { length: 32 }).notNull().default("operator"), // admin, operator, read_only
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export type User = typeof users.$inferSelect;

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 120 }),
  lastName: varchar("last_name", { length: 120 }),
  company: varchar("company", { length: 255 }),
  domain: varchar("domain", { length: 255 }),
  apolloContactId: varchar("apollo_contact_id", { length: 255 }),
  hubspotContactId: varchar("hubspot_contact_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export type Contact = typeof contacts.$inferSelect;

export const enrichments = pgTable("enrichments", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 32 }).notNull(), // awaiting_approval, approved, rejected, updated, error
  addressLine1: varchar("address_line_1", { length: 255 }),
  addressLine2: varchar("address_line_2", { length: 255 }),
  city: varchar("city", { length: 120 }),
  postcode: varchar("postcode", { length: 40 }),
  country: varchar("country", { length: 120 }),
  classification: varchar("classification", { length: 80 }),
  psLine: varchar("ps_line", { length: 300 }),
  psSourceUrl: varchar("ps_source_url", { length: 512 }),
  addressSourceUrl: varchar("address_source_url", { length: 512 }),
  approvalBlock: text("approval_block"),
  error: text("error"),
  decidedByUserId: varchar("decided_by_user_id", { length: 255 }), // Clerk user id
  decidedAt: timestamp("decided_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export type Enrichment = typeof enrichments.$inferSelect;

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => contacts.id, {
    onDelete: "set null"
  }),
  enrichmentId: uuid("enrichment_id").references(() => enrichments.id, {
    onDelete: "set null"
  }),
  type: varchar("type", { length: 64 }).notNull(), // pulled_from_apollo, deduped, enriched, approval_requested, approved, rejected, hubspot_updated, failed
  payload: text("payload"), // JSON stringified
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export type Event = typeof events.$inferSelect;

export const settings = pgTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  secure: boolean("secure").notNull().default(false)
});

export type Setting = typeof settings.$inferSelect;

export const contactsRelations = relations(contacts, ({ many }) => ({
  enrichments: many(enrichments),
  events: many(events)
}));

export const enrichmentsRelations = relations(enrichments, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [enrichments.contactId],
    references: [contacts.id]
  }),
  events: many(events)
}));

export const eventsRelations = relations(events, ({ one }) => ({
  contact: one(contacts, {
    fields: [events.contactId],
    references: [contacts.id]
  }),
  enrichment: one(enrichments, {
    fields: [events.enrichmentId],
    references: [enrichments.id]
  })
}));
