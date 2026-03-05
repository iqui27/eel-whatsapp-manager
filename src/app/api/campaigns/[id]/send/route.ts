import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateSession } from '@/lib/db-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = req.cookies.get('auth')?.value;
  if (!await validateSession(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });

  try {
    // Fetch campaign to confirm it exists
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Set status to sending + initialize mock stats
    await db
      .update(campaigns)
      .set({
        status: 'sending',
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        totalReplied: 0,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id));

    // Simulate async send — after 3 seconds update to 'sent' with fake stats
    const audienceSize = 150; // default mock audience
    setTimeout(async () => {
      try {
        const delivered = Math.floor(audienceSize * 0.88);
        const failed = Math.floor(audienceSize * 0.05);
        const replied = Math.floor(delivered * 0.12);
        await db
          .update(campaigns)
          .set({
            status: 'sent',
            totalSent: audienceSize,
            totalDelivered: delivered,
            totalFailed: failed,
            totalReplied: replied,
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, id));
      } catch {
        // background task — swallow error
      }
    }, 3000);

    return NextResponse.json({ campaignId: id, status: 'sending' });
  } catch (err) {
    console.error('[send campaign]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
