import { EventType } from "@prisma/client";
import type { Job } from "bullmq";

import { searchProspects, stageProspects } from "@/lib/apollo";
import { getServerEnv } from "@/lib/env";
import { recordEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { enrichQueue } from "@/lib/queue";

const env = getServerEnv();

export interface IngestJobData {
  page?: number;
  limit?: number;
}

export default async function ingestProcessor(
  job: Job<IngestJobData>
) {
  const limit = Math.min(job.data.limit ?? env.DAILY_QUOTA, env.DAILY_QUOTA);
  const page = job.data.page ?? 1;

  const { contacts } = await searchProspects({
    per_page: limit,
    page
  });

  const { staged, skipped } = await stageProspects(contacts);

  for (const skip of skipped) {
    await recordEvent({
      type: EventType.skipped,
      payload: { apolloContactId: skip }
    });
  }

  for (const record of staged) {
    await recordEvent({
      type: EventType.pulled_from_apollo,
      contactId: record.contactId,
      payload: { apolloContactId: record.apolloId }
    });

    const existingPending = await prisma.enrichment.findFirst({
      where: {
        contactId: record.contactId,
        status: "awaiting_approval",
        approvalBlock: null
      },
      orderBy: { createdAt: "desc" }
    });

    const enrichment =
      existingPending ??
      (await prisma.enrichment.create({
        data: {
          contactId: record.contactId,
          status: "awaiting_approval"
        }
      }));

    await enrichQueue.add("enrich-contact", {
      enrichmentId: enrichment.id
    });
  }

  return {
    staged: staged.length,
    skipped: skipped.length
  };
}
