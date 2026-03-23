import { NextResponse } from 'next/server';
import { getRecentNotifications } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const notifications = getRecentNotifications(limit);
  return NextResponse.json(notifications);
}
