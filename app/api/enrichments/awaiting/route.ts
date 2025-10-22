export const dynamic = "force-dynamic";

import { withErrorHandling } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth";
import { listEnrichmentsWithContacts } from "@/lib/services/enrichments";

export const GET = withErrorHandling(async ({ request }) => {
  await requireUser(["admin", "operator", "read_only"]);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "awaiting_approval";
  const classification = searchParams.get("classification");
  const search = searchParams.get("q");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const rows = await listEnrichmentsWithContacts({
    status,
    classification,
    search,
    from,
    to,
    limit: 100
  });

  return {
    data: rows
  };
});
