import { NextRequest, NextResponse } from 'next/server';
import { normalizePhone } from '@/lib/phone';
import { addMessage, getConversation, getMessages } from '@/lib/db-conversations';
import { loadChips } from '@/lib/db-chips';
import { loadConfig } from '@/lib/db-config';
import { sendText } from '@/lib/evolution';
import { isVoterInScope } from '@/lib/authorization';
import { getVoter } from '@/lib/db-voters';
import { requirePermission } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(request, 'conversations.view', 'Seu operador não pode ler mensagens');
  if (auth.response) return auth.response;
  const { id } = await params;
  try {
    const conversation = await getConversation(id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }
    if (conversation.voterId) {
      const voter = await getVoter(conversation.voterId);
      if (voter && !isVoterInScope(auth.actor, voter)) {
        return NextResponse.json({ error: 'Fora do seu escopo regional' }, { status: 403 });
      }
    }
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
  const auth = await requirePermission(request, 'conversations.reply', 'Seu operador não pode responder conversas');
  if (auth.response) return auth.response;
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
      if (conversation.voterId) {
        const voter = await getVoter(conversation.voterId);
        if (voter && !isVoterInScope(auth.actor, voter)) {
          return NextResponse.json({ error: 'Fora do seu escopo regional' }, { status: 403 });
        }
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

      // Normalize phone to E.164 format (55XXXXXXXXXXX)
      const normalizedPhone = normalizePhone(conversation.voterPhone);
      if (!normalizedPhone || normalizedPhone.length < 12) {
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
        
        // Parse Evolution API error for user-friendly message
        let errorMsg = 'Erro ao enviar mensagem no WhatsApp';
        if (err instanceof Error) {
          const match = err.message.match(/"exists":\s*false/);
          if (match) {
            errorMsg = `O número ${normalizedPhone} não possui WhatsApp cadastrado`;
          } else if (err.message.includes('(401)')) {
            errorMsg = 'Chip desconectado do WhatsApp. Reconecte na Evolution API.';
          } else {
            errorMsg = err.message;
          }
        }
        
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }
    }

    const message = await addMessage(id, body.sender, body.content);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error('[POST message]', err);
    return NextResponse.json({ error: 'Erro ao adicionar mensagem' }, { status: 500 });
  }
}
