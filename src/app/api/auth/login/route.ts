import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { createSession } from '@/lib/db-auth';

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

    const token = await createSession();

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
