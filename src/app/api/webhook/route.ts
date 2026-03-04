import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/config';
import { loadChips, updateChip } from '@/lib/chips';

export async function POST(request: NextRequest) {
  try {
    const config = await loadConfig();
    if (!config) {
      return NextResponse.json({ error: 'Sistema não configurado' }, { status: 400 });
    }

    const body = await request.json();
    
    const event = body.event;
    const instanceName = body.instance;
    
    if (event === 'connection.update') {
      const chips = await loadChips();
      const chip = chips.find(c => c.name === instanceName || c.id === instanceName);
      
      if (chip) {
        const state = body.data?.state;
        const newStatus = state === 'open' ? 'connected' : 'disconnected';
        await updateChip(chip.id, { status: newStatus });
      }
    }

    if (event === 'messages.upsert') {
      const messages = body.data?.messages || [];
      for (const msg of messages) {
        if (msg.key?.remoteJid && msg.key?.fromMe === false) {
          console.log('Nova mensagem:', msg.key.remoteJid);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Webhook endpoint' });
}
