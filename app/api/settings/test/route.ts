import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { withErrorHandling } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";

export const GET = withErrorHandling(async () => {
  await requireUser(["admin", "operator", "read_only"]);

  let dbConnected = false;
  try {
    await db.execute(sql`select 1`);
    dbConnected = true;
  } catch (error) {
    console.error("Postgres connectivity check failed", error);
  }

  return {
    apollo: {
      configured: Boolean(env.APOLLO_API_KEY)
    },
    hubspot: {
      configured: Boolean(env.HUBSPOT_PRIVATE_APP_TOKEN)
    },
    postgres: {
      connected: dbConnected
    }
  };
});
