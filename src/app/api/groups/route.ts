import { NextRequest, NextResponse } from 'next/server';
import { listGroups, createGroupRecord } from '@/lib/db-groups';
import { loadChips } from '@/lib/db-chips';
import { loadConfig } from '@/lib/db-config';
import { createGroup, getInviteCode } from '@/lib/evolution';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/groups
 * List all groups with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'active' | 'full' | 'archived' | null;
    const campaignId = searchParams.get('campaignId');
    const chipId = searchParams.get('chipId');

    const groups = await listGroups({
      status: status ?? undefined,
      campaignId: campaignId ?? undefined,
      chipId: chipId ?? undefined,
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('[api/groups] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to list groups' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups
 * Create a new WhatsApp group via Evolution API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, chipId, participants, campaignId, admins } = body;

    if (!name || !chipId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, chipId' },
        { status: 400 }
      );
    }

    // Load config and chip
    const config = await loadConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'Evolution API not configured' },
        { status: 500 }
      );
    }

    const chips = await loadChips();
    const chip = chips.find(c => c.id === chipId);
    if (!chip) {
      return NextResponse.json(
        { error: 'Chip not found' },
        { status: 404 }
      );
    }

    const instanceName = chip.instanceName || chip.name;

    // Create group via Evolution API
    const created = await createGroup(
      config.evolutionApiUrl,
      config.evolutionApiKey,
      instanceName,
      name,
      description,
      participants
    );

    if (!created.id) {
      return NextResponse.json(
        { error: 'Failed to create group - no groupJid returned' },
        { status: 500 }
      );
    }

    // Get invite code
    let inviteUrl: string | undefined;
    let inviteCode: string | undefined;
    
    try {
      const invite = await getInviteCode(
        config.evolutionApiUrl,
        config.evolutionApiKey,
        instanceName,
        created.id
      );
      inviteUrl = invite.inviteUrl;
      inviteCode = invite.inviteCode;
    } catch (e) {
      console.warn('[api/groups] Failed to get invite code:', e);
    }

    // Store in database
    const group = await createGroupRecord({
      groupJid: created.id,
      name,
      description,
      inviteUrl,
      inviteCode,
      campaignId,
      chipId: chip.id,
      chipInstanceName: instanceName,
      currentSize: participants?.length ?? 0,
      maxSize: 1024,
      status: 'active',
      admins: admins ?? [],
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error('[api/groups] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}