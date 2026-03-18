import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { whatsappGroups, campaigns } from '@/db/schema';
import { eq, and, sql, isNotNull } from 'drizzle-orm';
import { loadConfig } from '@/lib/db-config';
import { loadChips } from '@/lib/db-chips';
import { createOverflowGroup } from '@/lib/db-groups';
import { invalidateGroupCache } from '@/lib/group-link-cache';
import { sendGroupOverflowNotification } from '@/lib/notifications';
import { isLocalInternalRequest, readCronToken, resolveServerEnv } from '@/lib/server-env';
import type { Chip } from '@/db/schema';

const OVERFLOW_THRESHOLD = 0.9; // 90% capacity

/**
 * GET /api/cron/group-overflow
 *
 * Detects groups at or near capacity and creates overflow groups automatically.
 * Updates active campaigns to use new group links.
 *
 * Triggered every 5-10 minutes by the cron scheduler.
 * Auth: CRON_SECRET header OR loopback request.
 */
export async function GET(request: NextRequest) {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  const cronSecret = resolveServerEnv('CRON_SECRET');
  const requestToken = readCronToken(request);
  const authorizedBySecret = Boolean(cronSecret) && requestToken === cronSecret;
  const authorizedByLoopback = isLocalInternalRequest(request);

  if (!authorizedBySecret && !authorizedByLoopback) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await loadConfig();
  if (!config) {
    return NextResponse.json({ error: 'Sistema não configurado' }, { status: 400 });
  }

  const { evolutionApiUrl, evolutionApiKey } = config;
  if (!evolutionApiUrl || !evolutionApiKey) {
    return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 400 });
  }

  try {
    // Find groups at or above threshold capacity
    const groupsNeedingOverflow = await db
      .select()
      .from(whatsappGroups)
      .where(
        and(
          eq(whatsappGroups.status, 'active'),
          isNotNull(whatsappGroups.segmentTag),
          sql`${whatsappGroups.currentSize} >= ${whatsappGroups.maxSize} * ${OVERFLOW_THRESHOLD}`
        )
      );

    if (groupsNeedingOverflow.length === 0) {
      return NextResponse.json({ 
        message: 'No groups need overflow',
        checked: 0,
        created: 0 
      });
    }

    // Load chips for potential overflow creation
    const chips = await loadChips();

    const results: Array<{
      originalGroup: string;
      newGroup: string | null;
      success: boolean;
      error?: string;
    }> = [];

    for (const group of groupsNeedingOverflow) {
      try {
        // Find the chip for this group
        const chip = group.chipId 
          ? chips.find(c => c.id === group.chipId)
          : chips.find(c => c.assignedSegments?.includes(group.segmentTag ?? ''));

        if (!chip) {
          results.push({
            originalGroup: group.name,
            newGroup: null,
            success: false,
            error: 'No chip found for group',
          });
          continue;
        }

        // Create overflow group
        const result = await createOverflowGroup(group, chip, {
          apiUrl: evolutionApiUrl,
          apiKey: evolutionApiKey,
        });

        if (result) {
          // Invalidate cache for this segment
          if (group.segmentTag) {
            invalidateGroupCache(group.segmentTag);
          }

          // Add notification
          await sendGroupOverflowNotification({
            originalGroupName: group.name,
            newGroupName: result.group.name,
            segmentTag: group.segmentTag ?? '',
          });

          results.push({
            originalGroup: group.name,
            newGroup: result.group.name,
            success: true,
          });

          console.log(`[group-overflow] Created overflow group "${result.group.name}" for "${group.name}"`);
        } else {
          results.push({
            originalGroup: group.name,
            newGroup: null,
            success: false,
            error: 'Failed to create overflow group',
          });
        }
      } catch (err) {
        console.error(`[group-overflow] Error creating overflow for ${group.name}:`, err);
        results.push({
          originalGroup: group.name,
          newGroup: null,
          success: false,
          error: String(err),
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Processed ${groupsNeedingOverflow.length} groups`,
      checked: groupsNeedingOverflow.length,
      created: successful,
      failed,
      results,
    });
  } catch (error) {
    console.error('[group-overflow] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process group overflow' },
      { status: 500 }
    );
  }
}