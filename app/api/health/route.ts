import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Health check endpoint to verify environment configuration
 * GET /api/health
 */

export async function GET() {
  const envChecks = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    APOLLO_API_KEY: !!process.env.APOLLO_API_KEY,
    HUBSPOT_ACCESS_TOKEN: !!process.env.HUBSPOT_ACCESS_TOKEN,
    FIRECRAWL_API_KEY: !!process.env.FIRECRAWL_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
  };

  const missingVars = Object.entries(envChecks)
    .filter(([key, value]) => !value && key !== 'NODE_ENV' && key !== 'NODE_TLS_REJECT_UNAUTHORIZED')
    .map(([key]) => key);

  const allConfigured = missingVars.length === 0;

  return NextResponse.json({
    status: allConfigured ? 'healthy' : 'misconfigured',
    environment: envChecks,
    missing: missingVars,
    message: allConfigured
      ? 'All environment variables are configured'
      : `Missing environment variables: ${missingVars.join(', ')}. Please set these in DigitalOcean App Platform console under Settings > App-Level Environment Variables.`,
  });
}
