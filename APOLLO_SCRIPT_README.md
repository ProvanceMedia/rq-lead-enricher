# Apollo Enrichment Script

Interactive Python script to enrich HubSpot contacts using Apollo.io, Firecrawl, and Claude AI.

## What It Does

1. **Asks for an email address** (user input)
2. **Fetches contact from HubSpot** using that email
3. **Enriches with Apollo.io** - Gets title, LinkedIn, company info
4. **Scrapes company website** with Firecrawl
5. **Enriches with Claude AI**:
   - Extracts physical business address
   - Classifies company type (Online Retailer, Ad Agency, eComm Agency, etc.)
   - Generates personalized P.S. line for direct mail
6. **Presents enriched data** in a formatted summary
7. **Asks for approval** to update HubSpot
8. **Updates HubSpot** if approved

## Installation

```bash
# Install Python dependencies
pip install -r requirements.txt
```

## Configuration

Make sure your `.env` file contains these API keys:

```env
HUBSPOT_ACCESS_TOKEN=your_hubspot_token
APOLLO_API_KEY=your_apollo_key
FIRECRAWL_API_KEY=your_firecrawl_key
ANTHROPIC_API_KEY=your_anthropic_key

# Optional: Firecrawl Retry Configuration (defaults shown)
FIRECRAWL_RETRY_MAX_ATTEMPTS=5
FIRECRAWL_RETRY_INITIAL_DELAY=2000
FIRECRAWL_RETRY_MAX_DELAY=30000
FIRECRAWL_RETRY_BACKOFF_FACTOR=3

# Optional: Firecrawl Credit Monitoring
FIRECRAWL_CREDIT_WARNING_THRESHOLD=2000
FIRECRAWL_CREDIT_CRITICAL_THRESHOLD=500
```

### Firecrawl Configuration Options

The script includes intelligent retry logic and credit monitoring for Firecrawl:

**Retry Settings:**
- `FIRECRAWL_RETRY_MAX_ATTEMPTS` - Maximum number of retry attempts (default: 5)
- `FIRECRAWL_RETRY_INITIAL_DELAY` - Initial delay in milliseconds before first retry (default: 2000ms)
- `FIRECRAWL_RETRY_MAX_DELAY` - Maximum delay between retries in milliseconds (default: 30000ms)
- `FIRECRAWL_RETRY_BACKOFF_FACTOR` - Exponential backoff multiplier (default: 3)

**Credit Monitoring:**
- `FIRECRAWL_CREDIT_WARNING_THRESHOLD` - Show warning when credits drop below this number (default: 2000)
- `FIRECRAWL_CREDIT_CRITICAL_THRESHOLD` - Stop scraping when credits drop below this number (default: 500)

**How it works:**
- Automatically retries on rate limits (429) and server errors (5xx)
- Uses exponential backoff: 2s → 6s → 18s → 30s
- Respects `Retry-After` headers from the API
- Monitors remaining credits and warns when running low
- Adds 0.5s delay between multi-page scrapes to be respectful

## Usage

```bash
# Make the script executable (optional)
chmod +x apollo.py

# Run the script
python3 apollo.py

# Or if you made it executable
./apollo.py
```

## Example Interaction

```
Enter email address to enrich: john@example.com

Step 1: Fetching Contact from HubSpot
✓ Found contact: John Doe (john@example.com)
  Company: Example Corp
  Current Address: N/A

Step 2: Enriching with Apollo.io
✓ Apollo enrichment successful
  Title: Marketing Director
  LinkedIn: https://linkedin.com/in/johndoe
  Company: Example Corp
  Website: https://example.com

Step 3: Scraping Website with Firecrawl
✓ Scraped 15234 characters from website

Step 4: Enriching with Claude AI
ℹ Extracting address...
✓ Address extracted
ℹ Classifying company type...
✓ Company classified as: Online Retailer
  Reasoning: Company sells products directly to consumers via their website
ℹ Generating personalized P.S. line...
✓ P.S. line: P.S. Congrats on your recent Series B funding!

Enriched Data Summary
{
  "company": "Example Corp",
  "website": "https://example.com",
  "address": "Example Corp",
  "street_address_line_2": "123 Main Street",
  "city": "San Francisco",
  "country": "United States",
  "company_type": "Online Retailer",
  "custom_p_s__line": "P.S. Congrats on your recent Series B funding!"
}

Update HubSpot?
Update HubSpot contact with this data? (yes/no): yes

ℹ Updating contact 12345...
✓ HubSpot contact updated successfully!
```

## Features

- **Color-coded output** for better readability
- **Step-by-step progress** with clear headers
- **Error handling** with helpful messages
- **Environment variable validation** ensures all API keys are set
- **User approval** before making changes to HubSpot
- **Comprehensive enrichment** from multiple data sources

## HubSpot Fields Updated

The script updates these HubSpot contact fields:

- `address` - Company name
- `street_address_line_2` - Address line 2
- `street_address_line_3` - Address line 3
- `city` - City
- `country` - Country
- `company_type` - Company classification
- `custom_p_s__line` - Personalized P.S. line

## Troubleshooting

### Environment Variables Not Found
Make sure your `.env` file exists and contains all required keys. You can use `.env.example` as a template.

### Python Dependencies Missing
Run `pip install -r requirements.txt` to install all dependencies.

### API Errors
Check that your API keys are valid and have the necessary permissions:
- **HubSpot**: Needs read and write access to contacts
- **Apollo**: Needs person enrichment credits
- **Firecrawl**: Needs active subscription
- **Anthropic**: Needs Claude API access

## Security Note

This script uses environment variables for API keys. Never hardcode credentials in the script or commit `.env` files to version control.
