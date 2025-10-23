# RQ Lead Enricher

Intelligent lead discovery and enrichment engine powered by Claude Agent SDK. This system automatically discovers prospects from Apollo.io, enriches them with detailed address data using AI-powered research, and pushes enriched leads to HubSpot for direct mail campaigns.

## Features

- **Two-Phase Lead Engine**:
  - **Phase 1 - Discovery**: Apollo.io searches for prospects → Database → HubSpot as "New Lead"
  - **Phase 2 - Enrichment**: AI Agent researches addresses → Approval Queue → HubSpot Update
- **Claude Agent SDK**: Agentic AI with iterative tool usage and adaptive decision-making
- **Automated Address Research**: Uses Firecrawl web scraping and web search to find registered addresses
- **Company Classification**: AI-powered classification (Online Retailer, Ad Agency, Direct Mail Agency, etc.)
- **Personalized P.S. Lines**: Claude AI generates personalized lines from LinkedIn and company news
- **Human Approval Workflow**: Review all enrichments before pushing to HubSpot
- **Autopilot Mode**: Automated enrichment with configurable concurrency and batch size
- **Bulk Operations**: Enrich multiple prospects simultaneously
- **Activity Tracking**: Full audit trail of all enrichments

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **APIs**: Apollo.io, HubSpot, Firecrawl, Anthropic (Claude)
- **Hosting**: Digital Ocean App Platform

## Prerequisites

- Node.js 18+
- PostgreSQL database
- API Keys:
  - Apollo.io API key
  - HubSpot Access Token
  - Firecrawl API key
  - Anthropic API key

## Local Development

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create `.env` with your credentials:
   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/db?sslmode=require
   APOLLO_API_KEY=your_apollo_key
   HUBSPOT_ACCESS_TOKEN=your_hubspot_token
   FIRECRAWL_API_KEY=your_firecrawl_key
   ANTHROPIC_API_KEY=your_anthropic_key
   NODE_TLS_REJECT_UNAUTHORIZED=0
   ```

3. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Insert initial settings** (see Configuration section below)

5. **Run development server**:
   ```bash
   npm run dev
   ```

6. **Optional: Run workers locally** (in separate terminals):
   ```bash
   npm run discover    # Discovery worker
   npm run autopilot   # Autopilot enrichment worker
   ```

7. **Optional: Run standalone enrichment agent**:
   ```bash
   npm run enrich email@example.com
   ```

## Deployment to Digital Ocean App Platform

### Prerequisites

1. **Push code to GitHub**: Ensure your repository is pushed to `roboquill/rq-lead-enricher`
2. **Database**: You already have DigitalOcean PostgreSQL set up

### Deployment Steps

1. **Update App Spec** (already done):
   - `.do/app.yaml` is configured with your GitHub repo

2. **Create App in DigitalOcean**:
   - Go to App Platform → Create App
   - Select "Import from App Spec"
   - Upload `.do/app.yaml`

3. **Configure Environment Variables** in DO console:

   Set these as **SECRET** variables for all services (web, discovery-cron, autopilot-cron):
   ```
   DATABASE_URL = postgresql://user:password@host:port/db?sslmode=require
   APOLLO_API_KEY = your_apollo_key
   HUBSPOT_ACCESS_TOKEN = your_hubspot_token
   FIRECRAWL_API_KEY = your_firecrawl_key
   ANTHROPIC_API_KEY = your_anthropic_key
   ```

   Note: Use your DigitalOcean PostgreSQL connection string for DATABASE_URL

   Note: `NODE_ENV=production` and `NODE_TLS_REJECT_UNAUTHORIZED=0` are pre-configured

4. **Deploy**: Click Deploy in DigitalOcean console

5. **Insert Initial Settings** (REQUIRED after first deployment):

   Connect to your database and run:
   ```sql
   -- Prospect Discovery Settings
   INSERT INTO settings (key, value, description, created_at, updated_at)
   VALUES (
     'prospect_discovery',
     '{"enabled": true, "schedule": "0 9 * * *", "dailyLimit": 50, "searchCriteria": {"personTitles": ["Marketing Director", "CMO"], "contactEmailStatus": ["verified"], "organizationNumEmployeesRanges": ["11-50", "51-200"], "personLocations": ["United Kingdom"]}}',
     'Prospect discovery configuration',
     NOW(), NOW()
   );

   -- Autopilot Enrichment Settings
   INSERT INTO settings (key, value, description, created_at, updated_at)
   VALUES (
     'autopilot_enrichment',
     '{"enabled": true, "schedule": "0 * * * *", "maxPerRun": 10, "concurrency": 3}',
     'Autopilot enrichment configuration',
     NOW(), NOW()
   );
   ```

### Deployment Architecture

Your deployment will have **4 components**:

1. **Web Service** (`npm start`)
   - Next.js UI for queue management
   - API endpoints for manual operations
   - Port: 3000

2. **Discovery Worker** (`npm run discover`)
   - Searches Apollo.io for new prospects
   - Creates contacts in HubSpot as "New Lead"
   - Stores in database with `enrichmentStatus: pending`
   - Runs on schedule (default: daily at 9 AM)

3. **Autopilot Worker** (`npm run autopilot`)
   - Enriches pending prospects automatically
   - Runs enrichment agent to find addresses
   - Creates enrichment records for approval
   - Runs on schedule (default: hourly)

4. **Migration Job** (`npm run db:migrate`)
   - Runs before each deployment
   - Applies database schema changes

## Configuration

Settings are stored in the `settings` table and can be managed through the Settings UI (coming soon) or directly in the database.

### Prospect Discovery Settings

Controls how the discovery worker finds new prospects from Apollo.io:

```sql
UPDATE settings
SET value = '{
  "enabled": true,
  "schedule": "0 9 * * *",
  "dailyLimit": 50,
  "searchCriteria": {
    "personTitles": ["Marketing Director", "CMO", "Marketing Manager"],
    "contactEmailStatus": ["verified"],
    "organizationNumEmployeesRanges": ["11-50", "51-200", "201-500"],
    "personLocations": ["United Kingdom"],
    "q_organization_keyword_tags": ["ecommerce", "retail"]
  }
}'
WHERE key = 'prospect_discovery';
```

**Parameters**:
- `enabled`: Enable/disable discovery worker
- `schedule`: Cron expression (default: daily at 9 AM)
- `dailyLimit`: Max prospects to discover per run
- `searchCriteria`: Apollo.io search filters (see [Apollo API docs](https://docs.apollo.io))

### Autopilot Enrichment Settings

Controls automatic enrichment of pending prospects:

```sql
UPDATE settings
SET value = '{
  "enabled": true,
  "schedule": "0 * * * *",
  "maxPerRun": 10,
  "concurrency": 3
}'
WHERE key = 'autopilot_enrichment';
```

**Parameters**:
- `enabled`: Enable/disable autopilot
- `schedule`: Cron expression (default: hourly)
- `maxPerRun`: Max prospects to enrich per run
- `concurrency`: Number of concurrent enrichments

### Cron Schedules

Standard cron syntax examples:
- `0 9 * * *` = Daily at 9:00 AM
- `0 */2 * * *` = Every 2 hours
- `0 * * * *` = Every hour
- `*/30 * * * *` = Every 30 minutes

## Usage

### Queue Page

**Pending Enrichment Tab**:
- View all prospects discovered by Apollo that haven't been enriched yet
- Select individual or multiple prospects
- Click "Enrich" to run enrichment agent on selected prospects
- Bulk operations supported

**Awaiting Approval Tab**:
- Review completed enrichments before pushing to HubSpot
- View address, company classification, P.S. line
- Approve to update HubSpot contact with enriched data
- Reject to discard enrichment
- Approved enrichments automatically update HubSpot

### Activity Page
- View history of all enrichment activity
- See approved, rejected, and failed enrichments
- Full audit trail for compliance

### Settings Page
- Configure discovery settings (search criteria, daily limit)
- Configure autopilot settings (schedule, concurrency)
- Test integrations (Apollo, HubSpot, Firecrawl)

### Manual Enrichment

Run standalone enrichment agent:
```bash
npm run enrich email@example.com
```

Or use API endpoint:
```bash
curl -X POST http://localhost:3000/api/prospects/enrich \
  -H "Content-Type: application/json" \
  -d '{"prospectId": "prospect_id_here"}'
```

## HubSpot Field Mapping

When approved, enrichments update these HubSpot fields:

- `address` → Company name (for address)
- `street_address_line_2` → First line of physical address
- `street_address_line_3` → Second line of physical address
- `city` → City
- `zip` → Postal code
- `country` → Country
- `company_type` → Classification
- `lifecyclestage` → "Enriched Prospect"
- `outbound_cauldron_stage` → "3. Address Procured"
- `custom_p_s__line` → Personalized P.S. line

## Database Schema

- **prospects**: Contacts discovered from Apollo.io with enrichment tracking
  - `enrichmentStatus`: `pending` | `enriching` | `enriched` | `failed`
  - `lastEnrichmentAttempt`: Timestamp of last enrichment attempt
  - `enrichmentAttempts`: Number of enrichment attempts
  - `hubspotContactId`: Reference to HubSpot contact

- **enrichments**: Enrichment results awaiting approval
  - `status`: `awaiting_approval` | `approved` | `rejected` | `failed`
  - `addressFound`: Boolean flag for address discovery
  - `enrichedData`: JSON with address, classification, P.S. line
  - `agentOutput`: Full output from enrichment agent

- **enrichment_activity**: Audit trail of all enrichment actions
  - Tracks approvals, rejections, and status changes

- **settings**: JSON configuration storage
  - `prospect_discovery`: Discovery worker settings
  - `autopilot_enrichment`: Autopilot worker settings

## Troubleshooting

### Database Connection Issues

If you see SSL certificate errors:
```bash
# Already configured in package.json scripts
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run db:migrate
```

### Migrations Not Applying
```bash
npm run db:migrate
```

### Workers Not Running

**Discovery Worker**:
- Check worker logs in DigitalOcean console for `discovery-cron`
- Verify `prospect_discovery` settings in database (enabled: true)
- Check Apollo API key is set correctly

**Autopilot Worker**:
- Check worker logs in DigitalOcean console for `autopilot-cron`
- Verify `autopilot_enrichment` settings in database (enabled: true)
- Check all API keys (Anthropic, Firecrawl, HubSpot)
- Ensure there are pending prospects to enrich

### Enrichment Agent Failures

Common issues:
- **No address found**: Agent will note if no public address is available
- **API rate limits**: Reduce `concurrency` in autopilot settings
- **Timeout**: Increase agent timeout in `enrichment-agent-service.ts`

Check agent output in database:
```sql
SELECT agent_output FROM enrichments WHERE status = 'failed';
```

### API Rate Limits

If hitting rate limits:
- **Apollo**: Reduce `dailyLimit` in prospect_discovery settings
- **Anthropic**: Reduce `concurrency` and `maxPerRun` in autopilot settings
- **Firecrawl**: Add delays between scraping operations
- Check API quotas for each service

### Testing Locally

Test enrichment agent directly:
```bash
npm run enrich email@example.com
```

Test database connection:
```bash
npm run db:migrate
```

## License

Proprietary - RQ Lead Enricher
