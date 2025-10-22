export const dynamic = "force-dynamic";

import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, enrichments, events } from "@/db/schema";
import { withErrorHandling } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth";

export const GET = withErrorHandling(async ({ request }) => {
  await requireUser(["admin", "operator", "read_only"]);

  const { searchParams } = new URL(request.url);
  const types = searchParams.get("type");
  const start = searchParams.get("from");
  const end = searchParams.get("to");
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = Math.min(
    100,
    Math.max(10, Number.parseInt(searchParams.get("pageSize") ?? "25", 10))
  );
  const offset = (page - 1) * pageSize;

  const filters = [];

  if (types) {
    const typeList = types.split(",").map((item) => item.trim()).filter(Boolean);
    if (typeList.length > 0) {
      filters.push(inArray(events.type, typeList));
    }
  }

  if (start) {
    filters.push(gte(events.createdAt, new Date(start)));
  }

  if (end) {
    filters.push(lte(events.createdAt, new Date(end)));
  }

  const whereClause = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      event: events,
      contact: contacts,
      enrichment: enrichments
    })
    .from(events)
    .leftJoin(contacts, eq(events.contactId, contacts.id))
    .leftJoin(enrichments, eq(events.enrichmentId, enrichments.id))
    .where(whereClause)
    .orderBy(desc(events.createdAt))
    .limit(pageSize + 1)
    .offset(offset);

  const hasMore = rows.length > pageSize;
  const data = rows.slice(0, pageSize).map((row) => ({
    id: row.event.id,
    type: row.event.type,
    createdAt: row.event.createdAt,
    payload: row.event.payload ? JSON.parse(row.event.payload) : null,
    contact: row.contact
      ? {
          id: row.contact.id,
          email: row.contact.email,
          company: row.contact.company,
          firstName: row.contact.firstName,
          lastName: row.contact.lastName
        }
      : null,
    enrichment: row.enrichment
      ? {
          id: row.enrichment.id,
          status: row.enrichment.status
        }
      : null
  }));

  return {
    data,
    pagination: {
      page,
      pageSize,
      hasMore
    }
  };
});
