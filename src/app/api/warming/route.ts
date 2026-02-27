import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/config';
import { loadChips, updateChip } from '@/lib/chips';

async function verifyAuth(request: NextRequest) {
  const authCookie = request.cookies.get('auth');
  const config = await loadConfig();
  
  if (!config || authCookie?.value !== config.authPassword) {
    return null;
  }
  return config;
}

export async function POST(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    const chips = await loadChips();
    const chip = chips.find(c => c.id === id);

    if (!chip) {
      return NextResponse.json({ error: 'Chip não encontrado' }, { status: 404 });
    }

    const response = await fetch(`${config.evolutionApiUrl}/message/sendText/${config.instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.evolutionApiKey,
      },
      body: JSON.stringify({
        number: chip.phone,
        text: config.warmingMessage,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    await updateChip(id, { 
      lastWarmed: new Date().toISOString(),
      status: 'warming'
    });

    return NextResponse.json({ success: true, message: 'Mensagem enviada' });
  } catch (error) {
    console.error('Warming error:', error);
    return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chips = await loadChips();
  const enabledChips = chips.filter(c => c.enabled);
  
  const results = [];
  
  for (const chip of enabledChips) {
    try {
      const response = await fetch(`${config.evolutionApiUrl}/message/sendText/${config.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.evolutionApiKey,
        },
        body: JSON.stringify({
          number: chip.phone,
          text: config.warmingMessage,
        }),
      });

      if (response.ok) {
        await updateChip(chip.id, { 
          lastWarmed: new Date().toISOString(),
          status: 'connected'
        });
        results.push({ id: chip.id, success: true });
      } else {
        results.push({ id: chip.id, success: false, error: await response.text() });
      }
    } catch (error) {
      results.push({ id: chip.id, success: false, error: String(error) });
    }
  }

  return NextResponse.json({ results });
}
