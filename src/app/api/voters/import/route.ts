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
import { syslogInfo, syslogWarn, syslogError } from '@/lib/system-logger';

// ─── Error helpers ────────────────────────────────────────────────────────────

/**
 * Extracts a concise, human-readable message from any error.
 *
 * Drizzle wraps raw DB errors as:
 *   Error: Failed query: insert into "voters" (…very long SQL…)
 * The actual PostgreSQL error lives in `error.cause`.
 * We surface the cause when present; otherwise truncate to 200 chars.
 */
function extractErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error).slice(0, 200);

  // Drizzle "Failed query:" wrapper — the real error is in cause
  if (error.message.startsWith('Failed query:') && error.cause instanceof Error) {
    return error.cause.message.slice(0, 300);
  }

  // Generic long message — truncate
  return error.message.slice(0, 300);
}

// ─── Name normalization ───────────────────────────────────────────────────────
// Converts ALL CAPS or all lowercase names to Title Case
// Handles Brazilian particles: de, da, do, das, dos, e
const PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'para', 'com']);

function toTitleCase(name: string): string {
  if (!name) return name;
  const words = name.trim().split(/\s+/);
  return words
    .map((word, i) => {
      const lower = word.toLowerCase();
      // Keep particles lowercase unless they're the first word
      if (i > 0 && PARTICLES.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function normalizeName(name: string): string {
  if (!name) return name;
  // Only normalize if the name appears to be ALL CAPS or all lowercase
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();
  if (trimmed === upper || trimmed === lower) {
    return toTitleCase(trimmed);
  }
  // Mixed case — already normalized, leave it
  return trimmed;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichmentOptions {
  tags?: string[];
  segmentMode?: 'none' | 'existing' | 'new';
  segmentId?: string;
  newSegmentName?: string;
  optInStatus?: 'pending' | 'active' | 'none';
  crmNotes?: string;
  customFields?: { key: string; value: string }[];
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

    syslogInfo('crm', `Import iniciado: ${rows.length} linha(s) recebida(s)`, {
      rowCount: rows.length,
      segmentMode: enrichment.segmentMode,
      segmentId: enrichment.segmentId,
    });

    // ── Scope check ──────────────────────────────────────────────────────────
    const scopedRows = rows.filter((row) =>
      isVoterInScope(auth.actor, {
        zone: row.zone ?? null,
        city: row.city ?? null,
        neighborhood: row.neighborhood ?? null,
      }),
    );
    if (scopedRows.length !== rows.length) {
      syslogWarn('crm', `Import bloqueado: ${rows.length - scopedRows.length} eleitor(es) fora do escopo`, {
        totalRows: rows.length,
        scopedRows: scopedRows.length,
      });
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
    // inArray with huge arrays causes stack overflow — chunk into batches of 5000
    const PHONE_CHUNK = 5_000;
    const existingPhones = new Set<string>();
    for (let i = 0; i < incomingPhones.length; i += PHONE_CHUNK) {
      const chunk = incomingPhones.slice(i, i + PHONE_CHUNK);
      const rows = await db
        .select({ phone: voters.phone })
        .from(voters)
        .where(inArray(voters.phone, chunk));
      for (const r of rows) existingPhones.add(r.phone);
    }

    // Also deduplicate within the batch itself (same phone appearing multiple times)
    const seenInBatch = new Set<string>();
    const newRows = normalizedScopedRows.filter((r) => {
      if (existingPhones.has(r.phone) || seenInBatch.has(r.phone)) return false;
      seenInBatch.add(r.phone);
      return true;
    });
    const duplicateCount = normalizedScopedRows.length - newRows.length;

    // ── Merge custom fields into crmNotes ────────────────────────────────────
    const customFieldsLine = (enrichment.customFields ?? [])
      .filter(f => f.key?.trim() && f.value?.trim())
      .map(f => `${f.key.trim()}: ${f.value.trim()}`)
      .join(' | ');
    const effectiveCrmNotes = [customFieldsLine, enrichment.crmNotes ?? '']
      .filter(Boolean)
      .join('\n')
      .trim() || undefined;

    // ── Apply enrichment to each row ─────────────────────────────────────────
    const globalTags = enrichment.tags ?? [];
    const enrichedRows: NewVoter[] = newRows.map((row) => {
      // Normalize name from ALL CAPS / all lowercase to Title Case
      if (row.name) row = { ...row, name: normalizeName(row.name) };
      // Merge tags (row CSV tags + global import tags)
      const rowTags = Array.isArray(row.tags) ? row.tags : [];
      const mergedTags = Array.from(new Set([...rowTags, ...globalTags]));

      // Opt-in status
      const optIn =
        enrichment.optInStatus && enrichment.optInStatus !== 'none'
          ? enrichment.optInStatus
          : (row.optInStatus ?? 'pending');

      // CRM notes — per-row custom fields (from column mapping) + global enrichment note
      const perRowCustom = (row as Record<string, unknown>).__customFields as string | undefined;
      const notes = [perRowCustom ?? '', row.crmNotes ?? '', effectiveCrmNotes ?? '']
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
    const insertedIds = inserted.map((v) => v.id);

    if (enrichment.segmentMode === 'existing' && enrichment.segmentId) {
      // Additive merge: include ALL voters from the import (new + already-existing duplicates)
      // by looking up IDs for every incoming phone in chunks.
      try {
        const seg = await getSegment(enrichment.segmentId);
        if (seg) {
          const allVoterIds = new Set<string>();
          for (let i = 0; i < incomingPhones.length; i += PHONE_CHUNK) {
            const chunk = incomingPhones.slice(i, i + PHONE_CHUNK);
            const found = await db
              .select({ id: voters.id })
              .from(voters)
              .where(inArray(voters.phone, chunk));
            for (const r of found) allVoterIds.add(r.id);
          }
          const existingIds = await getSegmentVoterIds(seg.id);
          const merged = Array.from(new Set([...existingIds, ...allVoterIds]));
          await setSegmentVoters(seg.id, merged);
          await updateSegmentCount(seg.id);
          segmentName = seg.name;
        }
      } catch (segErr) {
        syslogError('crm', 'Import: falha ao adicionar ao segmento existente', {
          segmentId: enrichment.segmentId,
          error: segErr instanceof Error ? segErr.message : String(segErr),
        });
      }
    }

    if (insertedIds.length > 0) {
      if (enrichment.segmentMode === 'new' && enrichment.newSegmentName?.trim()) {
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
          syslogError('crm', 'Import: falha ao criar novo segmento', {
            segmentName: enrichment.newSegmentName,
            error: segErr instanceof Error ? segErr.message : String(segErr),
          });
        }
      }
    }

    syslogInfo('crm', `Import concluído: ${inserted.length} inserido(s), ${duplicateCount} duplicado(s)`, {
      inserted: inserted.length,
      duplicates: duplicateCount,
      total: scopedRows.length,
      segmentName,
    });

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
    const errMsg = error instanceof Error ? error.message : String(error);
    const cleanMsg = extractErrorMessage(error);
    syslogError('crm', `Import falhou: ${cleanMsg}`, {
      error: errMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: cleanMsg }, { status: 500 });
  }
}
