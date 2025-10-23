import { NextRequest, NextResponse } from 'next/server';
import { EnrichmentAgentService } from '@/lib/services/enrichment-agent-service';

/**
 * Enrich a single prospect
 * POST /api/prospects/enrich
 * Body: { prospectId: string }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prospectId } = body;

    if (!prospectId) {
      return NextResponse.json(
        { error: 'prospectId is required' },
        { status: 400 }
      );
    }

    const service = new EnrichmentAgentService();
    const result = await service.enrichProspect(prospectId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Enrichment failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      enrichmentId: result.enrichmentId,
      data: result.data,
    });
  } catch (error: any) {
    console.error('Error in enrich endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enrich prospect' },
      { status: 500 }
    );
  }
}
