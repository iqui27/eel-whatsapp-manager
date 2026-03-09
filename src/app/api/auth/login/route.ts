import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { createSession } from '@/lib/db-auth';
import { loadEnabledUsers, getUserByEmail } from '@/lib/db-users';

export async function GET() {
  const config = await loadConfig();
  const users = config ? await loadEnabledUsers() : [];

  return NextResponse.json({
    configured: Boolean(config),
    requireEmail: users.length > 0,
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      regionScope: user.regionScope,
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = await loadConfig();

    if (!config) {
      return NextResponse.json({ error: 'Sistema não configurado' }, { status: 401 });
    }

    if (body.password !== config.authPassword) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    const enabledUsers = await loadEnabledUsers();
    let token: string;

    if (enabledUsers.length > 0) {
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!email) {
        return NextResponse.json({ error: 'Selecione um operador para entrar' }, { status: 400 });
      }

      const user = await getUserByEmail(email);
      if (!user || user.enabled === false) {
        return NextResponse.json({ error: 'Operador não encontrado ou desativado' }, { status: 401 });
      }

      token = await createSession({
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role ?? 'voluntario',
        regionScope: user.regionScope ?? null,
      });
    } else {
      token = await createSession({
        name: 'Administrador bootstrap',
        email: null,
        role: 'admin',
        source: 'bootstrap',
      });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erro no login' }, { status: 500 });
  }
}
