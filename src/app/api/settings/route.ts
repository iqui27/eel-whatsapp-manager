import { NextRequest, NextResponse } from 'next/server';
import { loadConfig, saveConfig, AppConfig } from '@/lib/config';
import { validateSession } from '@/lib/auth';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;
  if (!await validateSession(token)) {
    return null;
  }
  return await loadConfig();
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return '***';
  return key.slice(0, 4) + '***' + key.slice(-4);
}

export async function GET(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Return config without raw password; mask the API key
  const { authPassword: _, ...rest } = config;
  return NextResponse.json({
    ...rest,
    evolutionApiKey: maskApiKey(config.evolutionApiKey),
  });
}

export async function PUT(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as Partial<AppConfig>;

    // If the client sends back the masked placeholder, keep the original key
    const isMasked = (key: string) => key.includes('***');

    const updated: AppConfig = {
      ...config,
      evolutionApiUrl: body.evolutionApiUrl ?? config.evolutionApiUrl,
      evolutionApiKey: (body.evolutionApiKey && !isMasked(body.evolutionApiKey))
        ? body.evolutionApiKey
        : config.evolutionApiKey,
      warmingEnabled: body.warmingEnabled ?? config.warmingEnabled,
      warmingIntervalMinutes: body.warmingIntervalMinutes ?? config.warmingIntervalMinutes,
      warmingMessage: body.warmingMessage ?? config.warmingMessage,
      instanceName: body.instanceName ?? config.instanceName,
      // keep authPassword and lastCronRun unchanged
      authPassword: config.authPassword,
      lastCronRun: config.lastCronRun,
    };

    await saveConfig(updated);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Test connection endpoint
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${config.evolutionApiUrl}/instance/fetchInstances`, {
      headers: {
        'apikey': config.evolutionApiKey,
      },
    });

    if (response.ok) {
      return NextResponse.json({ success: true, message: 'Conexão bem-sucedida!' });
    } else {
      return NextResponse.json({ success: false, message: 'Falha na conexão com a API' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ success: false, message: 'Não foi possível conectar à API' }, { status: 500 });
  }
}
