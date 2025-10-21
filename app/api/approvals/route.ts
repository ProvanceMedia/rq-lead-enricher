import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.json({ enrichments: [] });
  }

  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enrichments = await prisma.enrichment.findMany({
    where: {
      status: "awaiting_approval",
      approvalBlock: {
        not: null
      }
    },
    orderBy: { createdAt: "asc" },
    include: {
      contact: true
    }
  });

  return NextResponse.json({ enrichments });
}
