import { NextRequest, NextResponse } from 'next/server';
import { processApolloMatches } from '@/lib/services/apollo-webhook-processor';

export const dynamic = 'force-dynamic';

/**
 * Webhook endpoint for Apollo.io bulk enrichment callbacks
 *
 * Apollo sends enriched prospect data to this endpoint after processing
 * We then update our database and create HubSpot contacts
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('Apollo enrichment webhook received:', JSON.stringify(payload, null, 2));

    const matches = payload.matches || [];

    if (matches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No matches to process',
        processed: 0,
        created: 0,
        failed: 0,
      });
    }

    // Process matches using shared logic
    const result = await processApolloMatches(matches);

    console.log(`Apollo webhook processing complete: ${result.processed} processed, ${result.created} created in HubSpot, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Apollo webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', message: error.message },
      { status: 500 }
    );
  }
}
