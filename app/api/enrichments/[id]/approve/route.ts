import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, enrichments } from "@/db/schema";
import { withErrorHandling } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { syncHubspotContact } from "@/lib/hubspot";
import { HttpError, notFound } from "@/lib/errors";

export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async ({ context }) => {
    const { dbUser, clerkUser } = await requireUser(["admin", "operator"]);
    const params = await context.params;
    const id = params.id;

  if (!id) {
    throw notFound("Enrichment not found");
  }

  const [record] = await db
    .select({
      enrichment: enrichments,
      contact: contacts
    })
    .from(enrichments)
    .innerJoin(contacts, eq(enrichments.contactId, contacts.id))
    .where(eq(enrichments.id, id))
    .limit(1);

  if (!record) {
    throw notFound("Enrichment not found");
  }

  if (record.enrichment.status !== "awaiting_approval") {
    throw new HttpError("Enrichment is not awaiting approval", 409);
  }

  await logEvent({
    contactId: record.contact.id,
    enrichmentId: record.enrichment.id,
    type: "approved",
    payload: {
      userId: dbUser.id,
      userEmail: dbUser.email,
      userName: clerkUser.fullName
    }
  });

  const hubspotResult = await syncHubspotContact({
    contact: record.contact,
    enrichment: record.enrichment
  });

  const now = new Date();
  const statusToSet =
    hubspotResult.status === "failed"
      ? "error"
      : hubspotResult.status === "success"
        ? "updated"
        : "approved";

  await db.transaction(async (tx) => {
    await tx
      .update(enrichments)
      .set({
        status: statusToSet,
        decidedByUserId: dbUser.id,
        decidedAt: now,
        error: hubspotResult.status === "failed" ? hubspotResult.reason : null
      })
      .where(eq(enrichments.id, record.enrichment.id));

    if (hubspotResult.status === "success") {
      await tx
        .update(contacts)
        .set({ hubspotContactId: hubspotResult.id })
        .where(eq(contacts.id, record.contact.id));
    }
  });

  if (hubspotResult.status === "failed") {
    await logEvent({
      contactId: record.contact.id,
      enrichmentId: record.enrichment.id,
      type: "failed",
      payload: {
        target: "hubspot",
        reason: hubspotResult.reason
      }
    });
    return {
      success: false,
      status: hubspotResult.status,
      message: hubspotResult.reason
    };
  }

  await logEvent({
    contactId: record.contact.id,
    enrichmentId: record.enrichment.id,
    type: "hubspot_updated",
    payload: {
      status: hubspotResult.status,
      hubspotId: hubspotResult.status === "success" ? hubspotResult.id : undefined
    }
  });

    return {
      success: true,
      status: hubspotResult.status
    };
  }
);
