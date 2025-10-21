import { subMonths } from "date-fns";

import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const env = getServerEnv();

const APOLLO_BASE_URL = "https://api.apollo.io/v1";

export interface ApolloPerson {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  organization: {
    name: string | null;
    domain: string | null;
  } | null;
  employment_history?: Array<{
    organization_name: string | null;
    title: string | null;
    start_date: string | null;
  }>;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  linkedin_url?: string | null;
}

export interface ApolloSearchParams {
  page?: number;
  per_page?: number;
  titles?: string[];
  seniority_levels?: string[];
  person_locations?: string[];
  company_locations?: string[];
  require_email?: boolean;
}

async function apolloFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!env.APOLLO_API_KEY) {
    throw new Error("APOLLO_API_KEY is not configured");
  }

  const response = await fetch(`${APOLLO_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": env.APOLLO_API_KEY,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Apollo request failed (${response.status}): ${errorBody}`
    );
  }

  return (await response.json()) as T;
}

export async function searchProspects(params: ApolloSearchParams = {}) {
  return apolloFetch<{
    contacts: ApolloPerson[];
    pagination: { page: number; per_page: number; total_entries: number };
  }>("/contacts/search", {
    method: "POST",
    body: JSON.stringify({
      person_titles: params.titles ?? [
        "Head of Retention",
        "Head of CRM",
        "Director of Marketing",
        "Marketing Lead",
        "CMO"
      ],
      person_locations: params.person_locations ?? ["United Kingdom"],
      company_locations: params.company_locations ?? ["United Kingdom"],
      seniority_levels:
        params.seniority_levels ?? ["director", "vp", "c-level"],
      page: params.page ?? 1,
      per_page: params.per_page ?? env.DAILY_QUOTA,
      q_organization_domains: [],
      emails: [],
      require_email: params.require_email ?? true
    })
  });
}

export async function stageProspects(people: ApolloPerson[]) {
  const staged: Array<{ apolloId: string; contactId: string }> = [];
  const skipped: string[] = [];

  for (const person of people) {
    if (!person.email || !person.organization?.domain) {
      skipped.push(person.id);
      continue;
    }

    const domain = person.organization.domain.toLowerCase();

    const cooldownDate = subMonths(new Date(), 1);

    const existing = await prisma.contact.findFirst({
      where: {
        OR: [
          { email: person.email.toLowerCase() },
          { domain, firstName: person.first_name ?? undefined, lastName: person.last_name ?? undefined }
        ],
        createdAt: {
          gte: cooldownDate
        }
      }
    });

    if (existing) {
      skipped.push(person.id);
      continue;
    }

    const contactRecord = await prisma.contact.upsert({
      where: { email: person.email.toLowerCase() },
      update: {
        firstName: person.first_name ?? undefined,
        lastName: person.last_name ?? undefined,
        company: person.organization?.name ?? undefined,
        domain,
        apolloContactId: person.id
      },
      create: {
        email: person.email.toLowerCase(),
        firstName: person.first_name ?? undefined,
        lastName: person.last_name ?? undefined,
        company: person.organization?.name ?? undefined,
        domain,
        apolloContactId: person.id
      }
    });

    staged.push({ apolloId: person.id, contactId: contactRecord.id });
  }

  return { staged, skipped };
}
