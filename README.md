# RoboQuill Outreach Approvals

Production-grade Next.js 14 platform for reviewing and approving enriched contacts ahead of RoboQuill's handwritten mail outreach. Operators can triage enrichment output, push approved contacts to HubSpot, and monitor queue health end to end.

## Features

- **Secure access** with NextAuth magic links + Google OAuth restricted by email domain and role-based authorization (admin, operator, read only).
- **Approval workflow** showcasing enriched data, source links, and address previews with one-click approve / reject actions.
- **Activity timeline** with filters, CSV export, and realtime event history.
- **Contact deep dive** including enrichment history, audit trail, and manual re-enrichment trigger.
- **Configurable settings** for quotas, targeting rules, cool downs, skip logic, and integration health checks.
- **Background automation** driven by BullMQ workers for Apollo ingestion, Firecrawl + Claude enrichment, HubSpot updates, and Slack notifications.
- **Daily prospect pull** scheduled for 08:00 London time via DigitalOcean App Platform cron job.
- **Seed data** for instant demo (5 contacts + admin operator account).

## Tech Stack

- Next.js 14 App Router, React 18, TypeScript.
- Tailwind CSS with shadcn/ui components.
- NextAuth with Prisma adapter on Postgres.
- BullMQ backed by Managed Redis.
- Firecrawl + Anthropic Claude for enrichment intelligence.
- HubSpot CRM API for downstream updates.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis instance

### Installation

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Visit `http://localhost:3000`. Sign in with `operator@roboquill.io` (magic link) created during seeding.

### Environment

Copy `.env.example` and populate:

- `DATABASE_URL`, `REDIS_URL`
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ALLOWED_EMAIL_DOMAIN`
- `APOLLO_API_KEY`, `HUBSPOT_PRIVATE_APP_TOKEN`
- `ANTHROPIC_API_KEY`, `FIRECRAWL_API_KEY`
- Optional: `SLACK_WEBHOOK_URL`, SMTP credentials, Google OAuth client.

### Scripts

- `npm run dev` – Next.js local development server.
- `npm run build` / `npm run start` – production build and launch.
- `npm run build:worker` / `npm run start:worker` – compile and run BullMQ workers.
- `npm run prisma:migrate` – deploy Prisma migrations.
- `npm run seed` – load demo data (idempotent).
- `npm run test` – run Vitest unit tests.
- `npm run type-check` / `npm run lint` – static analysis.

## Background Workers & Queues

- `ingestQueue` – pulls prospects from Apollo, stages contacts, schedules enrichment.
- `enrichQueue` – scrapes with Firecrawl, calls Claude for structured insights, populates Prisma.
- `updateQueue` – applies HubSpot field mappings on approval and records results.
- `notifyQueue` – Slack approval notifications and optional daily digest.

Concurrency defaults: 1 (ingest), 3 (enrich), 2 (update), 1 (notify). Global Redis connection reused across services.

## Scheduled Prospect Pull

`jobs/pull_and_enqueue.ts` enqueues a `daily-prospect-pull` respecting `DAILY_QUOTA`. DigitalOcean App Platform executes it Monday–Friday at 08:00 Europe/London via `app.yaml`.

## Deployment (DigitalOcean App Platform)

`app.yaml` provisions:

- Web service (Next.js) with health check on `/api/healthz`.
- Dedicated worker service running compiled queues.
- Scheduled job for daily Apollo ingest.
- Managed Postgres + Redis attachments with environment mapping and secret placeholders.

Adjust `<GITHUB_OWNER>/<REPO_NAME>` and deploy via the App Platform dashboard or CLI.

## Testing

Key unit tests live under `tests/` covering HubSpot mapping, API authorization edge cases, and queue helper smoke tests. Run `npm run test` before shipping.

## Observability & Notifications

- Events table acts as audit log for every workflow step.
- Slack webhook (optional) receives approval-ready blocks and digest summaries.
- Activity page exposes filters and CSV export for rapid reporting.

## Additional Notes

- Enrichment workflow defers to Claude classification decision tree and falls back to a friendly default P.S. line when no recent wins are detected.
- Settings page stores operational configuration in Prisma to allow live updates by admins without redeploying.
- Seeded admin: `operator@roboquill.io`. Adjust or remove in `prisma/seed.ts` for production.
