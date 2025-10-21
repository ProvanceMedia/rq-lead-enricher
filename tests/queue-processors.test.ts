import { describe, expect, it } from "vitest";

import { buildCandidateUrls, FALLBACK_PS } from "@/worker/processors/enrich";

describe("enrich processor helpers", () => {
  it("buildCandidateUrls returns canonical URLs", () => {
    const urls = buildCandidateUrls("example.com", "Example Co");

    expect(urls).toEqual(
      expect.arrayContaining([
        "https://example.com",
        "https://example.com/contact",
        "https://example.com/about",
        "https://www.linkedin.com/company/example-co",
        expect.stringContaining(
          "https://find-and-update.company-information.service.gov.uk/search"
        )
      ])
    );
  });

  it("fallback P.S. line is defined", () => {
    expect(FALLBACK_PS.length).toBeGreaterThan(10);
  });
});
