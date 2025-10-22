import { and, desc, eq, gte, inArray, lte, SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, enrichments, events } from "@/db/schema";

export type ActivityFilters = {
  types?: string[];
  from?: string | null;
  to?: string | null;
  limit?: number;
};

export async function listActivity(filters: ActivityFilters) {
  const clauses: SQL<unknown>[] = [];

  if (filters.types?.length) {
    clauses.push(inArray(events.type, filters.types));
  }

  if (filters.from) {
    clauses.push(gte(events.createdAt, new Date(filters.from)));
  }

  if (filters.to) {
    clauses.push(lte(events.createdAt, new Date(filters.to)));
  }

  const query = db
    .select({
      event: events,
      contact: contacts,
      enrichment: enrichments
    })
    .from(events)
    .leftJoin(contacts, eq(events.contactId, contacts.id))
    .leftJoin(enrichments, eq(events.enrichmentId, enrichments.id))
    .orderBy(desc(events.createdAt))
    .limit(filters.limit ?? 100);

  if (clauses.length > 0) {
    query.where(and(...clauses));
  }

  const rows = await query;

  return rows.map((row) => ({
    event: {
      ...row.event,
      createdAt: row.event.createdAt?.toISOString() ?? null,
      payload: row.event.payload ? JSON.parse(row.event.payload) : null
    },
    contact: row.contact
      ? {
          ...row.contact,
          createdAt: row.contact.createdAt?.toISOString() ?? null
        }
      : null,
    enrichment: row.enrichment
      ? {
          ...row.enrichment,
          createdAt: row.enrichment.createdAt?.toISOString() ?? null,
          decidedAt: row.enrichment.decidedAt?.toISOString() ?? null
        }
      : null
  }));
}
