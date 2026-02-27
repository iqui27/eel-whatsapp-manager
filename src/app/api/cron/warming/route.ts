import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/config';
import { loadChips, updateChip } from '@/lib/chips';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  const config = await loadConfig();
  
  if (!config) {
    return NextResponse.json({ error: 'Sistema não configurado' }, { status: 400 });
  }

  if (!config.warmingEnabled) {
    return NextResponse.json({ message: 'Warming desabilitado' });
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
        results.push({ id: chip.id, name: chip.name, success: true });
      } else {
        const error = await response.text();
        results.push({ id: chip.id, name: chip.name, success: false, error });
      }
    } catch (error) {
      results.push({ id: chip.id, name: chip.name, success: false, error: String(error) });
    }
  }

  return NextResponse.json({ 
    timestamp: new Date().toISOString(),
    total: enabledChips.length,
    results 
  });
}
