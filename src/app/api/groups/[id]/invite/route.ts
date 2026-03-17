import { NextRequest, NextResponse } from 'next/server';
import { getGroupById, updateGroupInvite } from '@/lib/db-groups';
import { getInviteCode, revokeInviteCode } from '@/lib/evolution';
import { loadConfig } from '@/lib/db-config';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/groups/[id]/invite
 * Get the current invite link for a group
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const group = await getGroupById(id);

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // If we already have an invite URL, return it
    if (group.inviteUrl) {
      return NextResponse.json({ 
        inviteUrl: group.inviteUrl, 
        inviteCode: group.inviteCode 
      });
    }

    // Otherwise, fetch from Evolution API
    if (!group.chipId || !group.chipInstanceName) {
      return NextResponse.json(
        { error: 'Group not linked to a chip' },
        { status: 400 }
      );
    }

    const config = await loadConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'Evolution API not configured' },
        { status: 500 }
      );
    }

    const invite = await getInviteCode(
      config.evolutionApiUrl,
      config.evolutionApiKey,
      group.chipInstanceName,
      group.groupJid
    );

    // Update stored invite
    await updateGroupInvite(id, invite.inviteUrl, invite.inviteCode);

    return NextResponse.json(invite);
  } catch (error) {
    console.error('[api/groups/[id]/invite] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get invite link' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/[id]/invite
 * Revoke and regenerate the invite link
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const group = await getGroupById(id);

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (!group.chipId || !group.chipInstanceName) {
      return NextResponse.json(
        { error: 'Group not linked to a chip' },
        { status: 400 }
      );
    }

    const config = await loadConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'Evolution API not configured' },
        { status: 500 }
      );
    }

    // Revoke and get new invite
    const invite = await revokeInviteCode(
      config.evolutionApiUrl,
      config.evolutionApiKey,
      group.chipInstanceName,
      group.groupJid
    );

    // Update stored invite
    await updateGroupInvite(id, invite.inviteUrl, invite.inviteCode);

    return NextResponse.json(invite);
  } catch (error) {
    console.error('[api/groups/[id]/invite] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke invite link' },
      { status: 500 }
    );
  }
}