import { NextRequest, NextResponse } from 'next/server';
import { loadChips, addChip, updateChip, deleteChip, updateChipHealth, getChip } from '@/lib/db-chips';
import { requirePermission } from '@/lib/api-auth';
import { getConnectionState, restartInstance } from '@/lib/evolution';
import { loadConfig } from '@/lib/db-config';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.view', 'Seu operador não pode ver chips');
  if (auth.response) return auth.response;

  const chips = await loadChips();
  // Return all fields including health monitoring data
  return NextResponse.json(chips);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.manage', 'Seu operador não pode cadastrar chips');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const chip = await addChip({
      name: body.name,
      phone: body.phone,
      instanceName: body.instanceName || null,
      groupId: body.groupId || null,
      enabled: body.enabled ?? true,
      status: 'disconnected',
      warmCount: 0,
      dailyLimit: body.dailyLimit ?? 200,
      hourlyLimit: body.hourlyLimit ?? 25,
      assignedSegments: Array.isArray(body.assignedSegments) && body.assignedSegments.length > 0
        ? body.assignedSegments
        : null,
    });
    return NextResponse.json(chip, { status: 201 });
  } catch (error) {
    console.error('Add chip error:', error);
    return NextResponse.json({ error: 'Erro ao adicionar chip' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.manage', 'Seu operador não pode editar chips');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();

    // ─── Restart action ────────────────────────────────────────────────────
    if (body.action === 'restart') {
      const chipId = body.id as string;
      if (!chipId) {
        return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
      }

      const chip = await getChip(chipId);
      if (!chip) {
        return NextResponse.json({ error: 'Chip não encontrado' }, { status: 404 });
      }
      if (!chip.instanceName) {
        return NextResponse.json({ error: 'Chip sem instância configurada' }, { status: 400 });
      }

      const config = await loadConfig();
      if (!config) {
        return NextResponse.json({ error: 'Configuração ausente' }, { status: 404 });
      }

      try {
        const restartResult = await restartInstance(config.evolutionApiUrl, config.evolutionApiKey, chip.instanceName);
        
        if (!restartResult.success) {
          // Restart not available, but we can still check state
          console.log(`[restart] ${restartResult.message}`);
        }
        
        await sleep(3000);
        const { status: newState, instanceExists } = await getConnectionState(
          config.evolutionApiUrl, 
          config.evolutionApiKey, 
          chip.instanceName
        );

        if (!instanceExists) {
          return NextResponse.json({ 
            error: 'Instância não encontrada', 
            details: `A instância "${chip.instanceName}" não existe na Evolution API. Verifique o nome ou crie a instância.` 
          }, { status: 404 });
        }

        const healthStatus = newState === 'connected' ? 'healthy' : 'disconnected';
        await updateChipHealth(chipId, {
          healthStatus,
          errorCount: newState === 'connected' ? 0 : (chip.errorCount ?? 0) + 1,
          lastHealthCheck: new Date(),
        });
        // Also update legacy status field
        await updateChip(chipId, { status: newState === 'connected' ? 'connected' : 'disconnected' });

        return NextResponse.json({ 
          success: true, 
          healthStatus, 
          connectionState: newState,
          restartAvailable: restartResult.success,
          restartMessage: restartResult.message,
        });
      } catch (restartError) {
        console.error('Restart error:', restartError);
        await updateChipHealth(chipId, {
          healthStatus: 'disconnected',
          errorCount: (chip.errorCount ?? 0) + 1,
          lastHealthCheck: new Date(),
        });
        return NextResponse.json({ error: 'Erro ao reiniciar instância', details: String(restartError) }, { status: 500 });
      }
    }

    // ─── Standard update ───────────────────────────────────────────────────
    await updateChip(body.id, body.updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update chip error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar chip' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.manage', 'Seu operador não pode remover chips');
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    await deleteChip(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete chip error:', error);
    return NextResponse.json({ error: 'Erro ao deletar chip' }, { status: 500 });
  }
}
