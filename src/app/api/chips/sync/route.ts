import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { loadChips, updateChip } from '@/lib/db-chips';
import { validateSession } from '@/lib/db-auth';
import { fetchInstances } from '@/lib/evolution';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;
  if (!await validateSession(token)) return null;
  return await loadConfig();
}

/**
 * POST /api/chips/sync
 * Fetches all instances from Evolution API and updates each chip's
 * connectionStatus based on its instanceName field.
 */
export async function POST(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [chips, instances] = await Promise.all([
      loadChips(),
      fetchInstances(config.evolutionApiUrl, config.evolutionApiKey),
    ]);

    // Build a map: instanceName (lowercase) → status
    const statusMap = new Map(
      instances.map((inst) => [
        inst.name.toLowerCase(),
        inst.connectionStatus === 'open' ? 'connected' : 'disconnected',
      ]),
    );

    const updates = await Promise.all(
      chips.map(async (chip) => {
        if (!chip.instanceName) return { id: chip.id, status: chip.status, changed: false };

        const evStatus = statusMap.get(chip.instanceName.toLowerCase()) ?? 'disconnected';
        const newStatus = evStatus as 'connected' | 'disconnected';

        if (chip.status !== newStatus) {
          await updateChip(chip.id, { status: newStatus });
          return { id: chip.id, name: chip.name, status: newStatus, changed: true };
        }
        return { id: chip.id, name: chip.name, status: chip.status, changed: false };
      }),
    );

    return NextResponse.json({
      success: true,
      updated: updates.filter((u) => u.changed).length,
      chips: updates,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Erro ao sincronizar com a Evolution API' }, { status: 500 });
  }
}
