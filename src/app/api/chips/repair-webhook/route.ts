/**
 * POST /api/chips/repair-webhook
 * Body: { chipId: string }
 *
 * Re-registers the webhook for a specific chip instance in Evolution API.
 * Use this when incoming messages are not arriving in the app — it means
 * the webhook URL is missing or pointing to the wrong address.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { loadConfig } from '@/lib/db-config';
import { getChip } from '@/lib/db-chips';
import { setInstanceWebhook, findInstanceWebhook } from '@/lib/evolution';

function getWebhookUrl(request: NextRequest): string {
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? `${url.protocol}//${url.host}`;
  return `${origin}/api/webhook`;
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.manage', 'Sem permissão para reparar webhook');
  if (auth.response) return auth.response;

  let body: { chipId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!body.chipId) {
    return NextResponse.json({ error: 'chipId é obrigatório' }, { status: 400 });
  }

  const config = await loadConfig();
  if (!config?.evolutionApiUrl || !config.evolutionApiKey) {
    return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 400 });
  }

  const chip = await getChip(body.chipId);
  if (!chip) {
    return NextResponse.json({ error: 'Chip não encontrado' }, { status: 404 });
  }

  if (!chip.instanceName) {
    return NextResponse.json({ error: 'Chip não tem instanceName configurado' }, { status: 400 });
  }

  const webhookUrl = getWebhookUrl(request);

  // Check current webhook config before repairing
  let before: { url: string; enabled: boolean } | null = null;
  try {
    before = await findInstanceWebhook(config.evolutionApiUrl, config.evolutionApiKey, chip.instanceName);
  } catch {
    // Non-critical
  }

  // Re-register webhook
  await setInstanceWebhook(config.evolutionApiUrl, config.evolutionApiKey, chip.instanceName, webhookUrl);

  return NextResponse.json({
    success: true,
    chip: chip.name,
    instanceName: chip.instanceName,
    webhookUrl,
    previousWebhookUrl: before?.url ?? null,
    wasEnabled: before?.enabled ?? null,
  });
}
