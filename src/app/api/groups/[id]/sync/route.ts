import { NextRequest, NextResponse } from 'next/server';
import { syncGroupsFromEvolution } from '@/lib/group-sync';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/groups/[id]/sync
 * Sync a specific group from Evolution API
 * Note: This endpoint is for individual group sync.
 * For full chip sync, use the sync utility directly.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const group = await getGroupById(id);

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (!group.chipId) {
      return NextResponse.json(
        { error: 'Group not linked to a chip' },
        { status: 400 }
      );
    }

    // Sync all groups for this chip (we don't have single-group sync)
    const result = await syncGroupsFromEvolution(group.chipId, { updateInviteCodes: true });

    // Find our group in the results
    const syncedGroup = result.groups.find(g => g.groupJid === group.groupJid);

    return NextResponse.json({
      message: 'Group synced',
      result: syncedGroup,
      summary: {
        created: result.created,
        updated: result.updated,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('[api/groups/[id]/sync] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to sync group' },
      { status: 500 }
    );
  }
}

// Import needed function
import { getGroupById } from '@/lib/db-groups';