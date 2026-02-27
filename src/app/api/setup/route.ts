import { NextRequest, NextResponse } from 'next/server';
import { saveConfig, validateConfig, loadConfig, AppConfig } from '@/lib/config';

export async function GET() {
  const config = await loadConfig();
  
  if (!config) {
    return NextResponse.json({ configured: false }, { status: 404 });
  }
  
  return NextResponse.json({ configured: true });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const errors = validateConfig(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }

    const config: AppConfig = {
      evolutionApiUrl: body.evolutionApiUrl,
      evolutionApiKey: body.evolutionApiKey,
      authPassword: body.authPassword,
      warmingEnabled: body.warmingEnabled ?? true,
      warmingIntervalMinutes: body.warmingIntervalMinutes ?? 60,
      warmingMessage: body.warmingMessage ?? '🔔 Aquecimento ativado!',
      instanceName: body.instanceName,
    };

    await saveConfig(config);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 });
  }
}
