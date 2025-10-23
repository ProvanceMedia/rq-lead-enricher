import { NextRequest, NextResponse } from 'next/server';
import { db, enrichments, enrichmentActivity, prospects } from '@/db';
import { eq } from 'drizzle-orm';
import { HubSpotService } from '@/lib/services/hubspot';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const enrichmentId = params.id;

    // Get enrichment with prospect
    const [enrichmentRecord] = await db
      .select({
        enrichment: enrichments,
        prospect: prospects,
      })
      .from(enrichments)
      .leftJoin(prospects, eq(enrichments.prospectId, prospects.id))
      .where(eq(enrichments.id, enrichmentId))
      .limit(1);

    if (!enrichmentRecord) {
      return NextResponse.json(
        { error: 'Enrichment not found' },
        { status: 404 }
      );
    }

    const { enrichment, prospect } = enrichmentRecord;

    if (!prospect?.hubspotContactId) {
      return NextResponse.json(
        { error: 'HubSpot contact ID not found' },
        { status: 400 }
      );
    }

    // Update HubSpot
    const hubspot = new HubSpotService();
    await hubspot.updateContact(prospect.hubspotContactId, {
      address: enrichment.companyNameForAddress || undefined,
      street_address_line_2: enrichment.streetAddressLine2 || undefined,
      street_address_line_3: enrichment.streetAddressLine3 || undefined,
      city: enrichment.city || undefined,
      zip: enrichment.zip || undefined,
      country: enrichment.country || undefined,
      company_type: enrichment.companyType || undefined,
      lifecyclestage: 'Enriched Prospect',
      outbound_cauldron_stage: '3. Address Procured',
      custom_p_s__line: enrichment.psLine || undefined,
    });

    // Update enrichment status
    await db
      .update(enrichments)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: 'user', // TODO: Add proper user authentication
        updatedAt: new Date(),
      })
      .where(eq(enrichments.id, enrichmentId));

    // Log activity
    await db.insert(enrichmentActivity).values({
      enrichmentId,
      prospectId: enrichment.prospectId,
      action: 'approved',
      details: { message: 'Enrichment approved and HubSpot updated' },
      performedBy: 'user',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error approving enrichment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve enrichment' },
      { status: 500 }
    );
  }
}
