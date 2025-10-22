import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, enrichments, events } from "@/db/schema";

export async function getContactDetail(contactId: string) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (!contact) {
    return null;
  }

  const enrichmentHistory = await db
    .select()
    .from(enrichments)
    .where(eq(enrichments.contactId, contactId))
    .orderBy(desc(enrichments.createdAt));

  const relatedEvents = await db
    .select()
    .from(events)
    .where(and(eq(events.contactId, contactId)))
    .orderBy(desc(events.createdAt));

  return {
    contact: {
      ...contact,
      createdAt: contact.createdAt?.toISOString() ?? null
    },
    enrichments: enrichmentHistory.map((item) => ({
      ...item,
      createdAt: item.createdAt?.toISOString() ?? null,
      decidedAt: item.decidedAt?.toISOString() ?? null
    })),
    events: relatedEvents.map((event) => ({
      ...event,
      createdAt: event.createdAt?.toISOString() ?? null,
      payload: event.payload ? JSON.parse(event.payload) : null
    }))
  };
}
