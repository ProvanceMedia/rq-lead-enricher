import { NextResponse } from 'next/server';
import { db, enrichments, prospects } from '@/db';
import { eq, count, and, gte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Total prospects
    const [{ value: totalProspects }] = await db
      .select({ value: count() })
      .from(prospects);

    // Total enrichments by status
    const [{ value: awaitingApproval }] = await db
      .select({ value: count() })
      .from(enrichments)
      .where(eq(enrichments.status, 'awaiting_approval'));

    const [{ value: approved }] = await db
      .select({ value: count() })
      .from(enrichments)
      .where(eq(enrichments.status, 'approved'));

    const [{ value: rejected }] = await db
      .select({ value: count() })
      .from(enrichments)
      .where(eq(enrichments.status, 'rejected'));

    const [{ value: failed }] = await db
      .select({ value: count() })
      .from(enrichments)
      .where(eq(enrichments.status, 'failed'));

    const [{ value: inProgress }] = await db
      .select({ value: count() })
      .from(enrichments)
      .where(eq(enrichments.status, 'in_progress'));

    // Today's enrichments
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ value: todayEnrichments }] = await db
      .select({ value: count() })
      .from(enrichments)
      .where(gte(enrichments.createdAt, today));

    return NextResponse.json({
      totalProspects,
      awaitingApproval,
      approved,
      rejected,
      failed,
      inProgress,
      todayEnrichments,
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
