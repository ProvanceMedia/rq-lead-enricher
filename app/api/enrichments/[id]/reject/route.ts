import { NextRequest, NextResponse } from 'next/server';
import { db, enrichments, enrichmentActivity } from '@/db';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const enrichmentId = params.id;
    const body = await request.json();
    const reason = body.reason || 'No reason provided';

    // Get enrichment
    const [enrichment] = await db
      .select()
      .from(enrichments)
      .where(eq(enrichments.id, enrichmentId))
      .limit(1);

    if (!enrichment) {
      return NextResponse.json(
        { error: 'Enrichment not found' },
        { status: 404 }
      );
    }

    // Update enrichment status
    await db
      .update(enrichments)
      .set({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: 'user', // TODO: Add proper user authentication
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(enrichments.id, enrichmentId));

    // Log activity
    await db.insert(enrichmentActivity).values({
      enrichmentId,
      prospectId: enrichment.prospectId,
      action: 'rejected',
      details: { reason },
      performedBy: 'user',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error rejecting enrichment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject enrichment' },
      { status: 500 }
    );
  }
}
