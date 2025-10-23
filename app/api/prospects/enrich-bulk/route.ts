import { NextRequest, NextResponse } from 'next/server';
import { EnrichmentAgentService } from '@/lib/services/enrichment-agent-service';

export const dynamic = 'force-dynamic';

/**
 * Enrich multiple prospects
 * POST /api/prospects/enrich-bulk
 * Body: { prospectIds: string[], concurrency?: number }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prospectIds, concurrency } = body;

    if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json(
        { error: 'prospectIds array is required' },
        { status: 400 }
      );
    }

    const service = new EnrichmentAgentService();
    const result = await service.enrichProspectsBulk(
      prospectIds,
      concurrency || 3
    );

    return NextResponse.json({
      success: true,
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
      results: result.results,
    });
  } catch (error: any) {
    console.error('Error in bulk enrich endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enrich prospects' },
      { status: 500 }
    );
  }
}
