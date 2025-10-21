import { EventType } from "@prisma/client";
import type { Job } from "bullmq";

import { generateEnrichmentInsights } from "@/lib/claude";
import { recordEvent } from "@/lib/events";
import { scrapeUrls } from "@/lib/firecrawl";
import { prisma } from "@/lib/prisma";
import { notifyQueue } from "@/lib/queue";

export interface EnrichJobData {
  enrichmentId: string;
}

export const FALLBACK_PS =
  "P.S. Life's too short for boring mail. Enjoy the chocolate!";

export function buildCandidateUrls(
  domain?: string | null,
  company?: string | null
) {
  if (!domain && !company) {
    return [];
  }

  const sanitizedDomain = domain
    ? domain.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : undefined;

  const baseUrl = sanitizedDomain
    ? `https://${sanitizedDomain}`
    : undefined;

  const cleanCompany =
    company
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ?? "";

  const urls = new Set<string>();

  if (baseUrl) {
    urls.add(baseUrl);
    urls.add(`${baseUrl}/contact`);
    urls.add(`${baseUrl}/about`);
    urls.add(`${baseUrl}/privacy`);
    urls.add(`${baseUrl}/terms`);
  }

  if (cleanCompany) {
    urls.add(`https://www.linkedin.com/company/${cleanCompany}`);
    urls.add(`https://twitter.com/${cleanCompany}`);
    urls.add(`https://www.facebook.com/${cleanCompany}`);
    urls.add(
      `https://find-and-update.company-information.service.gov.uk/search?q=${encodeURIComponent(
        company ?? cleanCompany
      )}`
    );
  }

  return Array.from(urls);
}

export default async function enrichProcessor(job: Job<EnrichJobData>) {
  const enrichment = await prisma.enrichment.findUnique({
    where: { id: job.data.enrichmentId },
    include: { contact: true }
  });

  if (!enrichment || !enrichment.contact) {
    throw new Error(
      `Enrichment ${job.data.enrichmentId} not found or missing contact`
    );
  }

  try {
    const candidateUrls = buildCandidateUrls(
      enrichment.contact.domain,
      enrichment.contact.company
    );

    const scrapedPages = await scrapeUrls(candidateUrls);

    const insights = await generateEnrichmentInsights({
      contact: {
        firstName: enrichment.contact.firstName,
        lastName: enrichment.contact.lastName,
        company: enrichment.contact.company,
        domain: enrichment.contact.domain
      },
      scrapedPages
    });

    const updated = await prisma.enrichment.update({
      where: { id: enrichment.id },
      data: {
        status: "awaiting_approval",
        addressLine1: insights.addressLine1 ?? null,
        addressLine2: insights.addressLine2 ?? null,
        city: insights.city ?? null,
        postcode: insights.postcode ?? null,
        country: insights.country ?? null,
        classification: insights.classification ?? null,
        psLine:
          insights.psLine && insights.psLine.trim().length > 0
            ? insights.psLine
            : FALLBACK_PS,
        psSourceUrl: insights.psSourceUrl ?? null,
        addressSourceUrl: insights.addressSourceUrl ?? null,
        approvalBlock: insights.approvalBlock,
        error: null
      }
    });

    await recordEvent({
      type: EventType.enriched,
      contactId: updated.contactId,
      enrichmentId: updated.id,
      payload: {
        classification: updated.classification,
        domain: enrichment.contact.domain
      }
    });

    await recordEvent({
      type: EventType.approval_requested,
      contactId: updated.contactId,
      enrichmentId: updated.id,
      payload: {
        approvalBlock: updated.approvalBlock
      }
    });

    await notifyQueue.add("approval-ready", {
      enrichmentId: updated.id
    });

    return updated;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown enrichment error";

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
      payload: { message }
    });

    throw error;
  }
}
