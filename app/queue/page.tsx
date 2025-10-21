import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ApprovalTable } from "@/components/queue/approval-table";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canApprove as canApproveRole } from "@/lib/roles";

export default async function QueuePage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/sign-in");
  }

  const enrichments = await prisma.enrichment.findMany({
    where: {
      status: "awaiting_approval",
      approvalBlock: {
        not: null
      }
    },
    include: { contact: true },
    orderBy: { createdAt: "asc" }
  });

  return (
    <AppShell activePath="/queue" user={session.user}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Approval Queue</h1>
          <p className="text-sm text-muted-foreground">
            Review enriched contacts and approve or reject mailing addresses.
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border bg-background">
        <ApprovalTable
          enrichments={enrichments.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            contact: {
              ...item.contact
            }
          }))}
          canApprove={canApproveRole(session.user.role)}
        />
      </div>
    </AppShell>
  );
}
