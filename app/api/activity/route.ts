import { NextResponse } from 'next/server';
import { db, enrichments, prospects } from '@/db';
import { desc, or, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const recentEnrichments = await db
      .select({
        enrichment: enrichments,
        prospect: prospects,
      })
      .from(enrichments)
      .leftJoin(prospects, eq(enrichments.prospectId, prospects.id))
      .where(
        or(
          eq(enrichments.status, 'approved'),
          eq(enrichments.status, 'rejected'),
          eq(enrichments.status, 'failed')
        )
      )
      .orderBy(desc(enrichments.updatedAt))
      .limit(100);

    return NextResponse.json(recentEnrichments);
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
