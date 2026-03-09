import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { isVoterInScope } from '@/lib/authorization';
import { bulkInsertVoters } from '@/lib/db-voters';
import { db } from '@/db';
import { voters } from '@/db/schema';
import { inArray } from 'drizzle-orm';
import type { NewVoter } from '@/db/schema';

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'crm.edit', 'Seu operador não pode importar eleitores');
  if (auth.response) return auth.response;

  try {
    const body = await request.json() as { rows: NewVoter[] };
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows array is required' }, { status: 400 });
    }

    const scopedRows = rows.filter((row) => isVoterInScope(auth.actor, {
      zone: row.zone ?? null,
      city: row.city ?? null,
      neighborhood: row.neighborhood ?? null,
    }));
    if (scopedRows.length !== rows.length) {
      return NextResponse.json({ error: 'A importação contém eleitores fora do seu escopo regional' }, { status: 403 });
    }

    // Deduplicate: get phones that already exist in DB
    const incomingPhones = scopedRows.map(r => r.phone).filter(Boolean);
    const existing = await db
      .select({ phone: voters.phone })
      .from(voters)
      .where(inArray(voters.phone, incomingPhones));
    const existingPhones = new Set(existing.map(e => e.phone));

    // Split into new vs duplicate
    const newRows = scopedRows.filter(r => !existingPhones.has(r.phone));
    const duplicateCount = scopedRows.length - newRows.length;

    // Bulk insert new rows
    const inserted = await bulkInsertVoters(newRows);

    return NextResponse.json({
      imported: inserted.length,
      duplicates: duplicateCount,
      total: scopedRows.length,
    }, { status: 201 });

  } catch (error) {
    console.error('Import voters error:', error);
    return NextResponse.json({ error: 'Erro ao importar eleitores' }, { status: 500 });
  }
}
