/**
 * Campaign-Group Integration
 * Manages the relationship between campaigns and WhatsApp groups
 */

import { db } from '@/db';
import { whatsappGroups, campaigns, chips, config } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getInviteCode, createGroup } from '@/lib/evolution';
import { 
  getGroupsByCampaign, 
  createGroupRecord,
  updateGroupInvite,
  type WhatsappGroup 
} from '@/lib/db-groups';

/**
 * Get the active invite link for a campaign
 * Returns the invite link of the group with the most available capacity
 */
export async function getActiveInviteLink(campaignId: string): Promise<string | null> {
  const groups = await getGroupsByCampaign(campaignId);
  
  // Filter to active groups and sort by available capacity (ascending)
  const activeGroups = groups
    .filter(g => g.status === 'active')
    .sort((a, b) => a.currentSize - b.currentSize);
  
  if (activeGroups.length === 0) {
    return null;
  }
  
  // Return the invite URL of the group with most room
  const bestGroup = activeGroups[0];
  return bestGroup.inviteUrl ?? null;
}

/**
 * Get all active groups for a campaign with capacity info
 */
export async function getCampaignGroupsWithCapacity(campaignId: string): Promise<
  Array<WhatsappGroup & { availableCapacity: number; capacityPercent: number }>
> {
  const groups = await getGroupsByCampaign(campaignId);
  
  return groups
    .filter(g => g.status === 'active')
    .map(g => ({
      ...g,
      availableCapacity: g.maxSize - g.currentSize,
      capacityPercent: Math.round((g.currentSize / g.maxSize) * 100),
    }));
}

/**
 * Assign a group to a campaign
 */
export async function assignGroupToCampaign(
  groupId: string, 
  campaignId: string,
  segmentTag?: string
): Promise<WhatsappGroup | null> {
  const [updated] = await db
    .update(whatsappGroups)
    .set({ 
      campaignId, 
      segmentTag, 
      updatedAt: new Date() 
    })
    .where(eq(whatsappGroups.id, groupId))
    .returning();
  
  return updated ?? null;
}

/**
 * Find the best available group for a campaign message
 * Creates overflow group if all existing groups are full
 */
export async function findOrCreateGroupForCampaign(
  campaignId: string
): Promise<{ group: WhatsappGroup; inviteUrl: string } | null> {
  const groups = await getCampaignGroupsWithCapacity(campaignId);
  
  // Find a group with at least 10% capacity remaining
  const availableGroup = groups.find(g => g.capacityPercent < 90);
  
  if (availableGroup && availableGroup.inviteUrl) {
    return { 
      group: availableGroup, 
      inviteUrl: availableGroup.inviteUrl 
    };
  }
  
  // All groups are full or near capacity - need to create overflow
  if (groups.length > 0) {
    const lastGroup = groups[groups.length - 1];
    
    // Get the chip for this group
    if (!lastGroup.chipId) {
      console.error('[findOrCreateGroupForCampaign] Last group has no chipId');
      return null;
    }
    
    const [chip] = await db.select().from(chips).where(eq(chips.id, lastGroup.chipId)).limit(1);
    if (!chip) {
      console.error('[findOrCreateGroupForCampaign] Chip not found');
      return null;
    }
    
    const [cfg] = await db.select().from(config).limit(1);
    if (!cfg) {
      console.error('[findOrCreateGroupForCampaign] Config not found');
      return null;
    }
    
    // Create overflow group
    const instanceName = chip.instanceName || chip.name;
    const baseName = lastGroup.name.replace(/\s*\(\d+\)$/, '');
    const newName = `${baseName} (${groups.length + 1})`;
    
    try {
      const created = await createGroup(
        cfg.evolutionApiUrl,
        cfg.evolutionApiKey,
        instanceName,
        newName,
        lastGroup.description || undefined
      );
      
      if (!created.id) {
        console.error('[findOrCreateGroupForCampaign] No groupJid returned');
        return null;
      }
      
      const invite = await getInviteCode(
        cfg.evolutionApiUrl,
        cfg.evolutionApiKey,
        instanceName,
        created.id
      );
      
      const newGroup = await createGroupRecord({
        groupJid: created.id,
        name: newName,
        description: lastGroup.description,
        inviteUrl: invite.inviteUrl,
        inviteCode: invite.inviteCode,
        campaignId,
        segmentTag: lastGroup.segmentTag,
        chipId: chip.id,
        chipInstanceName: instanceName,
        currentSize: 0,
        maxSize: 1024,
        status: 'active',
        admins: lastGroup.admins,
      });
      
      console.log('[findOrCreateGroupForCampaign] Created overflow group:', newName);
      
      return { group: newGroup, inviteUrl: invite.inviteUrl };
    } catch (error) {
      console.error('[findOrCreateGroupForCampaign] Failed to create overflow:', error);
      return null;
    }
  }
  
  // No groups exist for this campaign
  return null;
}

/**
 * Resolve the {link_grupo} variable for campaign messages
 */
export async function resolveGroupInviteVariable(campaignId: string): Promise<string> {
  const result = await findOrCreateGroupForCampaign(campaignId);
  return result?.inviteUrl ?? '';
}

/**
 * Increment estimated group size after sending invite
 * This is a soft estimate - real count comes from webhook
 */
export async function incrementGroupSizeEstimate(groupId: string): Promise<void> {
  const [group] = await db.select().from(whatsappGroups).where(eq(whatsappGroups.id, groupId)).limit(1);
  
  if (group) {
    const newSize = group.currentSize + 1;
    const newStatus = newSize >= group.maxSize ? 'full' : group.status;
    
    await db
      .update(whatsappGroups)
      .set({ 
        currentSize: newSize, 
        status: newStatus, 
        updatedAt: new Date() 
      })
      .where(eq(whatsappGroups.id, groupId));
  }
}