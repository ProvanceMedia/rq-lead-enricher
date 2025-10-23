import { NextResponse } from 'next/server';
import { db, prospects } from '@/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Get prospects pending enrichment
 * GET /api/prospects/pending
 */

export async function GET() {
  try {
    const pendingProspects = await db
      .select()
      .from(prospects)
      .where(eq(prospects.enrichmentStatus, 'pending'))
      .orderBy(prospects.createdAt);

    return NextResponse.json({
      success: true,
      count: pendingProspects.length,
      prospects: pendingProspects,
    });
  } catch (error: any) {
    console.error('Error fetching pending prospects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending prospects' },
      { status: 500 }
    );
  }
}
