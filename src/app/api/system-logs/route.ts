import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { systemLogs } from '@/db/schema';
import { and, desc, gte, lte, ilike, eq, inArray } from 'drizzle-orm';
import { requirePermission } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.view', 'Sem permissão para ver logs');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);

  const level      = searchParams.get('level');       // debug|info|warn|error  (comma-sep)
  const category   = searchParams.get('category');    // gemini|webhook|...      (comma-sep)
  const search     = searchParams.get('search');      // free-text on message
  const from       = searchParams.get('from');        // ISO date string
  const to         = searchParams.get('to');          // ISO date string
  const limitParam = searchParams.get('limit');
  const limit      = Math.min(parseInt(limitParam ?? '200', 10), 1000);

  const conditions = [];

  if (level) {
    const levels = level.split(',').filter(Boolean) as ('debug' | 'info' | 'warn' | 'error')[];
    if (levels.length === 1) {
      conditions.push(eq(systemLogs.level, levels[0]));
    } else if (levels.length > 1) {
      conditions.push(inArray(systemLogs.level, levels));
    }
  }

  if (category) {
    const cats = category.split(',').filter(Boolean) as ('gemini' | 'webhook' | 'campaign' | 'crm' | 'grupos' | 'auth' | 'cron' | 'system')[];
    if (cats.length === 1) {
      conditions.push(eq(systemLogs.category, cats[0]));
    } else if (cats.length > 1) {
      conditions.push(inArray(systemLogs.category, cats));
    }
  }

  if (search) {
    conditions.push(ilike(systemLogs.message, `%${search}%`));
  }

  if (from) {
    conditions.push(gte(systemLogs.createdAt, new Date(from)));
  }

  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(systemLogs.createdAt, toDate));
  }

  const rows = await db
    .select()
    .from(systemLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(systemLogs.createdAt))
    .limit(limit);

  return NextResponse.json({ logs: rows, total: rows.length });
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.view', 'Sem permissão para deletar logs');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await db.delete(systemLogs).where(eq(systemLogs.id, id));

  return NextResponse.json({ ok: true });
}
