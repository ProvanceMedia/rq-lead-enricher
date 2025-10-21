import { redirect } from "next/navigation";
import { EventType, Prisma } from "@prisma/client";

import { AppShell } from "@/components/layout/app-shell";
import { ActivityFilters } from "@/components/activity/activity-filters";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ActivityPageProps {
  searchParams?: {
    status?: string;
    userId?: string;
    from?: string;
    to?: string;
    classification?: string;
  };
}

const CLASSIFICATIONS = [
  "Online Retailer",
  "Direct Mail Agency",
  "Ad Agency",
  "eComm Agency",
  "Marketing Agency"
];

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/auth/sign-in");
  }

  const where: Prisma.EventWhereInput = {};

  if (searchParams?.status) {
    where.type = searchParams.status as EventType;
  }

  if (searchParams?.from || searchParams?.to) {
    where.createdAt = {
      gte: searchParams.from ? new Date(searchParams.from) : undefined,
      lte: searchParams.to ? new Date(searchParams.to) : undefined
    };
  }

  if (searchParams?.userId || searchParams?.classification) {
    where.enrichment = {
      is: {
        ...(searchParams.userId
          ? { decidedByUserId: searchParams.userId }
          : {}),
        ...(searchParams.classification
          ? { classification: searchParams.classification }
          : {})
      }
    };
  }

  const [events, users] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        contact: true,
        enrichment: true
      }
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <AppShell activePath="/activity" user={session.user}>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Activity</h1>
            <p className="text-sm text-muted-foreground">
              Track outreach enrichments and approvals in real time.
            </p>
          </div>
        </header>

        <ActivityFilters
          statuses={Object.values(EventType)}
          users={users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email
          }))}
          canExport
          classifications={CLASSIFICATIONS}
        />

        <ActivityTimeline
          events={events.map((event) => ({
            ...event,
            createdAt: event.createdAt.toISOString(),
            payload: event.payload as Record<string, unknown> | null,
            contact: event.contact
              ? {
                  id: event.contact.id,
                  email: event.contact.email,
                  company: event.contact.company
                }
              : null,
            enrichment: event.enrichment
              ? {
                  id: event.enrichment.id,
                  classification: event.enrichment.classification,
                  status: event.enrichment.status
                }
              : null
          }))}
        />
      </div>
    </AppShell>
  );
}
