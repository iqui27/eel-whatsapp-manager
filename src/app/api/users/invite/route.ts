import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { getUser, generateInviteToken } from '@/lib/db-users';
import { sendInviteEmail } from '@/lib/email';

/**
 * POST /api/users/invite
 * (Re)send an invite email to an existing user.
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'admin.manage', 'Somente administradores podem enviar convites');
  if (auth.response) return auth.response;

  try {
    const body = await request.json() as { userId?: string };
    if (!body.userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    const user = await getUser(body.userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const { token } = await generateInviteToken(user.id);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const inviteUrl = `${appUrl}/accept-invite?token=${token}`;

    const emailResult = await sendInviteEmail({
      to: user.email,
      name: user.name,
      role: user.role ?? 'voluntario',
      inviteUrl,
    });

    if (!emailResult.success) {
      console.error('[api/users/invite] Email failed:', emailResult.error);
      return NextResponse.json({ error: 'Erro ao enviar email de convite', detail: emailResult.error }, { status: 500 });
    }

    console.log('[api/users/invite] Invite resent to', user.email);
    return NextResponse.json({ success: true, email: user.email });
  } catch (err) {
    console.error('[api/users/invite] error:', err);
    return NextResponse.json({ error: 'Erro ao reenviar convite' }, { status: 500 });
  }
}
