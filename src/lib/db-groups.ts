/**
 * WhatsApp Groups DB helper
 * Phase 16 - Group Management
 */

import { db } from '@/db';
import { whatsappGroups, type WhatsappGroup, type NewWhatsappGroup, chips, campaigns } from '@/db/schema';
import { eq, and, inArray, desc, lte, gte, isNull, sql } from 'drizzle-orm';
import type { Chip } from '@/db/schema';
import { createGroup, getInviteCode, fetchGroupParticipants, updateParticipant, type InviteCodeResponse } from '@/lib/evolution';

// Re-export types for consumers
export type { WhatsappGroup, NewWhatsappGroup };

// ─── CRUD Operations ───────────────────────────────────────────────────────────

/** Create a new group record */
export async function createGroupRecord(data: NewWhatsappGroup): Promise<WhatsappGroup> {
  const [group] = await db.insert(whatsappGroups).values(data).returning();
  return group;
}

/** Get group by UUID */
export async function getGroupById(id: string): Promise<WhatsappGroup | null> {
  const [group] = await db.select().from(whatsappGroups).where(eq(whatsappGroups.id, id)).limit(1);
  return group ?? null;
}

/** Get group by WhatsApp JID */
export async function getGroupByJid(groupJid: string): Promise<WhatsappGroup | null> {
  const [group] = await db.select().from(whatsappGroups).where(eq(whatsappGroups.groupJid, groupJid)).limit(1);
  return group ?? null;
}

/** Get all groups for a campaign */
export async function getGroupsByCampaign(campaignId: string): Promise<WhatsappGroup[]> {
  return db.select().from(whatsappGroups).where(eq(whatsappGroups.campaignId, campaignId));
}

/** Get active groups for a chip */
export async function getActiveGroupsForChip(chipId: string): Promise<WhatsappGroup[]> {
  return db.select().from(whatsappGroups).where(
    and(
      eq(whatsappGroups.chipId, chipId),
      eq(whatsappGroups.status, 'active')
    )
  );
}

/** Update group member count */
export async function updateGroupSize(
  id: string, 
  currentSize: number, 
  status?: 'active' | 'full' | 'archived'
): Promise<WhatsappGroup | null> {
  const autoStatus = status ?? (currentSize >= 1024 ? 'full' : 'active');
  const [group] = await db
    .update(whatsappGroups)
    .set({ 
      currentSize, 
      status: autoStatus, 
      updatedAt: new Date() 
    })
    .where(eq(whatsappGroups.id, id))
    .returning();
  return group ?? null;
}

/** Update group metadata (name, description, segmentTag) */
export async function updateGroupMeta(
  id: string,
  data: { name?: string; description?: string | null; segmentTag?: string | null },
): Promise<WhatsappGroup | null> {
  const [group] = await db
    .update(whatsappGroups)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(whatsappGroups.id, id))
    .returning();
  return group ?? null;
}

/** Update group invite link */
export async function updateGroupInvite(
  id: string, 
  inviteUrl: string, 
  inviteCode: string
): Promise<WhatsappGroup | null> {
  const [group] = await db
    .update(whatsappGroups)
    .set({ inviteUrl, inviteCode, updatedAt: new Date() })
    .where(eq(whatsappGroups.id, id))
    .returning();
  return group ?? null;
}

/** Set group status */
export async function setGroupStatus(
  id: string, 
  status: 'active' | 'full' | 'archived'
): Promise<WhatsappGroup | null> {
  const [group] = await db
    .update(whatsappGroups)
    .set({ status, updatedAt: new Date() })
    .where(eq(whatsappGroups.id, id))
    .returning();
  return group ?? null;
}

/** List groups with optional filters */
export async function listGroups(filters?: {
  status?: 'active' | 'full' | 'archived';
  campaignId?: string;
  chipId?: string;
}): Promise<WhatsappGroup[]> {
  const conditions = [];
  
  if (filters?.status) {
    conditions.push(eq(whatsappGroups.status, filters.status));
  }
  if (filters?.campaignId) {
    conditions.push(eq(whatsappGroups.campaignId, filters.campaignId));
  }
  if (filters?.chipId) {
    conditions.push(eq(whatsappGroups.chipId, filters.chipId));
  }
  
  if (conditions.length === 0) {
    return db.select().from(whatsappGroups).orderBy(desc(whatsappGroups.createdAt));
  }
  
  return db.select().from(whatsappGroups).where(and(...conditions)).orderBy(desc(whatsappGroups.createdAt));
}

// ─── Overflow Detection ────────────────────────────────────────────────────────

/** Get groups that are near or at capacity (default 90% threshold) */
export async function getGroupsNeedingOverflow(threshold = 0.9): Promise<WhatsappGroup[]> {
  // Find groups where currentSize >= maxSize * threshold
  const groups = await db.select().from(whatsappGroups).where(
    and(
      eq(whatsappGroups.status, 'active'),
      sql`${whatsappGroups.currentSize} >= ${whatsappGroups.maxSize} * ${threshold}`
    )
  );
  return groups;
}

/** Check if group needs overflow and return status */
export function checkGroupOverflowStatus(group: WhatsappGroup): {
  needsOverflow: boolean;
  capacityPercent: number;
  status: 'ok' | 'warning' | 'critical';
} {
  const capacityPercent = (group.currentSize / group.maxSize) * 100;
  
  if (capacityPercent >= 100) {
    return { needsOverflow: true, capacityPercent, status: 'critical' };
  }
  if (capacityPercent >= 90) {
    return { needsOverflow: true, capacityPercent, status: 'warning' };
  }
  return { needsOverflow: false, capacityPercent, status: 'ok' };
}

// ─── Overflow Group Creation ───────────────────────────────────────────────────

interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
}

/** Create an overflow group via Evolution API */
export async function createOverflowGroup(
  originalGroup: WhatsappGroup,
  chip: Chip,
  evolutionConfig: EvolutionConfig
): Promise<{ group: WhatsappGroup; invite: InviteCodeResponse } | null> {
  try {
    // Determine the next number for the overflow group
    // Only filter by campaign if it exists
    const conditions = [sql`${whatsappGroups.name} LIKE ${originalGroup.name + '%'}`];
    if (originalGroup.campaignId) {
      conditions.push(eq(whatsappGroups.campaignId, originalGroup.campaignId));
    }
    
    const existingGroups = await db.select().from(whatsappGroups).where(and(...conditions));
    
    // Count existing groups with same base name to determine suffix
    let maxSuffix = 0;
    const baseName = originalGroup.name.replace(/\s*\(\d+\)$/, '');
    for (const g of existingGroups) {
      const match = g.name.match(/\((\d+)\)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSuffix) maxSuffix = num;
      }
    }
    
    const newName = `${baseName} (${maxSuffix + 1})`;
    
    // Create group via Evolution API
    const instanceName = chip.instanceName || chip.name;
    const created = await createGroup(
      evolutionConfig.apiUrl,
      evolutionConfig.apiKey,
      instanceName,
      newName,
      originalGroup.description || undefined
    );
    
    if (!created.id) {
      console.error('[createOverflowGroup] No groupJid returned from Evolution API');
      return null;
    }
    
    // Get invite code
    const invite = await getInviteCode(
      evolutionConfig.apiUrl,
      evolutionConfig.apiKey,
      instanceName,
      created.id
    );
    
    // Store in database
    const newGroup = await createGroupRecord({
      groupJid: created.id,
      name: newName,
      description: originalGroup.description,
      inviteUrl: invite.inviteUrl,
      inviteCode: invite.inviteCode,
      campaignId: originalGroup.campaignId,
      segmentTag: originalGroup.segmentTag,
      chipId: chip.id,
      chipInstanceName: instanceName,
      currentSize: 0,
      maxSize: 1024,
      status: 'active',
      admins: originalGroup.admins,
    });
    
    console.log('[createOverflowGroup] Created overflow group:', newName, '→', created.id);
    
    return { group: newGroup, invite };
  } catch (error) {
    console.error('[createOverflowGroup] Error:', error);
    return null;
  }
}

// ─── Delete/Archive ────────────────────────────────────────────────────────────

/** Archive a group (soft delete) */
export async function archiveGroup(id: string): Promise<WhatsappGroup | null> {
  return setGroupStatus(id, 'archived');
}

/** Permanently delete a group record */
export async function deleteGroupRecord(id: string): Promise<boolean> {
  const deleted = await db.delete(whatsappGroups).where(eq(whatsappGroups.id, id)).returning();
  return deleted.length > 0;
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

/** Get group statistics */
export async function getGroupStats(): Promise<{
  total: number;
  active: number;
  full: number;
  archived: number;
  totalMembers: number;
  totalCapacity: number;
}> {
  const groups = await db.select().from(whatsappGroups);
  
  return {
    total: groups.length,
    active: groups.filter(g => g.status === 'active').length,
    full: groups.filter(g => g.status === 'full').length,
    archived: groups.filter(g => g.status === 'archived').length,
    totalMembers: groups.reduce((sum, g) => sum + g.currentSize, 0),
    totalCapacity: groups.reduce((sum, g) => sum + g.maxSize, 0),
  };
}

// ─── Segment-Group Mapping ─────────────────────────────────────────────────────

/** Get the best available group for a segment tag */
export async function getGroupForSegment(
  segmentTag: string
): Promise<WhatsappGroup | null> {
  // Find active groups for this segment that have capacity
  const groups = await db.select().from(whatsappGroups).where(
    and(
      eq(whatsappGroups.segmentTag, segmentTag),
      eq(whatsappGroups.status, 'active'),
      sql`${whatsappGroups.currentSize} < ${whatsappGroups.maxSize}`
    )
  ).orderBy(whatsappGroups.currentSize); // Get least full first
  
  return groups[0] ?? null;
}

/** Get or create a group for a segment */
export async function getOrCreateGroupForSegment(
  segmentTag: string,
  segmentName: string,
  chip: Chip,
  evolutionConfig: EvolutionConfig,
  adminPhones?: string[]
): Promise<{ group: WhatsappGroup; invite: InviteCodeResponse } | null> {
  // Try to get existing group
  const existing = await getGroupForSegment(segmentTag);
  
  if (existing && existing.inviteUrl) {
    return { 
      group: existing, 
      invite: { 
        inviteUrl: existing.inviteUrl, 
        inviteCode: existing.inviteCode || '' 
      } 
    };
  }
  
  // Need to create new group
  try {
    const groupName = segmentName || `Segmento ${segmentTag}`;
    const instanceName = chip.instanceName || chip.name;
    
    // Include admins in participant list if provided
    const participants = adminPhones && adminPhones.length > 0 
      ? adminPhones 
      : undefined;
    
    const created = await createGroup(
      evolutionConfig.apiUrl,
      evolutionConfig.apiKey,
      instanceName,
      groupName,
      `Grupo para leads do segmento: ${segmentTag}`,
      participants
    );
    
    if (!created.id) {
      console.error('[getOrCreateGroupForSegment] No groupJid returned');
      return null;
    }
    
    // Get invite code
    const invite = await getInviteCode(
      evolutionConfig.apiUrl,
      evolutionConfig.apiKey,
      instanceName,
      created.id
    );
    
    // Promote admins if they were added as participants
    if (adminPhones && adminPhones.length > 0) {
      try {
        await updateParticipant(
          evolutionConfig.apiUrl,
          evolutionConfig.apiKey,
          instanceName,
          created.id,
          'promote',
          adminPhones
        );
        console.log('[getOrCreateGroupForSegment] Promoted admins:', adminPhones);
      } catch (promoteErr) {
        console.warn('[getOrCreateGroupForSegment] Failed to promote admins:', promoteErr);
      }
    }
    
    // Store in database
    const newGroup = await createGroupRecord({
      groupJid: created.id,
      name: groupName,
      description: `Grupo para leads do segmento: ${segmentTag}`,
      inviteUrl: invite.inviteUrl,
      inviteCode: invite.inviteCode,
      segmentTag,
      chipId: chip.id,
      chipInstanceName: instanceName,
      currentSize: participants?.length || 0,
      maxSize: 1024,
      status: 'active',
      admins: adminPhones || [],
    });
    
    console.log('[getOrCreateGroupForSegment] Created group:', groupName, '→', created.id);
    
    return { group: newGroup, invite };
  } catch (error) {
    console.error('[getOrCreateGroupForSegment] Error:', error);
    return null;
  }
}