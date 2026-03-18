/**
 * Segment Mapping Helper
 * Phase 21-01 - Segment-Group Mapping
 * 
 * Provides functions to map segments to chips and groups for campaign hydration.
 */

import { db } from '@/db';
import { segments, chips, whatsappGroups } from '@/db/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SegmentMapping {
  segmentId: string;
  segmentName: string;
  segmentTag: string | null;
  chip: {
    id: string;
    name: string;
    healthStatus: string;
    availableCapacity: { daily: number; hourly: number };
  } | null;
  group: {
    id: string;
    name: string;
    inviteUrl: string | null;
    capacity: { current: number; max: number; percent: number };
    status: string;
  } | null;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Get a single segment's mapping to chip and group
 */
export async function getSegmentGroupMapping(segmentTag: string): Promise<SegmentMapping | null> {
  // Find segment by tag
  const [segment] = await db
    .select()
    .from(segments)
    .where(eq(segments.segmentTag, segmentTag))
    .limit(1);

  if (!segment) {
    return null;
  }

  return buildSegmentMapping(segment);
}

/**
 * Get all segment mappings
 */
export async function getAllSegmentMappings(): Promise<SegmentMapping[]> {
  const allSegments = await db
    .select()
    .from(segments)
    .where(isNotNull(segments.segmentTag));

  const mappings: SegmentMapping[] = [];
  
  for (const segment of allSegments) {
    const mapping = await buildSegmentMapping(segment);
    if (mapping) {
      mappings.push(mapping);
    }
  }

  return mappings;
}

/**
 * Get mappings for segments that have tags
 */
export async function getSegmentMappingsWithTags(): Promise<SegmentMapping[]> {
  const segmentsWithTags = await db
    .select()
    .from(segments)
    .where(isNotNull(segments.segmentTag));

  const mappings: SegmentMapping[] = [];
  
  for (const segment of segmentsWithTags) {
    if (segment.segmentTag) {
      const mapping = await buildSegmentMapping(segment);
      if (mapping) {
        mappings.push(mapping);
      }
    }
  }

  return mappings;
}

/**
 * Get the best available chip for a segment tag
 */
export async function getChipForSegment(segmentTag: string): Promise<{
  id: string;
  name: string;
  healthStatus: string;
  availableCapacity: { daily: number; hourly: number };
} | null> {
  // Find chip that has this segment in assignedSegments
  const chip = await db
    .select()
    .from(chips)
    .where(
      and(
        eq(chips.enabled, true),
        sql`${chips.assignedSegments}::text[] @> ARRAY[${segmentTag}]::text[]`
      )
    )
    .limit(1);

  if (!chip[0]) {
    return null;
  }

  const c = chip[0];
  return {
    id: c.id,
    name: c.name,
    healthStatus: c.healthStatus,
    availableCapacity: {
      daily: Math.max(0, (c.dailyLimit ?? 200) - (c.messagesSentToday ?? 0)),
      hourly: Math.max(0, (c.hourlyLimit ?? 25) - (c.messagesSentThisHour ?? 0)),
    },
  };
}

/**
 * Get the best available group for a segment tag
 */
export async function getGroupForSegmentTag(segmentTag: string): Promise<{
  id: string;
  name: string;
  inviteUrl: string | null;
  capacity: { current: number; max: number; percent: number };
  status: string;
} | null> {
  // Find active group with capacity for this segment
  const group = await db
    .select()
    .from(whatsappGroups)
    .where(
      and(
        eq(whatsappGroups.segmentTag, segmentTag),
        eq(whatsappGroups.status, 'active'),
        sql`${whatsappGroups.currentSize} < ${whatsappGroups.maxSize}`
      )
    )
    .orderBy(whatsappGroups.currentSize) // Get least full first
    .limit(1);

  if (!group[0]) {
    return null;
  }

  const g = group[0];
  const capacityPercent = (g.currentSize / g.maxSize) * 100;

  return {
    id: g.id,
    name: g.name,
    inviteUrl: g.inviteUrl,
    capacity: {
      current: g.currentSize,
      max: g.maxSize,
      percent: Math.round(capacityPercent),
    },
    status: g.status,
  };
}

// ─── Private Helpers ─────────────────────────────────────────────────────────

async function buildSegmentMapping(segment: typeof segments.$inferSelect): Promise<SegmentMapping | null> {
  const mapping: SegmentMapping = {
    segmentId: segment.id,
    segmentName: segment.name,
    segmentTag: segment.segmentTag,
    chip: null,
    group: null,
  };

  // Find assigned chip
  if (segment.segmentTag) {
    mapping.chip = await getChipForSegment(segment.segmentTag);
    mapping.group = await getGroupForSegmentTag(segment.segmentTag);
  }

  return mapping;
}