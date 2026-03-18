/**
 * Campaign-Group Integration
 * Manages the relationship between campaigns and WhatsApp groups
 * 
 * Phase 21-02: Enhanced with segment-based group resolution
 */

import { db } from '@/db';
import { whatsappGroups, campaigns, chips, config, segments, voters } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getInviteCode, createGroup } from '@/lib/evolution';
import { 
  getGroupsByCampaign, 
  createGroupRecord,
  updateGroupInvite,
  getGroupForSegment,
  getOrCreateGroupForSegment,
  type WhatsappGroup 
} from '@/lib/db-groups';
import { getGroupForSegmentTag, getChipForSegment } from '@/lib/segment-mapping';
import { 
  buildCampaignRuntimeContext, 
  resolveCampaignTemplate,
  type CandidateProfileContext 
} from '@/lib/campaign-variables';
import { applyVariations, type VariationOptions } from '@/lib/message-variation';
import { loadConfig } from '@/lib/db-config';
import { getGroupLink, setGroupLink, clearCampaignCache } from '@/lib/group-link-cache';
import type { Voter } from '@/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Result of resolving campaign template variables
 */
export interface ResolvedTemplate {
  message: string;
  groupLink: string | null;
  groupId: string | null;
  chipId: string | null;
  segmentTag: string | null;
}

/**
 * Options for resolving campaign variables
 */
export interface ResolveCampaignVariablesOptions {
  variationOptions?: VariationOptions;
  candidateProfile?: CandidateProfileContext | null;
  scheduledAt?: Date | string | null;
}

// ─── Campaign Variable Resolution ──────────────────────────────────────────────

/**
 * Resolve all campaign template variables for a specific voter.
 * 
 * This function:
 * 1. Resolves {link_grupo} based on the segment tag (creates group if needed)
 * 2. Resolves voter-specific variables ({nome}, {bairro}, etc.)
 * 3. Resolves candidate variables ({candidato})
 * 4. Applies message variations (spintax, greetings, emojis)
 * 
 * @param template - The campaign template with variables
 * @param voter - The voter data for variable substitution
 * @param segmentTag - The segment tag to find the appropriate group
 * @param campaignId - The campaign ID for caching and tracking
 * @param options - Additional options for resolution
 */
export async function resolveCampaignVariables(
  template: string,
  voter: Voter,
  segmentTag: string | null,
  campaignId: string,
  options: ResolveCampaignVariablesOptions = {}
): Promise<ResolvedTemplate> {
  const result: ResolvedTemplate = {
    message: template,
    groupLink: null,
    groupId: null,
    chipId: null,
    segmentTag,
  };

  // 1. Resolve {link_grupo} if template contains it
  if (template.includes('{link_grupo}')) {
    const groupResult = await resolveGroupLinkForSegment(segmentTag, campaignId);
    if (groupResult) {
      result.groupLink = groupResult.inviteUrl;
      result.groupId = groupResult.groupId;
      result.chipId = groupResult.chipId;
    }
  }

  // 2. Build runtime context with all variables
  const context = buildCampaignRuntimeContext({
    candidateProfile: options.candidateProfile,
    voter,
    scheduledAt: options.scheduledAt,
    groupInviteLink: result.groupLink ?? '',
  });

  // 3. Resolve template variables
  let resolvedMessage = resolveCampaignTemplate(template, context);

  // 4. Apply variations if enabled
  if (options.variationOptions) {
    resolvedMessage = applyVariations(resolvedMessage, options.variationOptions);
  }

  result.message = resolvedMessage;
  return result;
}

/**
 * Resolve the group link for a segment tag.
 * Uses caching to avoid repeated database lookups.
 * 
 * @param segmentTag - The segment tag to find the group for
 * @param campaignId - The campaign ID for cache key
 * @returns Group info or null if no group available
 */
export async function resolveGroupLinkForSegment(
  segmentTag: string | null,
  campaignId: string
): Promise<{
  inviteUrl: string;
  groupId: string;
  chipId: string | null;
} | null> {
  if (!segmentTag) {
    return null;
  }

  // Check cache first
  const cached = getGroupLink(campaignId, segmentTag);
  if (cached) {
    return cached;
  }

  // Find existing group for segment
  const group = await getGroupForSegmentTag(segmentTag);
  
  if (group && group.inviteUrl) {
    const result = {
      inviteUrl: group.inviteUrl,
      groupId: group.id,
      chipId: null, // We'd need to join to get chipId
    };
    setGroupLink(campaignId, segmentTag, result);
    return result;
  }

  // No group found - need to create one
  // Get chip for segment first
  const chip = await getChipForSegment(segmentTag);
  
  if (!chip) {
    console.warn(`[resolveGroupLinkForSegment] No chip found for segment ${segmentTag}`);
    return null;
  }

  // Get config for Evolution API
  const [cfg] = await db.select().from(config).limit(1);
  if (!cfg) {
    console.error('[resolveGroupLinkForSegment] Config not found');
    return null;
  }

  // Get chip record
  const [chipRecord] = await db.select().from(chips).where(eq(chips.id, chip.id)).limit(1);
  if (!chipRecord) {
    console.error('[resolveGroupLinkForSegment] Chip record not found');
    return null;
  }

  // Create group for segment
  const groupResult = await getOrCreateGroupForSegment(
    segmentTag,
    `Grupo ${segmentTag}`,
    chipRecord,
    {
      apiUrl: cfg.evolutionApiUrl,
      apiKey: cfg.evolutionApiKey,
    }
  );

  if (groupResult && groupResult.invite.inviteUrl) {
    const result = {
      inviteUrl: groupResult.invite.inviteUrl,
      groupId: groupResult.group.id,
      chipId: chipRecord.id,
    };
    setGroupLink(campaignId, segmentTag, result);
    return result;
  }

  return null;
}

/**
 * Clear the group link cache for a campaign.
 * Call this when campaign completes or is cancelled.
 */
export function clearCampaignGroupCache(campaignId: string): void {
  clearCampaignCache(campaignId);
}

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