import { NextResponse } from "next/server";
import { EventType } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canApprove } from "@/lib/roles";
import { enrichQueue } from "@/lib/queue";
import { recordEvent } from "@/lib/events";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function POST(_request: Request, context: RouteContext) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.json(
      { error: "Re-enrichment disabled during build" },
      { status: 503 }
    );
  }

  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canApprove(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contact = await prisma.contact.findUnique({
    where: { id: context.params.id }
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const enrichment = await prisma.enrichment.create({
    data: {
      contactId: contact.id,
      status: "awaiting_approval"
    }
  });

  await recordEvent({
    type: EventType.re_enrichment_requested,
    contactId: contact.id,
    enrichmentId: enrichment.id,
    payload: { userId: session.user.id }
  });

  await enrichQueue.add("enrich-contact", { enrichmentId: enrichment.id });

  return NextResponse.json({ enrichment });
}
