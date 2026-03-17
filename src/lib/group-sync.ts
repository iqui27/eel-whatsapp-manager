/**
 * Group Sync Utility
 * Syncs WhatsApp groups from Evolution API to local database
 */

import { db } from '@/db';
import { chips, config } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { fetchAllGroups, getInviteCode, type GroupInfo } from '@/lib/evolution';
import { 
  createGroupRecord, 
  updateGroupSize, 
  updateGroupInvite, 
  getGroupByJid 
} from '@/lib/db-groups';

interface SyncResult {
  created: number;
  updated: number;
  errors: number;
  groups: Array<{
    groupJid: string;
    name: string;
    participants: number;
    action: 'created' | 'updated' | 'error';
  }>;
}

/**
 * Get Evolution API configuration from database
 */
export async function getEvolutionConfig(): Promise<{ apiUrl: string; apiKey: string } | null> {
  const [cfg] = await db.select().from(config).limit(1);
  if (!cfg) return null;
  return {
    apiUrl: cfg.evolutionApiUrl,
    apiKey: cfg.evolutionApiKey,
  };
}

/**
 * Sync all groups from Evolution API for a specific chip
 */
export async function syncGroupsFromEvolution(
  chipId: string,
  options?: { updateInviteCodes?: boolean }
): Promise<SyncResult> {
  const result: SyncResult = {
    created: 0,
    updated: 0,
    errors: 0,
    groups: [],
  };

  try {
    // Load chip
    const [chip] = await db.select().from(chips).where(eq(chips.id, chipId)).limit(1);
    if (!chip) {
      throw new Error(`Chip not found: ${chipId}`);
    }

    // Get Evolution config
    const evolutionConfig = await getEvolutionConfig();
    if (!evolutionConfig) {
      throw new Error('Evolution API not configured');
    }

    const instanceName = chip.instanceName || chip.name;

    // Fetch all groups from Evolution API
    const groups = await fetchAllGroups(
      evolutionConfig.apiUrl,
      evolutionConfig.apiKey,
      instanceName,
      true // getParticipants
    );

    console.log(`[syncGroupsFromEvolution] Found ${groups.length} groups for chip ${chip.name}`);

    // Process each group
    for (const group of groups) {
      try {
        const groupJid = group.id;
        const participantCount = group.participants?.length ?? 0;

        // Check if group exists in DB
        const existing = await getGroupByJid(groupJid);

        if (existing) {
          // Update existing group
          await updateGroupSize(existing.id, participantCount);
          
          // Optionally update invite code
          if (options?.updateInviteCodes) {
            try {
              const invite = await getInviteCode(
                evolutionConfig.apiUrl,
                evolutionConfig.apiKey,
                instanceName,
                groupJid
              );
              await updateGroupInvite(existing.id, invite.inviteUrl, invite.inviteCode);
            } catch (e) {
              console.warn(`[syncGroupsFromEvolution] Failed to get invite code for ${groupJid}:`, e);
            }
          }
          
          result.updated++;
          result.groups.push({
            groupJid,
            name: group.subject,
            participants: participantCount,
            action: 'updated',
          });
        } else {
          // Create new group record
          let inviteUrl: string | undefined;
          let inviteCode: string | undefined;
          
          try {
            const invite = await getInviteCode(
              evolutionConfig.apiUrl,
              evolutionConfig.apiKey,
              instanceName,
              groupJid
            );
            inviteUrl = invite.inviteUrl;
            inviteCode = invite.inviteCode;
          } catch (e) {
            console.warn(`[syncGroupsFromEvolution] Failed to get invite code for new group ${groupJid}:`, e);
          }

          await createGroupRecord({
            groupJid,
            name: group.subject,
            description: group.description,
            inviteUrl,
            inviteCode,
            chipId: chip.id,
            chipInstanceName: instanceName,
            currentSize: participantCount,
            maxSize: 1024,
            status: participantCount >= 1024 ? 'full' : 'active',
            admins: group.participants
              ?.filter(p => p.admin)
              .map(p => p.id.replace('@s.whatsapp.net', '')) ?? [],
          });

          result.created++;
          result.groups.push({
            groupJid,
            name: group.subject,
            participants: participantCount,
            action: 'created',
          });
        }
      } catch (e) {
        console.error(`[syncGroupsFromEvolution] Error processing group ${group.id}:`, e);
        result.errors++;
        result.groups.push({
          groupJid: group.id,
          name: group.subject,
          participants: 0,
          action: 'error',
        });
      }
    }

    console.log(`[syncGroupsFromEvolution] Sync complete: ${result.created} created, ${result.updated} updated, ${result.errors} errors`);
    return result;
  } catch (error) {
    console.error('[syncGroupsFromEvolution] Error:', error);
    result.errors++;
    return result;
  }
}

/**
 * Sync groups for all connected chips
 */
export async function syncAllGroups(): Promise<Record<string, SyncResult>> {
  const results: Record<string, SyncResult> = {};

  // Get all enabled chips
  const allChips = await db.select().from(chips).where(eq(chips.enabled, true));

  for (const chip of allChips) {
    console.log(`[syncAllGroups] Syncing groups for chip ${chip.name}`);
    results[chip.id] = await syncGroupsFromEvolution(chip.id);
  }

  return results;
}