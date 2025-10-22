import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { getContactDetail } from "@/lib/services/contacts";
import { ReEnrichButton } from "./re-enrich-button";

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/London"
      }).format(new Date(value))
    : "—";

export default async function ContactDetailPage({
  params
}: {
  params: { id: string };
}) {
  const { dbUser } = await requireUser(["admin", "operator", "read_only"]);
  const detail = await getContactDetail(params.id);

  if (!detail) {
    notFound();
  }

  const fullName = [detail.contact.firstName, detail.contact.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{fullName || detail.contact.email}</CardTitle>
            <p className="text-sm text-slate-500">
              {detail.contact.email} · {detail.contact.company ?? "Unknown company"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" asChild>
              <Link href="/queue">Back to queue</Link>
            </Button>
            {detail.contact.domain ? (
              <Button asChild>
                <Link href={`https://${detail.contact.domain}`} target="_blank" rel="noreferrer">
                  Visit domain
                </Link>
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6 text-sm text-slate-600">
            <span>Created {formatDate(detail.contact.createdAt)}</span>
            <span>Domain: {detail.contact.domain ?? "—"}</span>
            <span>HubSpot ID: {detail.contact.hubspotContactId ?? "—"}</span>
          </div>
          <ReEnrichButton contactId={detail.contact.id} disabled={dbUser.role === "read_only"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enrichment history</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Approved by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.enrichments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="flex h-24 items-center justify-center text-sm text-slate-500">
                        No enrichments yet.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  detail.enrichments.map((enrichment) => (
                    <TableRow key={enrichment.id}>
                      <TableCell>{formatDate(enrichment.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{enrichment.status}</Badge>
                      </TableCell>
                      <TableCell>{enrichment.classification ?? "—"}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {[enrichment.addressLine1, enrichment.city, enrichment.postcode]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </TableCell>
                      <TableCell>{enrichment.decidedByUserId ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {detail.events.length === 0 ? (
              <p className="text-sm text-slate-500">No events recorded for this contact yet.</p>
            ) : (
              detail.events.map((event) => (
                <div key={event.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{event.type}</span>
                    <span className="text-slate-500">{formatDate(event.createdAt)}</span>
                  </div>
                  {event.payload ? (
                    <pre className="mt-2 max-h-48 overflow-auto rounded bg-white p-3 text-xs text-slate-600">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
