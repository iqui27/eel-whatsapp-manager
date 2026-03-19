import { NextRequest, NextResponse } from 'next/server';
import { getGroupById } from '@/lib/db-groups';
import { requirePermission } from '@/lib/api-auth';
import { db } from '@/db';
import { groupMessages } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/groups/[id]/messages
 * Return stored group message history (latest 200).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission(request, 'campaigns.view', 'Sem permissão');
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const group = await getGroupById(id);
    if (!group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    const messages = await db
      .select()
      .from(groupMessages)
      .where(eq(groupMessages.groupId, id))
      .orderBy(desc(groupMessages.createdAt))
      .limit(200);

    // Return in ascending order for chat display
    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('[api/groups/[id]/messages] GET error:', error);
    return NextResponse.json({ error: 'Erro ao carregar mensagens' }, { status: 500 });
  }
}
