import { NextRequest, NextResponse } from 'next/server';
import { db, prospects } from '@/db';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Get prospects by status
 * GET /api/prospects/pending?status=discovered
 * GET /api/prospects/pending?status=in_hubspot
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'discovered';

    // Validate status
    const validStatuses = ['discovered', 'in_hubspot', 'apollo_enriching', 'enriching'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const filteredProspects = await db
      .select()
      .from(prospects)
      .where(eq(prospects.enrichmentStatus, status as any))
      .orderBy(desc(prospects.createdAt));

    return NextResponse.json({
      success: true,
      count: filteredProspects.length,
      prospects: filteredProspects,
      status,
    });
  } catch (error: any) {
    console.error('Error fetching prospects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prospects' },
      { status: 500 }
    );
  }
}
