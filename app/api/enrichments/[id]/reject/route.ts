import { NextResponse } from "next/server";
import { EventType } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canApprove } from "@/lib/roles";
import { recordEvent } from "@/lib/events";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function POST(request: Request, context: RouteContext) {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return NextResponse.json(
      { error: "Rejections disabled during build" },
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

  const body = (await request.json().catch(() => ({}))) as {
    reason?: string;
  };

  const updated = await prisma.enrichment.update({
    where: { id: enrichment.id },
    data: {
      status: "rejected",
      error: body.reason ?? null,
      decidedByUserId: session.user.id,
      decidedAt: new Date()
    }
  });

  await recordEvent({
    type: EventType.rejected,
    contactId: updated.contactId,
    enrichmentId: updated.id,
    payload: { userId: session.user.id, reason: body.reason ?? null }
  });

  return NextResponse.json({ enrichment: updated });
}
