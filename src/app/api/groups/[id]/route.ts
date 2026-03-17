import { NextRequest, NextResponse } from 'next/server';
import { 
  getGroupById, 
  updateGroupSize, 
  updateGroupInvite, 
  setGroupStatus,
  deleteGroupRecord 
} from '@/lib/db-groups';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/groups/[id]
 * Get a specific group by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const group = await getGroupById(id);

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error('[api/groups/[id]] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get group' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/groups/[id]
 * Update group metadata
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status, currentSize, inviteUrl, inviteCode } = body;

    const existing = await getGroupById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Handle different update types
    if (status) {
      const updated = await setGroupStatus(id, status);
      return NextResponse.json({ group: updated });
    }

    if (currentSize !== undefined) {
      const updated = await updateGroupSize(id, currentSize);
      return NextResponse.json({ group: updated });
    }

    if (inviteUrl && inviteCode) {
      const updated = await updateGroupInvite(id, inviteUrl, inviteCode);
      return NextResponse.json({ group: updated });
    }

    // General metadata update
    if (name || description) {
      // For general updates, we'd need a more flexible update function
      // For now, just return the existing group
      return NextResponse.json({ group: existing, message: 'No updates applied' });
    }

    return NextResponse.json({ group: existing });
  } catch (error) {
    console.error('[api/groups/[id]] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/[id]
 * Archive or delete a group
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const permanent = searchParams.get('permanent') === 'true';

    const existing = await getGroupById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (permanent) {
      await deleteGroupRecord(id);
      return NextResponse.json({ message: 'Group deleted permanently' });
    } else {
      await setGroupStatus(id, 'archived');
      return NextResponse.json({ message: 'Group archived' });
    }
  } catch (error) {
    console.error('[api/groups/[id]] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}