import { db } from "@/db/client";
import { events } from "@/db/schema";

const SENSITIVE_KEYS = new Set([
  "email",
  "address",
  "addressLine1",
  "addressLine2",
  "postcode",
  "postal_code",
  "phone",
  "psLine"
]);

const redactValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        SENSITIVE_KEYS.has(key) ? "[redacted]" : redactValue(val)
      ])
    );
  }

  if (typeof value === "string") {
    if (
      value.includes("@") ||
      /\d{2,} [A-Za-z0-9 ]+/.test(value) ||
      /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test(value)
    ) {
      return "[redacted]";
    }
  }

  return value;
};

type LogEventOptions = {
  contactId?: string | null;
  enrichmentId?: string | null;
  type:
    | "pulled_from_apollo"
    | "deduped"
    | "enriched"
    | "approval_requested"
    | "approved"
    | "rejected"
    | "hubspot_updated"
    | "failed"
    | "re_enrich_requested";
  payload?: Record<string, unknown> | null;
};

export async function logEvent({
  contactId,
  enrichmentId,
  type,
  payload
}: LogEventOptions) {
  await db.insert(events).values({
    contactId: contactId ?? null,
    enrichmentId: enrichmentId ?? null,
    type,
    payload: payload ? JSON.stringify(redactValue(payload)) : null
  });
}
