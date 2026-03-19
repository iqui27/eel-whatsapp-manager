import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { isVoterInScope } from '@/lib/authorization';
import { bulkInsertVoters } from '@/lib/db-voters';
import { db } from '@/db';
import { voters } from '@/db/schema';
import { inArray } from 'drizzle-orm';
import type { NewVoter } from '@/db/schema';
import {
  addSegment,
  getSegment,
  getSegmentVoterIds,
  setSegmentVoters,
  updateSegmentCount,
  generateTagFromName,
} from '@/lib/db-segments';
import { normalizePhone } from '@/lib/phone';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichmentOptions {
  tags?: string[];
  segmentMode?: 'none' | 'existing' | 'new';
  segmentId?: string;
  newSegmentName?: string;
  optInStatus?: 'pending' | 'active' | 'none';
  crmNotes?: string;
}

interface ImportBody {
  rows: NewVoter[];
  enrichment?: EnrichmentOptions;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'crm.edit', 'Seu operador não pode importar eleitores');
  if (auth.response) return auth.response;

  try {
    const body = await request.json() as ImportBody;
    const { rows, enrichment = {} } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows array is required' }, { status: 400 });
    }

    // ── Scope check ──────────────────────────────────────────────────────────
    const scopedRows = rows.filter((row) =>
      isVoterInScope(auth.actor, {
        zone: row.zone ?? null,
        city: row.city ?? null,
        neighborhood: row.neighborhood ?? null,
      }),
    );
    if (scopedRows.length !== rows.length) {
      return NextResponse.json(
        { error: 'A importação contém eleitores fora do seu escopo regional' },
        { status: 403 },
      );
    }

    // ── Deduplicate — normalize phones BEFORE comparing with DB ──────────────
    // The DB stores E.164-normalized phones (e.g. "11999999999").
    // The CSV may have "(11) 99999-9999" or "+55 11 99999-9999", etc.
    // Without normalization, the same person re-imports as a new record every time.
    const normalizedScopedRows = scopedRows.map((r) => ({
      ...r,
      phone: normalizePhone(r.phone),
    }));

    const incomingPhones = normalizedScopedRows.map((r) => r.phone).filter(Boolean);
    const existingRecords = await db
      .select({ phone: voters.phone })
      .from(voters)
      .where(inArray(voters.phone, incomingPhones));
    const existingPhones = new Set(existingRecords.map((e) => e.phone));

    // Also deduplicate within the batch itself (same phone appearing multiple times)
    const seenInBatch = new Set<string>();
    const newRows = normalizedScopedRows.filter((r) => {
      if (existingPhones.has(r.phone) || seenInBatch.has(r.phone)) return false;
      seenInBatch.add(r.phone);
      return true;
    });
    const duplicateCount = normalizedScopedRows.length - newRows.length;

    // ── Apply enrichment to each row ─────────────────────────────────────────
    const globalTags = enrichment.tags ?? [];
    const enrichedRows: NewVoter[] = newRows.map((row) => {
      // Merge tags (row CSV tags + global import tags)
      const rowTags = Array.isArray(row.tags) ? row.tags : [];
      const mergedTags = Array.from(new Set([...rowTags, ...globalTags]));

      // Opt-in status
      const optIn =
        enrichment.optInStatus && enrichment.optInStatus !== 'none'
          ? enrichment.optInStatus
          : (row.optInStatus ?? 'pending');

      // CRM notes — append enrichment note below row note
      const notes = [row.crmNotes ?? '', enrichment.crmNotes ?? '']
        .filter(Boolean)
        .join('\n')
        .trim() || null;

      return {
        ...row,
        tags: mergedTags,
        optInStatus: optIn,
        crmNotes: notes,
      };
    });

    // ── Bulk insert ───────────────────────────────────────────────────────────
    const inserted = await bulkInsertVoters(enrichedRows);

    // ── Segment assignment ────────────────────────────────────────────────────
    let segmentName: string | undefined;

    if (inserted.length > 0) {
      const insertedIds = inserted.map((v) => v.id);

      if (enrichment.segmentMode === 'existing' && enrichment.segmentId) {
        // Additive merge into existing segment
        try {
          const seg = await getSegment(enrichment.segmentId);
          if (seg) {
            const existingIds = await getSegmentVoterIds(seg.id);
            const merged = Array.from(new Set([...existingIds, ...insertedIds]));
            await setSegmentVoters(seg.id, merged);
            await updateSegmentCount(seg.id);
            segmentName = seg.name;
          }
        } catch (segErr) {
          console.error('[import] Failed to add to existing segment:', segErr);
        }

      } else if (enrichment.segmentMode === 'new' && enrichment.newSegmentName?.trim()) {
        // Create new segment + assign all inserted voters
        try {
          const name = enrichment.newSegmentName.trim();
          const segmentTag = generateTagFromName(name);
          const newSeg = await addSegment({
            name,
            segmentTag,
            filters: JSON.stringify({
              operator: 'AND',
              source: 'import',
              mode: 'import_batch',
              filters: [],
            }),
            audienceCount: 0,
          });
          await setSegmentVoters(newSeg.id, insertedIds);
          await updateSegmentCount(newSeg.id);
          segmentName = newSeg.name;
        } catch (segErr) {
          console.error('[import] Failed to create segment:', segErr);
        }
      }
    }

    return NextResponse.json(
      {
        imported: inserted.length,
        duplicates: duplicateCount,
        total: scopedRows.length,
        ...(segmentName ? { segmentName } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Import voters error:', error);
    return NextResponse.json({ error: 'Erro ao importar eleitores' }, { status: 500 });
  }
}
