export const dynamic = "force-dynamic";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { enrichments } from "@/db/schema";
import { withErrorHandling } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { HttpError, notFound } from "@/lib/errors";

type RejectBody = {
  reason?: string;
};

export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async ({ request, context }) => {
    const { dbUser } = await requireUser(["admin", "operator"]);
    const params = await context.params;
    const id = params.id;

  if (!id) {
    throw notFound("Enrichment not found");
  }

  const body = (await request.json().catch(() => ({}))) as RejectBody;
  const reason = body.reason?.slice(0, 500) ?? null;

  const [record] = await db
    .select()
    .from(enrichments)
    .where(eq(enrichments.id, id))
    .limit(1);

  if (!record) {
    throw notFound("Enrichment not found");
  }

  if (record.status !== "awaiting_approval") {
    throw new HttpError("Enrichment is not awaiting approval", 409);
  }

  const now = new Date();

  await db
    .update(enrichments)
    .set({
      status: "rejected",
      error: reason,
      decidedByUserId: dbUser.id,
      decidedAt: now
    })
    .where(eq(enrichments.id, id));

  await logEvent({
    contactId: record.contactId,
    enrichmentId: record.id,
    type: "rejected",
    payload: {
      userId: dbUser.id,
      reason
    }
  });

    return {
      success: true
    };
  }
);
