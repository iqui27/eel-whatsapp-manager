import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { validateSession } from '@/lib/db-auth';
import { bulkInsertVoters } from '@/lib/db-voters';
import { db } from '@/db';
import { voters } from '@/db/schema';
import { inArray } from 'drizzle-orm';
import type { NewVoter } from '@/db/schema';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;
  if (!await validateSession(token)) return null;
  return await loadConfig();
}

export async function POST(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as { rows: NewVoter[] };
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows array is required' }, { status: 400 });
    }

    // Deduplicate: get phones that already exist in DB
    const incomingPhones = rows.map(r => r.phone).filter(Boolean);
    const existing = await db
      .select({ phone: voters.phone })
      .from(voters)
      .where(inArray(voters.phone, incomingPhones));
    const existingPhones = new Set(existing.map(e => e.phone));

    // Split into new vs duplicate
    const newRows = rows.filter(r => !existingPhones.has(r.phone));
    const duplicateCount = rows.length - newRows.length;

    // Bulk insert new rows
    const inserted = await bulkInsertVoters(newRows);

    return NextResponse.json({
      imported: inserted.length,
      duplicates: duplicateCount,
      total: rows.length,
    }, { status: 201 });

  } catch (error) {
    console.error('Import voters error:', error);
    return NextResponse.json({ error: 'Erro ao importar eleitores' }, { status: 500 });
  }
}
