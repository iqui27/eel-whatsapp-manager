import { NextRequest, NextResponse } from 'next/server';
import { formatPhoneForWhatsApp, normalizePhone } from '@/lib/phone';
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

      // Normalize voter phone first so we can compare with chip phones
      const normalizedVoterPhone = normalizePhone(conversation.voterPhone);
      if (!normalizedVoterPhone || normalizedVoterPhone.length < 12) {
        return NextResponse.json({ error: 'Telefone do eleitor inválido para envio' }, { status: 400 });
      }

      // Select chip: prefer bound chip, but never send from the chip whose number matches the voter
      const boundChip = conversation.chipId
        ? connectedChips.find(
            (chip) => chip.id === conversation.chipId &&
              normalizePhone(chip.phone) !== normalizedVoterPhone,
          )
        : undefined;

      // Fallback: first connected chip that is NOT the voter's own number
      const fallbackChip = connectedChips.find(
        (chip) => normalizePhone(chip.phone) !== normalizedVoterPhone,
      );

      const chosenChip = boundChip ?? fallbackChip;
      const instanceName = chosenChip?.instanceName ?? config.instanceName;

      if (!instanceName) {
        return NextResponse.json({ error: 'Nenhum chip disponível — todos os chips conectados pertencem ao número do eleitor' }, { status: 500 });
      }

      // Evolution API v2 requires the number as JID: 55XXXXXXXXXXX@s.whatsapp.net
      // Brazilian 9th-digit: some numbers are stored as 13-digit (55+DDD+9+8) but
      // registered on WhatsApp as 12-digit (55+DDD+8). Try both formats.
      const waNumber = formatPhoneForWhatsApp(conversation.voterPhone);
      const waNumberAlt =
        normalizedVoterPhone.length === 13
          ? `${normalizedVoterPhone.slice(0, 4)}${normalizedVoterPhone.slice(5)}@s.whatsapp.net`
          : normalizedVoterPhone.length === 12
            ? `${normalizedVoterPhone.slice(0, 4)}9${normalizedVoterPhone.slice(4)}@s.whatsapp.net`
            : null;

      const isExistsError = (err: unknown) =>
        err instanceof Error && /"exists":\s*false/.test(err.message);

      try {
        await sendText(
          config.evolutionApiUrl,
          config.evolutionApiKey,
          instanceName,
          waNumber,
          body.content,
        );
      } catch (err) {
        // If the first format doesn't exist on WhatsApp, retry with the alternative format
        if (isExistsError(err) && waNumberAlt) {
          console.log(`[POST message] ${waNumber} not found, retrying with ${waNumberAlt}`);
          try {
            await sendText(
              config.evolutionApiUrl,
              config.evolutionApiKey,
              instanceName,
              waNumberAlt,
              body.content,
            );
            // Alternative worked — continue to addMessage below
          } catch (err2) {
            console.error('[POST message sendText retry]', err2);
            const altPhone = waNumberAlt.replace('@s.whatsapp.net', '');
            return NextResponse.json({
              error: `O número ${normalizedVoterPhone} (e variante ${altPhone}) não possui WhatsApp cadastrado`,
            }, { status: 400 });
          }
        } else {
          console.error('[POST message sendText]', err);
          let errorMsg = 'Erro ao enviar mensagem no WhatsApp';
          if (err instanceof Error) {
            if (err.message.includes('(401)')) {
              errorMsg = 'Chip desconectado do WhatsApp. Reconecte na Evolution API.';
            } else {
              errorMsg = err.message;
            }
          }
          return NextResponse.json({ error: errorMsg }, { status: 400 });
        }
      }
    }

    const message = await addMessage(id, body.sender, body.content);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error('[POST message]', err);
    return NextResponse.json({ error: 'Erro ao adicionar mensagem' }, { status: 500 });
  }
}
