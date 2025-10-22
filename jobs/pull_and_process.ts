/* eslint-disable no-console */
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, enrichments } from "@/db/schema";
import { logEvent } from "@/lib/events";
import { getSettingsMap } from "@/lib/services/settings";
import type { Contact } from "@/db/schema";

type ApolloContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  email: string | null;
  website: string | null;
  domain: string | null;
};

type EnrichmentResult = {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  classification: string;
  psLine: string;
  psSourceUrl: string | null;
  addressSourceUrl: string | null;
  approvalBlock: string;
};

const jobEnv = {
  apolloKey: process.env.APOLLO_API_KEY,
  hubspotToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN,
  firecrawlKey: process.env.FIRECRAWL_API_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  dailyQuota: Number.parseInt(process.env.DAILY_QUOTA ?? "40", 10)
};

const DEFAULT_DAILY_QUOTA = Number.isFinite(jobEnv.dailyQuota) ? jobEnv.dailyQuota : 40;

const REQUIRED_HUBSPOT_STATUSES = new Set(["customer", "evangelist", "closed lost", "dnc"]);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempt >= 5) {
      throw error;
    }
    const backoff = Math.min(2000 * 2 ** (attempt - 1), 15000);
    await delay(backoff);
    return withRetry(fn, attempt + 1);
  }
}

async function fetchApolloContacts(quota: number, filters: unknown): Promise<ApolloContact[]> {
  if (!jobEnv.apolloKey) {
    console.warn("APOLLO_API_KEY is not set. Skipping Apollo fetch.");
    return [];
  }

  const response = await withRetry(() =>
    fetch("https://api.apollo.io/v1/contacts/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": jobEnv.apolloKey as string
      },
      body: JSON.stringify({
        q: "",
        persona_id: null,
        page: 1,
        per_page: quota,
        ...((filters as Record<string, unknown>) ?? {})
      })
    })
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Apollo request failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as { contacts?: ApolloContact[] };
  return payload.contacts ?? [];
}

async function hubspotHasValidContact(email: string | null, fullName: string | null, domain: string | null) {
  if (!jobEnv.hubspotToken || !email) {
    return false;
  }

  const response = await withRetry(() =>
    fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jobEnv.hubspotToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName: "email", operator: "EQ", value: email },
              ...(fullName && domain
                ? [
                    {
                      propertyName: "domain",
                      operator: "EQ",
                      value: domain
                    },
                    {
                      propertyName: "fullname",
                      operator: "EQ",
                      value: fullName
                    }
                  ]
                : [])
            ]
          }
        ],
        properties: ["lifecyclestage", "address", "street_address_line_2"]
      })
    })
  );

  if (!response.ok) {
    const body = await response.text();
    console.warn("HubSpot dedupe failed", body);
    return false;
  }

  const data = (await response.json()) as {
    results?: Array<{ id: string; properties: Record<string, string | null> }>;
  };

  const match = data.results?.[0];
  if (!match) {
    return false;
  }

  const lifecycle = match.properties?.lifecyclestage?.toLowerCase() ?? "";
  if (REQUIRED_HUBSPOT_STATUSES.has(lifecycle)) {
    return true;
  }

  const hasAddress =
    Boolean(match.properties?.address) || Boolean(match.properties?.street_address_line_2);

  return hasAddress;
}

function determineClassification(company: string | null, domain: string | null): string {
  const text = `${company ?? ""} ${domain ?? ""}`.toLowerCase();
  if (text.includes("shop") || text.includes("store")) return "Online Retailer";
  if (text.includes("mail")) return "Direct Mail Agency";
  if (text.includes("media")) return "Ad Agency";
  if (text.includes("ecom") || text.includes("commerce")) return "eComm Agency";
  return "Marketing Agency";
}

async function enrichContact(contact: Contact): Promise<EnrichmentResult> {
  if (!jobEnv.firecrawlKey || !jobEnv.anthropicKey) {
    console.warn("Enrichment API keys missing. Using fallback enrichment.");
    const classification = determineClassification(contact.company ?? null, contact.domain ?? null);
    return {
      addressLine1: "123 Demo Street",
      addressLine2: null,
      city: "London",
      postcode: "EC1A 1BB",
      country: "United Kingdom",
      classification,
      psLine: "Congrats on the recent launch—impressive momentum.",
      psSourceUrl: null,
      addressSourceUrl: null,
      approvalBlock: createApprovalBlock(contact, {
        addressLine1: "123 Demo Street",
        addressLine2: null,
        city: "London",
        postcode: "EC1A 1BB",
        country: "United Kingdom",
        classification,
        psLine: "Congrats on the recent launch—impressive momentum.",
        psSourceUrl: null,
        addressSourceUrl: null
      })
    };
  }

  // Placeholder sequential enrichment: the real integration would scrape using Firecrawl
  // then summarise using Claude. We keep the sequential delays/backoff structure.
  await delay(750);
  const classification = determineClassification(contact.company ?? null, contact.domain ?? null);
  const addressLine1 = "Research Required";

  return {
    addressLine1,
    addressLine2: null,
    city: null,
    postcode: null,
    country: null,
    classification,
    psLine: "P.S. Life's too short for boring mail. Enjoy the chocolate!",
    psSourceUrl: null,
    addressSourceUrl: null,
    approvalBlock: createApprovalBlock(contact, {
      addressLine1,
      addressLine2: null,
      city: null,
      postcode: null,
      country: null,
      classification,
      psLine: "P.S. Life's too short for boring mail. Enjoy the chocolate!",
      psSourceUrl: null,
      addressSourceUrl: null
    })
  };
}

function createApprovalBlock(
  contact: Contact,
  enrichment: Omit<EnrichmentResult, "approvalBlock">
) {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email;
  const addressParts = [
    enrichment.addressLine1,
    enrichment.addressLine2,
    enrichment.city,
    enrichment.country,
    enrichment.postcode
  ]
    .filter(Boolean)
    .join(", ");

  return `CONTACT: ${name} at ${contact.company ?? "Unknown"}
ADDRESS FOUND: ${addressParts || "Not captured"}
SOURCE: ${enrichment.addressSourceUrl ?? "Not captured"}
CLASSIFICATION: ${enrichment.classification}
P.S. LINE: ${enrichment.psLine}
P.S. SOURCE: ${enrichment.psSourceUrl ?? "Fallback"}

Ready to update HubSpot?`;
}

async function processCandidate(candidate: ApolloContact) {
  const email = candidate.email;
  if (!email) {
    return;
  }

  const existing = await db.select().from(contacts).where(eq(contacts.email, email)).limit(1);

  if (existing[0]) {
    const existingEnrichment = await db
      .select()
      .from(enrichments)
      .where(eq(enrichments.contactId, existing[0].id))
      .orderBy(desc(enrichments.createdAt))
      .limit(1);

    if (existingEnrichment[0]?.status === "awaiting_approval" || existingEnrichment[0]?.status === "updated") {
      await logEvent({
        contactId: existing[0].id,
        type: "deduped",
        payload: { reason: "Existing enrichment pending or complete" }
      });
      return;
    }
  }

  const contactRecord =
    existing[0] ??
    (await db
      .insert(contacts)
      .values({
        email,
        firstName: candidate.first_name ?? undefined,
        lastName: candidate.last_name ?? undefined,
        company: candidate.organization_name ?? undefined,
        domain: candidate.domain ?? candidate.website ?? undefined,
        apolloContactId: candidate.id
      })
      .onConflictDoUpdate({
        target: contacts.email,
        set: {
          firstName: candidate.first_name ?? undefined,
          lastName: candidate.last_name ?? undefined,
          company: candidate.organization_name ?? undefined,
          domain: candidate.domain ?? candidate.website ?? undefined,
          apolloContactId: candidate.id
        }
      })
      .returning())[0];

  await logEvent({
    contactId: contactRecord.id,
    type: "pulled_from_apollo",
    payload: { apolloContactId: candidate.id }
  });

  const fullName = [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") || null;

  const hubspotSkip = await hubspotHasValidContact(email, fullName, candidate.domain ?? null);

  if (hubspotSkip) {
    await logEvent({
      contactId: contactRecord.id,
      type: "deduped",
      payload: { reason: "Existing HubSpot record with address" }
    });
    return;
  }

  const enrichment = await enrichContact(contactRecord);

  await logEvent({
    contactId: contactRecord.id,
    type: "enriched",
    payload: { strategy: "sequential" }
  });

  const [enrichmentRow] = await db
    .insert(enrichments)
    .values({
      contactId: contactRecord.id,
      status: "awaiting_approval",
      addressLine1: enrichment.addressLine1,
      addressLine2: enrichment.addressLine2,
      city: enrichment.city,
      postcode: enrichment.postcode,
      country: enrichment.country,
      classification: enrichment.classification,
      psLine: enrichment.psLine,
      psSourceUrl: enrichment.psSourceUrl,
      addressSourceUrl: enrichment.addressSourceUrl,
      approvalBlock: enrichment.approvalBlock
    })
    .returning();

  await logEvent({
    contactId: contactRecord.id,
    enrichmentId: enrichmentRow.id,
    type: "approval_requested",
    payload: { message: "Awaiting operator approval" }
  });

  await delay(500);
}

async function main() {
  console.log("Starting pull and process job");
  const settings = await getSettingsMap();
  const quota =
    Number((settings.daily_quota as { value?: number } | undefined)?.value) || DEFAULT_DAILY_QUOTA;
  const filters = settings.segment_filters ?? {};

  console.log(`Daily quota: ${quota}`);

  const candidates = await fetchApolloContacts(quota, filters);

  console.log(`Fetched ${candidates.length} candidate contacts`);

  for (const candidate of candidates) {
    try {
      await processCandidate(candidate);
    } catch (error) {
      console.error("Failed to process candidate", candidate.email, error);
      await logEvent({
        contactId: null,
        type: "failed",
        payload: { email: candidate.email, error: String(error) }
      });
    }

    await delay(750);
  }

  console.log("Job complete");
  process.exit(0);
}

main().catch((error) => {
  console.error("Job failed", error);
  process.exit(1);
});
