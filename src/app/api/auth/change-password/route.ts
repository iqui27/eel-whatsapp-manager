import { NextRequest, NextResponse } from 'next/server';
import { requireRequestActor } from '@/lib/api-auth';
import { loadConfig, saveConfig } from '@/lib/db-config';

/**
 * Change password — updates the global auth password.
 * Requires current password verification before allowing change.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRequestActor(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Senha atual e nova senha são obrigatórias' },
        { status: 400 },
      );
    }

    if (typeof newPassword !== 'string' || newPassword.length < 4) {
      return NextResponse.json(
        { error: 'Nova senha deve ter pelo menos 4 caracteres' },
        { status: 400 },
      );
    }

    const config = await loadConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'Sistema não configurado' },
        { status: 400 },
      );
    }

    // Verify current password
    if (currentPassword !== config.authPassword) {
      return NextResponse.json(
        { error: 'Senha atual incorreta' },
        { status: 403 },
      );
    }

    // Update the password
    await saveConfig({
      evolutionApiUrl: config.evolutionApiUrl,
      evolutionApiKey: config.evolutionApiKey,
      authPassword: newPassword,
      instanceName: config.instanceName,
      warmingEnabled: config.warmingEnabled ?? true,
      warmingIntervalMinutes: config.warmingIntervalMinutes ?? 60,
      warmingMessage: config.warmingMessage ?? '',
      candidateDisplayName: config.candidateDisplayName,
      candidateOffice: config.candidateOffice,
      candidateParty: config.candidateParty,
      candidateRegion: config.candidateRegion,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/auth/change-password error:', err);
    return NextResponse.json(
      { error: 'Erro ao alterar senha' },
      { status: 500 },
    );
  }
}
