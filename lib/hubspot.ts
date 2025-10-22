import type { Contact, Enrichment } from "@/db/schema";
import { env } from "./env";
import { HttpError } from "./errors";

const HUBSPOT_BASE_URL = "https://api.hubapi.com";

type HubspotUpdateResult =
  | { status: "skipped"; reason: string }
  | { status: "success"; id: string }
  | { status: "failed"; reason: string };

const token = env.HUBSPOT_PRIVATE_APP_TOKEN;

const hubspotHeaders: HeadersInit = token
  ? {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "RoboQuill-Outreach/1.0"
    }
  : {};

async function findContactIdByEmail(email: string) {
  if (!token) {
    return null;
  }

  const response = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/search`, {
    method: "POST",
    headers: hubspotHeaders,
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: email
            }
          ]
        }
      ],
      limit: 1,
      properties: ["email"]
    })
  });

  if (!response.ok) {
    console.warn("HubSpot search failed", await response.text());
    return null;
  }

  const data = (await response.json()) as { results?: Array<{ id: string }> };
  return data.results?.[0]?.id ?? null;
}

export async function syncHubspotContact({
  contact,
  enrichment
}: {
  contact: Contact;
  enrichment: Enrichment;
}): Promise<HubspotUpdateResult> {
  if (!token) {
    return { status: "skipped", reason: "Missing HUBSPOT_PRIVATE_APP_TOKEN" };
  }

  const hubspotId =
    contact.hubspotContactId ?? (await findContactIdByEmail(contact.email));

  if (!hubspotId) {
    return { status: "failed", reason: "HubSpot contact not found" };
  }

  const payload = {
    properties: {
      address: contact.company ?? "",
      street_address_line_2: enrichment.addressLine1 ?? "",
      street_address_line_3: enrichment.addressLine2 ?? "",
      city: enrichment.city ?? "",
      state: "",
      zip: enrichment.postcode ?? "",
      country: enrichment.country ?? "",
      company_type: enrichment.classification ?? "",
      lifecyclestage: "1101494863",
      outbound_cauldron_stage: "3. Address Procured",
      custom_p_s__line: enrichment.psLine ?? ""
    }
  };

  const response = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/${hubspotId}`, {
    method: "PATCH",
    headers: hubspotHeaders,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new HttpError(
      `HubSpot update failed: ${response.status} ${errorBody}`,
      response.status
    );
  }

  return { status: "success", id: hubspotId };
}
