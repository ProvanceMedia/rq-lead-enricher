import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { settings } from "@/db/schema";

export type SettingValue = Record<string, unknown> | string[] | number | boolean | null;

export async function getSettingsMap(): Promise<Record<string, unknown>> {
  const rows = await db.select().from(settings);
  return rows.reduce<Record<string, unknown>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

export async function upsertSettings(
  updates: Array<{ key: string; value: unknown; secure?: boolean }>
) {
  if (updates.length === 0) return;

  await db
    .insert(settings)
    .values(
      updates.map((update) => ({
        key: update.key,
        value: update.value,
        secure: update.secure ?? false
      }))
    )
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: sql`excluded.value`,
        secure: sql`excluded.secure`
      }
    });
}
