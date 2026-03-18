/**
 * POST /api/chips/provision
 * Creates a new Evolution API instance, configures the webhook,
 * saves the chip to the database, and returns the QR code data.
 *
 * GET /api/chips/provision?instanceName=xxx
 * Returns the current connection state + fresh QR code for an existing instance.
 * Poll this every 5s until state === 'connected'.
 *
 * DELETE /api/chips/provision?chipId=xxx
 * Removes the chip from DB and deletes the Evolution instance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { loadConfig } from '@/lib/db-config';
import { addChip, deleteChip, getChip } from '@/lib/db-chips';
import {
  createInstance,
  connectInstance,
  deleteInstance,
  getConnectionState,
} from '@/lib/evolution';

function getWebhookUrl(request: NextRequest): string {
  const url = new URL(request.url);
  // Use NEXT_PUBLIC_APP_URL env if set, otherwise derive from request origin
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? `${url.protocol}//${url.host}`;
  return `${origin}/api/webhook`;
}

// ── POST: provision a new chip ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.manage', 'Seu operador não pode adicionar chips');
  if (auth.response) return auth.response;

  const config = await loadConfig();
  if (!config?.evolutionApiUrl || !config.evolutionApiKey) {
    return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 500 });
  }

  let body: { name?: string; phone?: string; dailyLimit?: number; hourlyLimit?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Nome do chip é obrigatório' }, { status: 400 });
  }

  // Derive a safe instanceName from the chip name
  const instanceName = body.name.trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40);

  try {
    // 1. Create instance in Evolution API with webhook pre-configured
    const result = await createInstance(config.evolutionApiUrl, config.evolutionApiKey, {
      instanceName,
      webhookUrl: getWebhookUrl(request),
      rejectCall: true,
      alwaysOnline: true,
    });

    // 2. Save chip to database
    const chip = await addChip({
      name: body.name.trim(),
      phone: body.phone?.trim() ?? '',
      instanceName,
      groupId: null,
      enabled: true,
      status: 'disconnected',
      warmCount: 0,
      dailyLimit: body.dailyLimit ?? 200,
      hourlyLimit: body.hourlyLimit ?? 25,
    });

    // 3. Get initial QR code
    let qrCode: string | null = null;
    let pairingCode: string | null = null;
    try {
      const qrData = await connectInstance(config.evolutionApiUrl, config.evolutionApiKey, instanceName);
      qrCode = qrData.code ?? qrData.base64 ?? null;
      pairingCode = qrData.pairingCode ?? null;
    } catch {
      // QR fetch is non-critical — client can poll /api/chips/provision?instanceName=
    }

    return NextResponse.json({
      chip,
      instanceName,
      instanceId: result.instanceId,
      qrCode,
      pairingCode,
      webhookConfigured: true,
      webhookUrl: getWebhookUrl(request),
    }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // If instance name already taken in Evolution, suggest suffixed name
    if (msg.includes('already in use')) {
      return NextResponse.json({
        error: `Nome "${instanceName}" já está em uso na Evolution API. Escolha outro nome.`,
      }, { status: 409 });
    }
    console.error('[chips/provision POST]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── GET: poll connection state + refresh QR ───────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.view', 'Sem permissão');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const instanceName = searchParams.get('instanceName');
  if (!instanceName) {
    return NextResponse.json({ error: 'instanceName é obrigatório' }, { status: 400 });
  }

  const config = await loadConfig();
  if (!config?.evolutionApiUrl || !config.evolutionApiKey) {
    return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 500 });
  }

  const { status } = await getConnectionState(config.evolutionApiUrl, config.evolutionApiKey, instanceName);

  // If still disconnected, fetch a fresh QR code
  let qrCode: string | null = null;
  let pairingCode: string | null = null;
  if (status !== 'connected') {
    try {
      const qrData = await connectInstance(config.evolutionApiUrl, config.evolutionApiKey, instanceName);
      qrCode = qrData.code ?? qrData.base64 ?? null;
      pairingCode = qrData.pairingCode ?? null;
    } catch { /* noop — QR might not be ready yet */ }
  }

  return NextResponse.json({ status, qrCode, pairingCode });
}

// ── DELETE: remove chip + Evolution instance ──────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.manage', 'Sem permissão');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const chipId = searchParams.get('chipId');
  if (!chipId) {
    return NextResponse.json({ error: 'chipId é obrigatório' }, { status: 400 });
  }

  const config = await loadConfig();
  const chip = await getChip(chipId);
  if (!chip) return NextResponse.json({ error: 'Chip não encontrado' }, { status: 404 });

  // Delete from Evolution first (non-critical if it fails)
  if (chip.instanceName && config?.evolutionApiUrl && config.evolutionApiKey) {
    try {
      await deleteInstance(config.evolutionApiUrl, config.evolutionApiKey, chip.instanceName);
    } catch (err) {
      console.warn('[chips/provision DELETE] Evolution instance delete failed (continuing):', err);
    }
  }

  // Delete from DB
  await deleteChip(chipId);

  return NextResponse.json({ success: true });
}
