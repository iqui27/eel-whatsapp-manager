import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/config';
import { loadLogs } from '@/lib/logs';
import { validateSession } from '@/lib/auth';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;
  if (!await validateSession(token)) {
    return null;
  }
  return await loadConfig();
}

export async function GET(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = await loadLogs();
  return NextResponse.json(logs);
}
