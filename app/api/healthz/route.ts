import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/queue";

export async function GET() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.json({
      ok: true,
      db: false,
      redis: false,
      note: "Skipped during build phase"
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    await connection.ping();

    return NextResponse.json({
      ok: true,
      db: true,
      redis: true
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        db: false,
        redis: false,
        error:
          error instanceof Error ? error.message : "unknown health check error"
      },
      { status: 500 }
    );
  }
}
