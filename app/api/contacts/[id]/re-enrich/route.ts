import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, enrichments } from "@/db/schema";
import { withErrorHandling } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { notFound } from "@/lib/errors";

export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async ({ context }) => {
    const { dbUser } = await requireUser(["admin", "operator"]);
    const params = await context.params;
    const contactId = params.id;

  if (!contactId) {
    throw notFound("Contact not found");
  }

  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (!contact) {
    throw notFound("Contact not found");
  }

  const [enrichment] = await db
    .insert(enrichments)
    .values({
      contactId,
      status: "awaiting_approval",
      approvalBlock: null
    })
    .returning();

  await logEvent({
    contactId,
    enrichmentId: enrichment.id,
    type: "re_enrich_requested",
    payload: {
      requestedBy: dbUser.id
    }
  });

    return {
      success: true,
      enrichmentId: enrichment.id
    };
  }
);
