import { EventType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function recordEvent(params: {
  contactId?: string | null;
  enrichmentId?: string | null;
  type: EventType;
  payload?: Record<string, unknown>;
}) {
  return prisma.event.create({
    data: {
      contactId: params.contactId ?? null,
      enrichmentId: params.enrichmentId ?? null,
      type: params.type,
      payload:
        params.payload === undefined
          ? undefined
          : (params.payload as unknown as Prisma.InputJsonValue)
    }
  });
}
