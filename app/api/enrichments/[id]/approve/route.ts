import { NextResponse } from "next/server";
import { EventType } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canApprove } from "@/lib/roles";
import { recordEvent } from "@/lib/events";
import { updateQueue } from "@/lib/queue";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canApprove(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enrichment = await prisma.enrichment.findUnique({
    where: { id: context.params.id },
    include: { contact: true }
  });

  if (!enrichment) {
    return NextResponse.json({ error: "Enrichment not found" }, { status: 404 });
  }

  if (enrichment.status !== "awaiting_approval") {
    return NextResponse.json(
      { error: "Enrichment not awaiting approval" },
      { status: 400 }
    );
  }

  const updated = await prisma.enrichment.update({
    where: { id: enrichment.id },
    data: {
      status: "approved",
      decidedByUserId: session.user.id,
      decidedAt: new Date()
    }
  });

  await recordEvent({
    type: EventType.approved,
    contactId: updated.contactId,
    enrichmentId: updated.id,
    payload: { userId: session.user.id }
  });

  await updateQueue.add(
    "hubspot-update",
    {
      enrichmentId: updated.id
    },
    {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000
      }
    }
  );

  await recordEvent({
    type: EventType.queued_for_update,
    contactId: updated.contactId,
    enrichmentId: updated.id,
    payload: { queue: "updateQueue" }
  });

  return NextResponse.json({ enrichment: updated });
}
