/**
 * Segments data access — Drizzle / Supabase
 * Audience segmentation with voter association management.
 */
import { db } from '@/db';
import {
  segments, segmentVoters,
  type Segment, type NewSegment,
} from '@/db/schema';
import { eq, desc, count, isNull, and } from 'drizzle-orm';

export type { Segment, NewSegment };

/**
 * Validate segment tag format
 * - Must be lowercase
 * - Alphanumeric + underscore only
 * - No spaces
 */
export function validateSegmentTag(tag: string): { valid: boolean; error?: string } {
  if (!tag) {
    return { valid: true }; // Empty is valid (nullable field)
  }
  
  // Check length
  if (tag.length < 2) {
    return { valid: false, error: 'Tag deve ter pelo menos 2 caracteres' };
  }
  if (tag.length > 50) {
    return { valid: false, error: 'Tag deve ter no maximo 50 caracteres' };
  }
  
  // Check format: lowercase, alphanumeric, underscore only
  const validPattern = /^[a-z][a-z0-9_]*$/;
  if (!validPattern.test(tag)) {
    return { valid: false, error: 'Tag deve comecar com letra minuscula e conter apenas letras minusculas, numeros e underscore' };
  }
  
  return { valid: true };
}

/**
 * Generate a slugified tag from a segment name
 * - Lowercase
 * - Replace spaces and special chars with underscore
 * - Remove consecutive underscores
 */
export function generateTagFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '_')     // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, '')          // Trim underscores
    .replace(/_+/g, '_')              // Collapse consecutive underscores
    .substring(0, 50)                 // Limit length
    || 'segmento';                    // Fallback if empty
}

export async function loadSegments(): Promise<Segment[]> {
  return db.select().from(segments).orderBy(desc(segments.createdAt));
}

export async function getSegment(id: string): Promise<Segment | undefined> {
  const rows = await db.select().from(segments).where(eq(segments.id, id)).limit(1);
  return rows[0];
}

export async function getSegmentByTag(segmentTag: string): Promise<Segment | undefined> {
  const rows = await db.select().from(segments).where(eq(segments.segmentTag, segmentTag)).limit(1);
  return rows[0];
}

export async function getSegmentsWithTags(): Promise<Segment[]> {
  return db.select().from(segments)
    .where(isNull(segments.segmentTag))
    .orderBy(desc(segments.createdAt));
}

export async function addSegment(
  data: Omit<NewSegment, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Segment> {
  // Validate tag if provided
  if (data.segmentTag) {
    const validation = validateSegmentTag(data.segmentTag);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }
  
  const rows = await db.insert(segments).values(data).returning();
  return rows[0];
}

export async function updateSegment(
  id: string,
  data: Partial<Omit<NewSegment, 'id' | 'createdAt'>>,
): Promise<Segment | undefined> {
  // Validate tag if provided
  if (data.segmentTag !== undefined && data.segmentTag !== null) {
    const validation = validateSegmentTag(data.segmentTag);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }
  
  const rows = await db
    .update(segments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(segments.id, id))
    .returning();
  return rows[0];
}

export async function deleteSegment(id: string): Promise<void> {
  // segmentVoters cascade-deletes automatically via FK
  await db.delete(segments).where(eq(segments.id, id));
}

export async function getSegmentVoterIds(segmentId: string): Promise<string[]> {
  const rows = await db
    .select({ voterId: segmentVoters.voterId })
    .from(segmentVoters)
    .where(eq(segmentVoters.segmentId, segmentId));
  return rows.map((r) => r.voterId);
}

export async function setSegmentVoters(
  segmentId: string,
  voterIds: string[],
): Promise<void> {
  // segment_voters has 2 columns → max safe params = 65534/2 = 32767, use 5000
  const CHUNK = 5_000;
  await db.transaction(async (tx) => {
    await tx.delete(segmentVoters).where(eq(segmentVoters.segmentId, segmentId));
    for (let i = 0; i < voterIds.length; i += CHUNK) {
      const chunk = voterIds.slice(i, i + CHUNK);
      await tx.insert(segmentVoters).values(
        chunk.map((voterId) => ({ segmentId, voterId })),
      );
    }
  });
}

export async function updateSegmentCount(segmentId: string): Promise<void> {
  const [result] = await db
    .select({ total: count() })
    .from(segmentVoters)
    .where(eq(segmentVoters.segmentId, segmentId));

  await db
    .update(segments)
    .set({ audienceCount: result?.total ?? 0, updatedAt: new Date() })
    .where(eq(segments.id, segmentId));
}

function segmentMatchesSingleVoter(segment: Segment, voterId: string) {
  try {
    const parsed = JSON.parse(segment.filters) as {
      filters?: Array<{ key?: string; value?: unknown }>;
    };

    return parsed.filters?.some(
      (filter) => filter.key === '__singleVoterId' && filter.value === voterId,
    ) ?? false;
  } catch {
    return false;
  }
}

export async function ensureSingleVoterSegment(
  voterId: string,
  voterName?: string | null,
): Promise<Segment> {
  const normalizedName = voterName?.trim() || 'Eleitor';
  const segmentName = `Eleitor individual • ${normalizedName}`;
  const filters = JSON.stringify({
    operator: 'AND',
    source: 'crm',
    mode: 'single_voter',
    filters: [
      {
        key: '__singleVoterId',
        value: voterId,
      },
    ],
  });

  const existing = (await loadSegments()).find((segment) => segmentMatchesSingleVoter(segment, voterId));

  let segment = existing;
  if (!segment) {
    segment = await addSegment({
      name: segmentName,
      filters,
      audienceCount: 0,
    });
  } else if (segment.name !== segmentName || segment.filters !== filters) {
    segment = (await updateSegment(segment.id, {
      name: segmentName,
      filters,
    })) ?? segment;
  }

  await setSegmentVoters(segment.id, [voterId]);
  await updateSegmentCount(segment.id);

  return (await getSegment(segment.id)) ?? segment;
}
