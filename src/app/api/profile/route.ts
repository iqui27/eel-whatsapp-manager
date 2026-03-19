import { NextRequest, NextResponse } from 'next/server';
import { requireRequestActor } from '@/lib/api-auth';
import { updateUser } from '@/lib/db-users';

/**
 * Profile API — any authenticated user can update their own name/email.
 * No admin.manage permission required (unlike /api/users).
 */
export async function PUT(request: NextRequest) {
  const auth = await requireRequestActor(request);
  if (auth.response) return auth.response;

  const actor = auth.actor!;

  // Bootstrap sessions (no userId) can't update profile
  if (!actor.userId) {
    return NextResponse.json(
      { error: 'Sessão bootstrap não possui perfil editável' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();

    // Only allow name and email updates via this route
    const updates: Record<string, string> = {};

    if (typeof body.name === 'string' && body.name.trim()) {
      updates.name = body.name.trim();
    }

    if (typeof body.email === 'string' && body.email.trim()) {
      updates.email = body.email.trim().toLowerCase();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhuma alteração fornecida' }, { status: 400 });
    }

    const user = await updateUser(actor.userId, updates);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('PUT /api/profile error:', err);
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
}
