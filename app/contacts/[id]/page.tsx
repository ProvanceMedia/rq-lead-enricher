import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AppShell } from "@/components/layout/app-shell";
import { ReEnrichButton } from "@/components/contacts/re-enrich-button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canApprove } from "@/lib/roles";

interface ContactPageProps {
  params: {
    id: string;
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/auth/sign-in");
  }

  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      enrichments: {
        orderBy: { createdAt: "desc" }
      },
      events: {
        orderBy: { createdAt: "desc" },
        take: 100
      }
    }
  });

  if (!contact) {
    notFound();
  }

  const latestEnrichment = contact.enrichments[0];

  return (
    <AppShell activePath="/contacts" user={session.user}>
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">
                {contact.firstName} {contact.lastName}
              </h1>
              <Badge variant="secondary">
                {latestEnrichment?.status ?? "no status"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {contact.email} · {contact.company} · {contact.domain}
            </p>
            {contact.hubspotContactId ? (
              <Link
                href={`https://app.hubspot.com/contacts/${contact.hubspotContactId}`}
                className="text-sm text-primary hover:underline"
                target="_blank"
              >
                View in HubSpot
              </Link>
            ) : null}
          </div>
          {canApprove(session.user.role) ? (
            <ReEnrichButton contactId={contact.id} />
          ) : null}
        </header>

        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Enrichment History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {contact.enrichments.map((enrichment) => (
                <div key={enrichment.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {enrichment.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {enrichment.createdAt.toLocaleString()}
                      </span>
                    </div>
                    {enrichment.decidedAt ? (
                      <span className="text-xs text-muted-foreground">
                        Decided at {enrichment.decidedAt.toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  <Separator className="my-3" />
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        Classification
                      </p>
                      <p>{enrichment.classification ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        Postal address
                      </p>
                      <p>
                        {[enrichment.addressLine1, enrichment.addressLine2]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                      <p>
                        {[enrichment.city, enrichment.postcode]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                      <p>{enrichment.country}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase text-muted-foreground">
                        P.S. line
                      </p>
                      <p>{enrichment.psLine ?? "—"}</p>
                      {enrichment.psSourceUrl ? (
                        <a
                          href={enrichment.psSourceUrl}
                          className="text-xs text-primary hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Source
                        </a>
                      ) : null}
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase text-muted-foreground">
                        Approval block
                      </p>
                      <pre className="mt-1 whitespace-pre-wrap rounded bg-muted/40 p-3 text-xs">
                        {enrichment.approvalBlock ?? "—"}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
              {contact.enrichments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No enrichments recorded yet.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.events.map((event) => (
                <div key={event.id} className="border-b pb-3 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline" className="capitalize">
                      {event.type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {event.createdAt.toLocaleString()}
                    </span>
                  </div>
                  {event.payload ? (
                    <pre className="mt-2 whitespace-pre-wrap rounded bg-muted/30 p-2 text-xs">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))}
              {contact.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No events recorded for this contact.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
