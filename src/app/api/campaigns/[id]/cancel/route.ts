import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { updateCampaignStatus } from '@/lib/db-campaigns';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(req, 'campaigns.manage', 'Seu operador não pode cancelar campanhas');
  if (auth.response) return auth.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
  }

  try {
    const updated = await updateCampaignStatus(id, 'cancelled');
    return NextResponse.json({ status: updated.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 400 },
    );
  }
}
