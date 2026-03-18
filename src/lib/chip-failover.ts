/**
 * Chip Failover Orchestration
 * 
 * Handles the complete failover process when a chip enters
 * quarantined or banned state:
 * 1. Select fallback chip (prefer same-segment)
 * 2. Reassign pending messages
 * 3. Update active campaigns
 * 4. Send notifications
 * 5. Log failure event
 */
import { getChip, updateChipHealth, type Chip } from '@/lib/db-chips';
import { selectFallbackChip, addFailoverLog, type FailoverLog } from '@/lib/chip-router';
import { reassignMessagesFromChip, getMessagesByStatus } from '@/lib/db-message-queue';
import { sendFailoverNotification, sendNoFallbackAvailableNotification } from '@/lib/notifications';
import { db, campaigns } from '@/db';
import { eq, inArray } from 'drizzle-orm';

export interface FailoverResult {
  success: boolean;
  failedChipId: string;
  fallbackChipId: string | null;
  messagesReassigned: number;
  campaignsUpdated: number;
  error?: string;
}

/**
 * Handle chip failure - orchestrate complete failover process.
 * 
 * Called when a chip transitions to 'quarantined' or 'banned' status.
 * 
 * @param chipId - The failed chip ID
 * @param reason - Why the chip failed (for logging/notification)
 * @returns Failover result with counts and status
 */
export async function handleChipFailure(
  chipId: string,
  reason: string
): Promise<FailoverResult> {
  console.log(`[ChipFailover] Starting failover for chip ${chipId}: ${reason}`);
  
  const failedChip = await getChip(chipId);
  
  if (!failedChip) {
    return {
      success: false,
      failedChipId: chipId,
      fallbackChipId: null,
      messagesReassigned: 0,
      campaignsUpdated: 0,
      error: 'Chip não encontrado',
    };
  }
  
  // Step 1: Select fallback chip
  const fallbackResult = await selectFallbackChip(chipId);
  
  if (!fallbackResult.chip) {
    console.error(`[ChipFailover] No fallback chip available for ${failedChip.name}`);
    
    // Send notification about no fallback available
    await sendNoFallbackAvailableNotification({
      chipId: failedChip.id,
      chipName: failedChip.name,
      chipPhone: failedChip.phone,
      reason,
    });
    
    // Still reassign messages to queue (they'll be picked up by other chips later)
    const messagesReassigned = await reassignMessagesFromChip(chipId);
    
    return {
      success: false,
      failedChipId: chipId,
      fallbackChipId: null,
      messagesReassigned,
      campaignsUpdated: 0,
      error: 'Nenhum chip de fallback disponível',
    };
  }
  
  const fallbackChip = fallbackResult.chip;
  
  // Step 2: Reassign pending messages to fallback chip
  const messagesReassigned = await reassignMessagesToChip(chipId, fallbackChip.id);
  
  console.log(`[ChipFailover] Reassigned ${messagesReassigned} messages from ${failedChip.name} to ${fallbackChip.name}`);
  
  // Step 3: Update active campaigns using this chip
  const campaignsUpdated = await updateCampaignsChip(chipId, fallbackChip.id);
  
  console.log(`[ChipFailover] Updated ${campaignsUpdated} campaigns to use fallback chip`);
  
  // Step 4: Send notification
  await sendFailoverNotification({
    failedChipId: failedChip.id,
    failedChipName: failedChip.name,
    fallbackChipId: fallbackChip.id,
    fallbackChipName: fallbackChip.name,
    messagesReassigned,
    reason,
  });
  
  // Step 5: Log the failover event
  const failoverLog: FailoverLog = {
    timestamp: new Date(),
    failedChipId: failedChip.id,
    failedChipName: failedChip.name,
    fallbackChipId: fallbackChip.id,
    fallbackChipName: fallbackChip.name,
    segmentId: failedChip.assignedSegments?.[0],
    messagesReassigned,
    reason,
  };
  
  addFailoverLog(failoverLog);
  
  console.log(`[ChipFailover] Failover complete: ${failedChip.name} → ${fallbackChip.name}`);
  
  return {
    success: true,
    failedChipId: chipId,
    fallbackChipId: fallbackChip.id,
    messagesReassigned,
    campaignsUpdated,
  };
}

/**
 * Reassign messages from a failed chip to a specific fallback chip.
 * Preserves segment affinity by keeping messages assigned to a chip
 * that handles their segment.
 */
export async function reassignMessagesToChip(
  failedChipId: string,
  fallbackChipId: string
): Promise<number> {
  return await reassignMessagesFromChip(failedChipId, fallbackChipId, 'failover');
}

/**
 * Update campaigns that were using the failed chip to use the fallback.
 */
export async function updateCampaignsChip(
  failedChipId: string,
  fallbackChipId: string
): Promise<number> {
  // Find active campaigns using the failed chip
  const activeCampaigns = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.chipId, failedChipId));
  
  // Filter to only non-completed campaigns
  const toUpdate = activeCampaigns.filter(c => 
    !['completed', 'cancelled'].includes(c.status ?? '')
  );
  
  if (toUpdate.length === 0) return 0;
  
  // Update each campaign
  for (const campaign of toUpdate) {
    await db
      .update(campaigns)
      .set({
        chipId: fallbackChipId,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaign.id));
  }
  
  return toUpdate.length;
}

/**
 * Check if a chip should trigger failover.
 * Returns true if the chip is in a state that requires failover.
 */
export function shouldTriggerFailover(healthStatus: string): boolean {
  return ['quarantined', 'banned'].includes(healthStatus);
}

/**
 * Get recent failover events for display in the operations dashboard.
 */
export { getRecentFailoverLogs } from '@/lib/chip-router';