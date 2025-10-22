import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: true });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ ok: false, db: false }, { status: 500 });
  }
}
