import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageSettings } from "@/lib/roles";

export async function GET() {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return NextResponse.json({ settings: [] });
  }

  const session = await auth();

  if (!session || !canManageSettings(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.setting.findMany();

  return NextResponse.json({
    settings: settings.map((setting) => ({
      key: setting.key,
      value: setting.value
    }))
  });
}

export async function PUT(request: Request) {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return NextResponse.json(
      { error: "Settings cannot be updated during build" },
      { status: 503 }
    );
  }

  const session = await auth();

  if (!session || !canManageSettings(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    updates?: Array<{ key: string; value: unknown }>;
  } | null;

  if (!body?.updates?.length) {
    return NextResponse.json(
      { error: "No updates provided" },
      { status: 400 }
    );
  }

  const updates = body.updates.map((update) =>
    prisma.setting.upsert({
      where: { key: update.key },
      update: {
        value: update.value as Prisma.InputJsonValue,
        updatedByUserId: session.user.id
      },
      create: {
        key: update.key,
        value: update.value as Prisma.InputJsonValue,
        updatedByUserId: session.user.id
      }
    })
  );

  await prisma.$transaction(updates);

  return NextResponse.json({ ok: true });
}
