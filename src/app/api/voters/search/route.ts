import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { db } from '@/db';
import { voters } from '@/db/schema';
import { or, ilike, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'campaigns.view', 'Sem permissão');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  if (q.length < 2) return NextResponse.json({ voters: [] });

  const limit = Math.min(Number.parseInt(searchParams.get('limit') ?? '10', 10), 20);
  const digits = q.replace(/\D/g, '');

  const conditions = or(
    ilike(voters.name, `%${q}%`),
    digits ? inArray(voters.phone, [digits, digits.length === 12 ? digits.slice(0,4)+'9'+digits.slice(4) : digits]) : undefined,
  );

  const rows = await db
    .select({ id: voters.id, name: voters.name, phone: voters.phone, zone: voters.zone, section: voters.section })
    .from(voters)
    .where(conditions)
    .limit(limit);

  return NextResponse.json({ voters: rows });
}
