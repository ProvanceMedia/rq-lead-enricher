import { NextResponse } from 'next/server';
import { db, enrichments, prospects } from '@/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const awaitingEnrichments = await db
      .select({
        enrichment: enrichments,
        prospect: prospects,
      })
      .from(enrichments)
      .leftJoin(prospects, eq(enrichments.prospectId, prospects.id))
      .where(eq(enrichments.status, 'awaiting_approval'))
      .orderBy(enrichments.createdAt);

    return NextResponse.json(awaitingEnrichments);
  } catch (error: any) {
    console.error('Error fetching awaiting enrichments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrichments' },
      { status: 500 }
    );
  }
}
