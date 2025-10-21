import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { canManageSettings } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/queue";
import { searchProspects } from "@/lib/apollo";

const env = getServerEnv();

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !canManageSettings(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    target?: "apollo" | "hubspot" | "redis" | "db";
  } | null;

  if (!body?.target) {
    return NextResponse.json({ error: "target is required" }, { status: 400 });
  }

  try {
    switch (body.target) {
      case "db": {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({ ok: true, target: "db" });
      }
      case "redis": {
        const ping = await connection.ping();
        return NextResponse.json({ ok: ping === "PONG", target: "redis" });
      }
      case "apollo": {
        const result = await searchProspects({ page: 1, per_page: 1 });
        return NextResponse.json({
          ok: true,
          target: "apollo",
          contacts: result.contacts.length
        });
      }
      case "hubspot": {
        if (!env.HUBSPOT_PRIVATE_APP_TOKEN) {
          throw new Error("HubSpot token not configured");
        }
        const response = await fetch(
          "https://api.hubapi.com/crm/v3/properties/contacts?limit=1",
          {
            headers: {
              Authorization: `Bearer ${env.HUBSPOT_PRIVATE_APP_TOKEN}`,
              "Content-Type": "application/json"
            }
          }
        );
        if (!response.ok) {
          const message = await response.text();
          throw new Error(
            `HubSpot properties request failed (${response.status}): ${message}`
          );
        }
        return NextResponse.json({ ok: true, target: "hubspot" });
      }
      default:
        return NextResponse.json(
          { error: `Unknown target ${body.target}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        target: body.target,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
