import { NextRequest, NextResponse } from 'next/server';
import { getUserByInviteToken, acceptInvite, hashPassword } from '@/lib/db-users';
import { createSession } from '@/lib/db-auth';

/**
 * GET /api/auth/accept-invite?token=xxx
 * Validate token and return user info (name, email) for the UI.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
  }

  const user = await getUserByInviteToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Link expirado ou já utilizado' }, { status: 410 });
  }

  return NextResponse.json({ name: user.name, email: user.email, role: user.role });
}

/**
 * POST /api/auth/accept-invite
 * Accept invite: set password and create session.
 * Body: { token: string, password: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { token?: string; password?: string };

    if (!body.token) {
      return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 });
    }
    if (!body.password || body.password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    const user = await getUserByInviteToken(body.token);
    if (!user) {
      return NextResponse.json({ error: 'Link expirado ou já utilizado' }, { status: 410 });
    }

    const passwordHash = hashPassword(body.password);
    const updated = await acceptInvite(user.id, passwordHash);
    if (!updated) {
      return NextResponse.json({ error: 'Erro ao ativar conta' }, { status: 500 });
    }

    // Create session automatically so the user is logged in right after
    const sessionToken = await createSession({
      userId: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role ?? 'voluntario',
      regionScope: updated.regionScope ?? null,
    });

    const response = NextResponse.json({ success: true, name: updated.name });
    response.cookies.set('auth', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[api/auth/accept-invite] error:', err);
    return NextResponse.json({ error: 'Erro ao aceitar convite' }, { status: 500 });
  }
}
