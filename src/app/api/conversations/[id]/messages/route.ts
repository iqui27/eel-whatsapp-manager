import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/db-auth';
import { addMessage, getConversation, getMessages } from '@/lib/db-conversations';
import { loadChips } from '@/lib/db-chips';
import { loadConfig } from '@/lib/db-config';
import { sendText } from '@/lib/evolution';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;
  return await validateSession(token);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const messages = await getMessages(id);
    return NextResponse.json(messages);
  } catch (err) {
    console.error('[GET messages]', err);
    return NextResponse.json({ error: 'Erro ao carregar mensagens' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await request.json();
    if (!body.sender || !body.content) {
      return NextResponse.json({ error: 'sender e content são obrigatórios' }, { status: 400 });
    }

    if (body.sender === 'agent') {
      const conversation = await getConversation(id);
      if (!conversation) {
        return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
      }

      const config = await loadConfig();
      if (!config?.evolutionApiUrl || !config.evolutionApiKey) {
        return NextResponse.json({ error: 'Configuração da Evolution API incompleta' }, { status: 500 });
      }

      const chips = await loadChips();
      const connectedChips = chips.filter((chip) => chip.status === 'connected' && chip.instanceName);
      const boundChip = conversation.chipId
        ? connectedChips.find((chip) => chip.id === conversation.chipId)
        : undefined;
      const fallbackChip = connectedChips[0];
      const instanceName = boundChip?.instanceName ?? fallbackChip?.instanceName ?? config.instanceName;
      if (!instanceName) {
        return NextResponse.json({ error: 'Nenhum chip conectado disponível para envio' }, { status: 500 });
      }

      const normalizedPhone = conversation.voterPhone.replace(/\D/g, '');
      if (!normalizedPhone) {
        return NextResponse.json({ error: 'Telefone do eleitor inválido para envio' }, { status: 400 });
      }

      try {
        await sendText(
          config.evolutionApiUrl,
          config.evolutionApiKey,
          instanceName,
          normalizedPhone,
          body.content,
        );
      } catch (err) {
        console.error('[POST message sendText]', err);
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Erro ao enviar mensagem no WhatsApp' },
          { status: 500 },
        );
      }
    }

    const message = await addMessage(id, body.sender, body.content);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error('[POST message]', err);
    return NextResponse.json({ error: 'Erro ao adicionar mensagem' }, { status: 500 });
  }
}
