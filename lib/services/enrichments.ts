import {
  and,
  desc,
  eq,
  ilike,
  gte,
  lte,
  or,
  SQL
} from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, enrichments } from "@/db/schema";

export type EnrichmentFilters = {
  status?: string;
  classification?: string | null;
  search?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
};

export async function listEnrichmentsWithContacts(filters: EnrichmentFilters) {
  const clauses: SQL<unknown>[] = [];
  const status = filters.status ?? "awaiting_approval";

  clauses.push(eq(enrichments.status, status));

  if (filters.classification) {
    clauses.push(eq(enrichments.classification, filters.classification));
  }

  if (filters.search) {
    const pattern = `%${filters.search}%`;
    const searchClause = or(
      ilike(contacts.company, pattern),
      ilike(contacts.email, pattern),
      ilike(contacts.firstName, pattern),
      ilike(contacts.lastName, pattern),
      ilike(enrichments.psLine, pattern)
    );
    if (searchClause) {
      clauses.push(searchClause);
    }
  }

  if (filters.from) {
    clauses.push(gte(enrichments.createdAt, new Date(filters.from)));
  }

  if (filters.to) {
    clauses.push(lte(enrichments.createdAt, new Date(filters.to)));
  }

  const query = db
    .select({
      enrichment: enrichments,
      contact: contacts
    })
    .from(enrichments)
    .innerJoin(contacts, eq(enrichments.contactId, contacts.id))
    .orderBy(desc(enrichments.createdAt))
    .limit(filters.limit ?? 100);

  if (clauses.length > 0) {
    query.where(and(...clauses));
  }

  return query;
}
