import { NextRequest, NextResponse } from 'next/server';
import { db, prospects, enrichmentActivity } from '@/db';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prospectId = params.id;

    if (!prospectId) {
      return NextResponse.json(
        { error: 'Prospect ID is required' },
        { status: 400 }
      );
    }

    const [prospect] = await db
      .select()
      .from(prospects)
      .where(eq(prospects.id, prospectId))
      .limit(1);

    if (!prospect) {
      return NextResponse.json(
        { error: 'Prospect not found' },
        { status: 404 }
      );
    }

    const activity = await db
      .select()
      .from(enrichmentActivity)
      .where(eq(enrichmentActivity.prospectId, prospectId))
      .orderBy(desc(enrichmentActivity.createdAt));

    return NextResponse.json({
      success: true,
      prospect: {
        id: prospect.id,
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        email: prospect.email,
        companyName: prospect.companyName,
        enrichmentStatus: prospect.enrichmentStatus,
        createdAt: prospect.createdAt,
        updatedAt: prospect.updatedAt,
      },
      rawData: prospect.rawData ?? null,
      apolloEnrichedData: prospect.apolloEnrichedData ?? null,
      activity: activity.map(entry => ({
        id: entry.id,
        enrichmentId: entry.enrichmentId,
        action: entry.action,
        details: entry.details,
        performedBy: entry.performedBy,
        createdAt: entry.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching prospect logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load prospect logs' },
      { status: 500 }
    );
  }
}
