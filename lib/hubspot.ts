import { Enrichment, Contact } from "@prisma/client";

import { getServerEnv } from "@/lib/env";

const env = getServerEnv();

const HUBSPOT_BASE_URL = "https://api.hubapi.com";

export interface HubSpotContactPayload {
  properties: Record<string, string | null>;
}

export const HUBSPOT_STATIC_FIELDS = {
  lifecyclestage: "1101494863",
  outbound_cauldron_stage: "3. Address Procured"
} as const;

export function mapEnrichmentToHubSpot(
  contact: Contact,
  enrichment: Enrichment
): HubSpotContactPayload {
  return {
    properties: {
      address: contact.company ?? "",
      street_address_line_2: enrichment.addressLine1 ?? "",
      street_address_line_3: enrichment.addressLine2 ?? "",
      city: enrichment.city ?? "",
      state: "",
      zip: enrichment.postcode ?? "",
      country: enrichment.country ?? "",
      company_type: enrichment.classification ?? "",
      lifecyclestage: HUBSPOT_STATIC_FIELDS.lifecyclestage,
      outbound_cauldron_stage: HUBSPOT_STATIC_FIELDS.outbound_cauldron_stage,
      custom_p_s__line: enrichment.psLine ?? ""
    }
  };
}

async function hubspotFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!env.HUBSPOT_PRIVATE_APP_TOKEN) {
    throw new Error("HUBSPOT_PRIVATE_APP_TOKEN is not configured");
  }

  const response = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.HUBSPOT_PRIVATE_APP_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`HubSpot request failed (${response.status}): ${message}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export async function updateHubSpotContact(
  hubspotContactId: string,
  payload: HubSpotContactPayload
) {
  return hubspotFetch(
    `/crm/v3/objects/contacts/${hubspotContactId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    }
  );
}

export async function createHubSpotContact(payload: HubSpotContactPayload) {
  return hubspotFetch<{ id: string }>(`/crm/v3/objects/contacts`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
