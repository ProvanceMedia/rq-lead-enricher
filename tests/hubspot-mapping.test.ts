import { describe, expect, it } from "vitest";

import { mapEnrichmentToHubSpot, HUBSPOT_STATIC_FIELDS } from "@/lib/hubspot";

describe("mapEnrichmentToHubSpot", () => {
  it("maps enrichment fields to HubSpot payload", () => {
    const payload = mapEnrichmentToHubSpot(
      {
        id: "contact-1",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        company: "Test Company",
        domain: "testcompany.com",
        apolloContactId: "apollo-1",
        hubspotContactId: null,
        createdAt: new Date(),
        enrichments: [],
        events: []
      } as unknown as Parameters<typeof mapEnrichmentToHubSpot>[0],
      {
        id: "enrichment-1",
        contactId: "contact-1",
        status: "awaiting_approval",
        addressLine1: "123 Street",
        addressLine2: "Suite 4",
        city: "London",
        postcode: "SW1A 1AA",
        country: "United Kingdom",
        classification: "Online Retailer",
        psLine: "Congrats on the new store opening!",
        psSourceUrl: "https://news.example.com/article",
        addressSourceUrl: "https://company.com/contact",
        approvalBlock: "Sample block",
        error: null,
        decidedByUserId: null,
        decidedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
        contact: {} as never
      } as unknown as Parameters<typeof mapEnrichmentToHubSpot>[1]
    );

    expect(payload.properties).toMatchObject({
      address: "Test Company",
      street_address_line_2: "123 Street",
      street_address_line_3: "Suite 4",
      city: "London",
      state: "",
      zip: "SW1A 1AA",
      country: "United Kingdom",
      company_type: "Online Retailer",
      lifecyclestage: HUBSPOT_STATIC_FIELDS.lifecyclestage,
      outbound_cauldron_stage: HUBSPOT_STATIC_FIELDS.outbound_cauldron_stage,
      custom_p_s__line: "Congrats on the new store opening!"
    });
  });
});
