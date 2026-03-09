import { NextRequest, NextResponse } from 'next/server';
import { saveConfig, validateConfig, loadConfig } from '@/lib/db-config';

export async function GET() {
  const config = await loadConfig();

  return NextResponse.json({
    configured: Boolean(config),
    instanceName: config?.instanceName ?? null,
  });
}

export async function POST(request: NextRequest) {
  // Block re-setup if config already exists
  const existing = await loadConfig();
  if (existing) {
    return NextResponse.json({ error: 'Sistema já configurado' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const errors = validateConfig(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }

    await saveConfig({
      evolutionApiUrl: body.evolutionApiUrl,
      evolutionApiKey: body.evolutionApiKey,
      authPassword: body.authPassword,
      warmingEnabled: body.warmingEnabled ?? true,
      warmingIntervalMinutes: body.warmingIntervalMinutes ?? 60,
      warmingMessage: body.warmingMessage ?? 'Aquecimento ativado!',
      instanceName: body.instanceName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 });
  }
}
