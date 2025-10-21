import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    enrichment: {
      findUnique: vi.fn()
    }
  }
}));

import { POST } from "@/app/api/enrichments/[id]/approve/route";
import { auth } from "@/lib/auth";

describe("POST /api/enrichments/:id/approve", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await POST(new Request("http://localhost"), {
      params: { id: "123" }
    });

    expect(response.status).toBe(401);
  });
});
