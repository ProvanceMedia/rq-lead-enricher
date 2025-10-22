import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { listEnrichmentsWithContacts } from "@/lib/services/enrichments";
import { QueueClient } from "./queue-client";

export const dynamic = "force-dynamic";

export default async function QueuePage({
  searchParams
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const { dbUser } = await requireUser(["admin", "operator", "read_only"]);

  const rows = await listEnrichmentsWithContacts({
    status: searchParams.status ?? "awaiting_approval",
    classification: searchParams.classification ?? null,
    search: searchParams.q ?? null,
    from: searchParams.from ?? null,
    to: searchParams.to ?? null,
    limit: 100
  });

  const initialData = rows.map((row) => ({
    enrichment: {
      ...row.enrichment,
      createdAt: row.enrichment.createdAt?.toISOString() ?? null,
      decidedAt: row.enrichment.decidedAt?.toISOString() ?? null
    },
    contact: {
      ...row.contact,
      createdAt: row.contact.createdAt?.toISOString() ?? null
    }
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Approval queue</CardTitle>
        </CardHeader>
        <CardContent>
          <QueueClient
            initialData={initialData}
            initialFilters={{
              status: searchParams.status ?? "awaiting_approval",
              classification: searchParams.classification ?? "",
              q: searchParams.q ?? "",
              from: searchParams.from ?? "",
              to: searchParams.to ?? ""
            }}
            role={dbUser.role as "admin" | "operator" | "read_only"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
