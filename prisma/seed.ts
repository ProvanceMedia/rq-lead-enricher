import { EnrichmentStatus, PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function createUser() {
  const users = [
    {
      email: "operator@roboquill.io",
      name: "Queue Operator",
      role: Role.admin
    },
    {
      email: "stuart@roboquill.io",
      name: "Stuart",
      role: Role.admin
    }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { role: user.role, name: user.name },
      create: { email: user.email, role: user.role, name: user.name }
    });
  }
}

async function createContacts() {
  const contacts = [
    {
      email: "sarah.price@example.com",
      firstName: "Sarah",
      lastName: "Price",
      company: "Aurora Chocolates",
      domain: "aurorachocolates.co.uk",
      classification: "Online Retailer",
      psLine:
        "P.S. Loved the feature in Gourmet Times about your holiday truffles innovation!",
      psSourceUrl: "https://gourmettimestoday.co.uk/aurora-holiday-truffles",
      address: {
        line1: "22 Market Street",
        line2: "Suite 4",
        city: "London",
        postcode: "SW1A 1AA",
        country: "United Kingdom"
      },
      approvalBlock: `CONTACT: Sarah Price at Aurora Chocolates
ADDRESS FOUND: 22 Market Street, Suite 4, London SW1A 1AA, United Kingdom
SOURCE: https://aurorachocolates.co.uk/contact
CLASSIFICATION: Online Retailer
P.S. LINE: Loved the feature in Gourmet Times about your holiday truffles innovation!
P.S. SOURCE: https://gourmettimestoday.co.uk/aurora-holiday-truffles`
    },
    {
      email: "daniel.ross@example.com",
      firstName: "Daniel",
      lastName: "Ross",
      company: "Brightside Mailers",
      domain: "brightsidemailers.com",
      classification: "Direct Mail Agency",
      psLine:
        "P.S. Congrats on the Royal Mail Partnership Award—huge recognition for Brightside!",
      psSourceUrl:
        "https://directmailawards.co.uk/2023-winners/brightside-mailers",
      address: {
        line1: "12 Kingfisher Court",
        line2: "",
        city: "Manchester",
        postcode: "M1 4BT",
        country: "United Kingdom"
      },
      approvalBlock: `CONTACT: Daniel Ross at Brightside Mailers
ADDRESS FOUND: 12 Kingfisher Court, Manchester M1 4BT, United Kingdom
SOURCE: https://brightsidemailers.com/contact
CLASSIFICATION: Direct Mail Agency
P.S. LINE: Congrats on the Royal Mail Partnership Award—huge recognition for Brightside!
P.S. SOURCE: https://directmailawards.co.uk/2023-winners/brightside-mailers`
    },
    {
      email: "amelia.chen@example.com",
      firstName: "Amelia",
      lastName: "Chen",
      company: "Northwind Creative",
      domain: "northwindcreative.uk",
      classification: "Ad Agency",
      psLine:
        "P.S. Loved the Out of Home Week talk—your omni-channel case study was 🔥",
      psSourceUrl:
        "https://oohweek.com/blog/northwind-creative-omni-channel-case-study",
      address: {
        line1: "8 Riverside Close",
        line2: "Floor 3",
        city: "Bristol",
        postcode: "BS1 4QA",
        country: "United Kingdom"
      },
      approvalBlock: `CONTACT: Amelia Chen at Northwind Creative
ADDRESS FOUND: 8 Riverside Close, Floor 3, Bristol BS1 4QA, United Kingdom
SOURCE: https://northwindcreative.uk/contact
CLASSIFICATION: Ad Agency
P.S. LINE: Loved the Out of Home Week talk—your omni-channel case study was 🔥
P.S. SOURCE: https://oohweek.com/blog/northwind-creative-omni-channel-case-study`
    },
    {
      email: "lewis.james@example.com",
      firstName: "Lewis",
      lastName: "James",
      company: "Ecom Atlas",
      domain: "ecomatlas.com",
      classification: "eComm Agency",
      psLine:
        "P.S. Your Shopify Plus migration guide is now trending on the Ecommerce Council feed!",
      psSourceUrl:
        "https://ecommercecouncil.io/news/shopify-plus-migration-guide-ecom-atlas",
      address: {
        line1: "94 Camden High Street",
        line2: "",
        city: "London",
        postcode: "NW1 7JY",
        country: "United Kingdom"
      },
      approvalBlock: `CONTACT: Lewis James at Ecom Atlas
ADDRESS FOUND: 94 Camden High Street, London NW1 7JY, United Kingdom
SOURCE: https://ecomatlas.com/contact
CLASSIFICATION: eComm Agency
P.S. LINE: Your Shopify Plus migration guide is now trending on the Ecommerce Council feed!
P.S. SOURCE: https://ecommercecouncil.io/news/shopify-plus-migration-guide-ecom-atlas`
    },
    {
      email: "olivia.hart@example.com",
      firstName: "Olivia",
      lastName: "Hart",
      company: "Letterpress Lab",
      domain: "letterpresslab.co",
      classification: "Marketing Agency",
      psLine:
        "P.S. Huge kudos on launching the sustainability pledge—love the recycled foil tests!",
      psSourceUrl:
        "https://letterindustrynews.com/article/letterpress-lab-sustainability-pledge",
      address: {
        line1: "3 Artisan Way",
        line2: "Unit 5",
        city: "Leeds",
        postcode: "LS1 3AD",
        country: "United Kingdom"
      },
      approvalBlock: `CONTACT: Olivia Hart at Letterpress Lab
ADDRESS FOUND: 3 Artisan Way, Unit 5, Leeds LS1 3AD, United Kingdom
SOURCE: https://letterpresslab.co/contact
CLASSIFICATION: Marketing Agency
P.S. LINE: Huge kudos on launching the sustainability pledge—love the recycled foil tests!
P.S. SOURCE: https://letterindustrynews.com/article/letterpress-lab-sustainability-pledge`
    }
  ];

  for (const contact of contacts) {
    const created = await prisma.contact.upsert({
      where: { email: contact.email },
      update: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company,
        domain: contact.domain
      },
      create: {
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company,
        domain: contact.domain
      }
    });

    await prisma.enrichment.upsert({
      where: { id: `${created.id}-seed` },
      update: {
        classification: contact.classification,
        psLine: contact.psLine,
        psSourceUrl: contact.psSourceUrl,
        addressLine1: contact.address.line1,
        addressLine2: contact.address.line2 || null,
        city: contact.address.city,
        postcode: contact.address.postcode,
        country: contact.address.country,
        approvalBlock: contact.approvalBlock
      },
      create: {
        id: `${created.id}-seed`,
        contactId: created.id,
        status: EnrichmentStatus.awaiting_approval,
        classification: contact.classification,
        psLine: contact.psLine,
        psSourceUrl: contact.psSourceUrl,
        addressLine1: contact.address.line1,
        addressLine2: contact.address.line2 || null,
        city: contact.address.city,
        postcode: contact.address.postcode,
        country: contact.address.country,
        approvalBlock: contact.approvalBlock
      }
    });
  }
}

async function main() {
  await createUser();
  await createContacts();
  // eslint-disable-next-line no-console
  console.log("Seed data created");
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
