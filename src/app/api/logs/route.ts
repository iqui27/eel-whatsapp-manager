import { NextRequest, NextResponse } from 'next/server';
import { loadLogs } from '@/lib/db-logs';
import { requirePermission } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.view', 'Seu operador não pode ver logs operacionais');
  if (auth.response) return auth.response;

  const logs = await loadLogs();
  return NextResponse.json(logs);
}
