import { NextRequest, NextResponse } from 'next/server';
import { isCandidateProfileConfigured } from '@/lib/campaign-variables';
import { loadConfig, normalizeCandidateProfile, saveConfig, validateConfig } from '@/lib/db-config';
import { validateSession } from '@/lib/db-auth';
import { testConnection } from '@/lib/evolution';
import type { Config } from '@/db';

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
    candidateProfileReady: isCandidateProfileConfigured(config),
    evolutionApiKey: maskApiKey(config.evolutionApiKey),
  });
}

export async function PUT(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as Partial<Config>;
    const candidateProfile = normalizeCandidateProfile({
      candidateDisplayName: body.candidateDisplayName,
      candidateOffice: body.candidateOffice,
      candidateParty: body.candidateParty,
      candidateRegion: body.candidateRegion,
    });
    const errors = validateConfig({
      ...config,
      ...body,
      ...candidateProfile,
    });

    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0], details: errors }, { status: 400 });
    }

    // If the client sends back the masked placeholder, keep the original key
    const isMasked = (key: string) => key.includes('***');

    const savedConfig = await saveConfig({
      evolutionApiUrl: body.evolutionApiUrl ?? config.evolutionApiUrl,
      evolutionApiKey: (body.evolutionApiKey && !isMasked(body.evolutionApiKey))
        ? body.evolutionApiKey
        : config.evolutionApiKey,
      warmingEnabled: body.warmingEnabled ?? config.warmingEnabled,
      warmingIntervalMinutes: body.warmingIntervalMinutes ?? config.warmingIntervalMinutes,
      warmingMessage: body.warmingMessage ?? config.warmingMessage,
      instanceName: body.instanceName ?? config.instanceName,
      ...candidateProfile,
      authPassword: config.authPassword,
      lastCronRun: config.lastCronRun,
    });
    return NextResponse.json({
      success: true,
      candidateProfileReady: isCandidateProfileConfigured(savedConfig),
    });
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
    const result = await testConnection(config.evolutionApiUrl, config.evolutionApiKey);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ ok: false, message: 'Não foi possível conectar à API' }, { status: 500 });
  }
}
