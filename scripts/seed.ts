/* eslint-disable no-console */
import { inArray } from "drizzle-orm";
import { db, closeDbPool } from "../db/client";
import {
  contacts,
  enrichments,
  events,
  settings,
  users
} from "../db/schema";

async function seed() {
  console.log("Starting seed...");

  const operatorUser = {
    id: "user_demo_operator",
    email: "operator@roboquill.io",
    name: "Demo Operator",
    role: "operator" as const
  };

  await db
    .insert(users)
    .values(operatorUser)
    .onConflictDoNothing({ target: users.id });

  const contactsData = [
    {
      email: "sarah.banks@example.com",
      firstName: "Sarah",
      lastName: "Banks",
      company: "Jetset Studio",
      domain: "jetsetstudio.com"
    },
    {
      email: "leo.santos@example.com",
      firstName: "Leo",
      lastName: "Santos",
      company: "Evergreen Marketing",
      domain: "evergreenmktg.co"
    },
    {
      email: "megan.cho@example.com",
      firstName: "Megan",
      lastName: "Cho",
      company: "Brightside D2C",
      domain: "brightsided2c.com"
    }
  ];

  await db
    .insert(contacts)
    .values(
      contactsData.map((contact) => ({
        ...contact
      }))
    )
    .onConflictDoNothing({ target: contacts.email });

  const seededContacts = await db
    .select()
    .from(contacts)
    .where(inArray(contacts.email, contactsData.map((item) => item.email)));

  if (seededContacts.length < contactsData.length) {
    throw new Error("Contacts failed to insert during seed");
  }

  const cities = ["London", "Manchester", "Bristol"];
  const postcodes = ["EC1A 1BB", "M1 2HY", "BS1 4ST"];
  const classifications = ["Online Retailer", "Marketing Agency", "eComm Agency"];
  const psLines = [
    "Congrats on the new product launch—it looks stellar.",
    "Loved the latest campaign revamp for your SaaS clients.",
    "Saw the shoutout in Shopify's newsletter—impressive."
  ];
  const psSources = [
    "https://techcrunch.com",
    "https://campaignbrief.com",
    "https://www.shopify.com/blog"
  ];
  const addressSources = [
    "https://jetsetstudio.com/contact",
    "https://evergreenmktg.co/about",
    "https://brightsided2c.com/contact"
  ];

  const enrichmentRows = seededContacts.slice(0, 3).map((contact, index) => {
    const city = cities[index] ?? "London";
    const postcode = postcodes[index] ?? "EC1A 1BB";
    const classification = classifications[index] ?? "Marketing Agency";
    const psLine = psLines[index] ?? psLines[0];
    const psSource = psSources[index] ?? psSources[0];
    const addressSource = addressSources[index] ?? addressSources[0];

    const approvalBlock = `CONTACT: ${contact.firstName ?? ""} ${contact.lastName ?? ""} at ${contact.company ?? ""}
ADDRESS FOUND: ${100 + index} Market Street, Suite 200, ${
      city
    }, United Kingdom, ${postcode}
SOURCE: ${addressSource}
CLASSIFICATION: ${classification}
P.S. LINE: ${psLine}
P.S. SOURCE: ${psSource}

Ready to update HubSpot?`;

    return {
      contactId: contact.id,
      status: "awaiting_approval" as const,
      addressLine1: `${100 + index} Market Street`,
      addressLine2: "Suite 200",
      city,
      postcode,
      country: "United Kingdom",
      classification,
      psLine,
      psSourceUrl: psSource,
      addressSourceUrl: addressSource,
      approvalBlock
    };
  });

  await db.insert(enrichments).values(enrichmentRows).onConflictDoNothing();

  const seededEnrichmentRows = await db
    .select()
    .from(enrichments)
    .where(inArray(enrichments.contactId, seededContacts.map((c) => c.id)));

  const eventsRows = seededEnrichmentRows.map((enrichment) => ({
    contactId: enrichment.contactId,
    enrichmentId: enrichment.id,
    type: "approval_requested",
    payload: JSON.stringify({ reason: "Seed data" })
  }));

  await db.insert(events).values(eventsRows).onConflictDoNothing();

  await db
    .insert(settings)
    .values([
      {
        key: "daily_quota",
        value: { value: 40 }
      },
      {
        key: "segment_filters",
        value: {
          industries: ["Marketing & Advertising"],
          company_size_min: 10,
          company_size_max: 500
        }
      },
      {
        key: "company_cooldown_days",
        value: { value: 90 }
      },
      {
        key: "allowed_domains",
        value: ["roboquill.io"]
      },
      {
        key: "skip_rules",
        value: {
          countries: ["United States"],
          keywords: ["intern", "student"]
        }
      }
    ])
    .onConflictDoNothing({ target: settings.key });

  console.log("Seed complete.");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDbPool();
  });
