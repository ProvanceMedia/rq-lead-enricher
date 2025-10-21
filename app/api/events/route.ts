import { NextRequest, NextResponse } from "next/server";
import { EventType, Prisma } from "@prisma/client";
import { parseISO } from "date-fns";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const type = searchParams.get("status") ?? undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const classification = searchParams.get("classification") ?? undefined;

  const where: Prisma.EventWhereInput = {};

  if (type) {
    if (Object.values(EventType).includes(type as EventType)) {
      where.type = type as EventType;
    }
  }

  if (from || to) {
    where.createdAt = {
      gte: from ? parseISO(from) : undefined,
      lte: to ? parseISO(to) : undefined
    };
  }

  if (userId || classification) {
    where.enrichment = {
      is: {
        ...(userId ? { decidedByUserId: userId } : {}),
        ...(classification ? { classification } : {})
      }
    };
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      contact: true,
      enrichment: true
    }
  });

  return NextResponse.json({ events });
}
