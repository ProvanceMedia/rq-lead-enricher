import type { Job } from "bullmq";

import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { postToSlack } from "@/lib/slack";

export interface NotifyJobData {
  type: "approval-ready" | "daily-digest";
  enrichmentId?: string;
  digest?: {
    added: number;
    enriched: number;
    approved: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

const env = getServerEnv();

export default async function notifyProcessor(job: Job<NotifyJobData>) {
  if (!env.SLACK_WEBHOOK_URL) {
    return;
  }

  if (job.data.type === "approval-ready" && job.data.enrichmentId) {
    const enrichment = await prisma.enrichment.findUnique({
      where: { id: job.data.enrichmentId },
      include: { contact: true }
    });

    if (!enrichment || !enrichment.contact) {
      return;
    }

    const approvalBlock = enrichment.approvalBlock ?? "Approval block unavailable";
    const url = `${env.NEXTAUTH_URL}/contacts/${enrichment.contactId}`;

    await postToSlack(
      [
        "*Approval required*",
        "```",
        approvalBlock,
        "```",
        `<${url}|Review in RoboQuill Outreach>`
      ].join("\n")
    );
    return;
  }

  if (job.data.type === "daily-digest" && job.data.digest) {
    const digest = job.data.digest;
    await postToSlack(
      [
        "*Daily Outreach Digest*",
        `New staged: ${digest.added}`,
        `Enriched: ${digest.enriched}`,
        `Approved: ${digest.approved}`,
        `Updated: ${digest.updated}`,
        `Skipped: ${digest.skipped}`,
        `Failed: ${digest.failed}`
      ].join("\n")
    );
  }
}
