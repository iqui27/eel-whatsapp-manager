import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { updateUser, hashPassword } from '@/lib/db-users';

/**
 * POST /api/users/set-password
 * Admin-only: set (or reset) the password for a user.
 * Body: { id: string, password: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requirePermission(
    request,
    'admin.manage',
    'Somente administradores podem definir senhas',
  );
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { id, password } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return NextResponse.json(
        { error: 'Senha deve ter pelo menos 4 caracteres' },
        { status: 400 },
      );
    }

    const passwordHash = hashPassword(password);
    const user = await updateUser(id, { passwordHash });
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, userId: user.id, name: user.name });
  } catch (err) {
    console.error('POST /api/users/set-password error:', err);
    return NextResponse.json({ error: 'Erro ao definir senha' }, { status: 500 });
  }
}
