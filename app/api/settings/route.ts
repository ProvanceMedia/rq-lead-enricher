import { withErrorHandling } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { getSettingsMap, upsertSettings } from "@/lib/services/settings";

type PatchBody = {
  updates: Array<{ key: string; value: unknown }>;
};

export const GET = withErrorHandling(async () => {
  await requireUser(["admin", "operator", "read_only"]);
  const values = await getSettingsMap();

  return {
    data: values
  };
});

export const PATCH = withErrorHandling(async ({ request }) => {
  await requireUser(["admin"]);
  const body = (await request.json().catch(() => ({}))) as PatchBody;

  if (!Array.isArray(body.updates) || body.updates.length === 0) {
    throw new HttpError("No updates provided", 400);
  }

  await upsertSettings(
    body.updates.map((update) => ({
      key: update.key,
      value: update.value
    }))
  );

  const values = await getSettingsMap();

  return {
    data: values
  };
});
