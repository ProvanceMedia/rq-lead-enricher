import { EventType } from "@prisma/client";
import type { Job } from "bullmq";

import {
  createHubSpotContact,
  mapEnrichmentToHubSpot,
  updateHubSpotContact
} from "@/lib/hubspot";
import { recordEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export interface UpdateJobData {
  enrichmentId: string;
}

export default async function updateProcessor(job: Job<UpdateJobData>) {
  const enrichment = await prisma.enrichment.findUnique({
    where: { id: job.data.enrichmentId },
    include: { contact: true }
  });

  if (!enrichment || !enrichment.contact) {
    throw new Error(
      `Enrichment ${job.data.enrichmentId} not found for HubSpot update`
    );
  }

  try {
    const payload = mapEnrichmentToHubSpot(enrichment.contact, enrichment);

    let hubspotContactId = enrichment.contact.hubspotContactId;

    if (hubspotContactId) {
      await updateHubSpotContact(hubspotContactId, payload);
    } else {
      const created = await createHubSpotContact(payload);
      hubspotContactId = created.id;
      await prisma.contact.update({
        where: { id: enrichment.contactId },
        data: { hubspotContactId }
      });
    }

    const updated = await prisma.enrichment.update({
      where: { id: enrichment.id },
      data: {
        status: "updated"
      }
    });

    await recordEvent({
      type: EventType.hubspot_updated,
      contactId: updated.contactId,
      enrichmentId: updated.id,
      payload: {
        hubspotContactId
      }
    });

    return {
      hubspotContactId
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown HubSpot update error";

    await prisma.enrichment.update({
      where: { id: enrichment.id },
      data: {
        status: "error",
        error: message
      }
    });

    await recordEvent({
      type: EventType.failed,
      contactId: enrichment.contactId,
      enrichmentId: enrichment.id,
      payload: { message, stage: "hubspot_update" }
    });

    throw error;
  }
}
