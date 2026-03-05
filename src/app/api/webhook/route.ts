import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { conversations } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { loadChips, updateChip } from '@/lib/db-chips';
import { addConversation, addMessage } from '@/lib/db-conversations';
import { searchVoters } from '@/lib/db-voters';

// ─── Dedup cache — prevents storing duplicate webhook deliveries ─────────────
// Evolution API occasionally fires the same event twice within a few seconds.
// We keep processed message IDs in a Set (per process lifetime) and skip dupes.
const processedMessageIds = new Set<string>();
const DEDUP_CACHE_MAX = 2000; // prevent unbounded growth

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = body.event as string | undefined;
  const instanceName = body.instance as string | undefined;

  // ─── connection.update — keep chip status in sync ───────────────────────────
  if (event === 'connection.update') {
    try {
      const chips = await loadChips();
      const chip = chips.find(
        (c) => c.name === instanceName || c.instanceName === instanceName,
      );

      if (chip) {
        const state = (body.data as Record<string, unknown>)?.state as string | undefined;
        const newStatus: 'connected' | 'disconnected' =
          state === 'open' ? 'connected' : 'disconnected';
        await updateChip(chip.id, { status: newStatus });
        console.log('[webhook] Chip', instanceName, '→', newStatus);
      }
    } catch (err) {
      console.error('[webhook] connection.update error:', err);
    }
  }

  // ─── messages.upsert — store inbound messages as conversations ──────────────
  if (event === 'messages.upsert') {
    const data = body.data as Record<string, unknown> | undefined;
    const messages = (data?.messages as unknown[]) ?? [];

    for (const raw of messages) {
      const msg = raw as Record<string, unknown>;

      try {
        const key = msg.key as Record<string, unknown> | undefined;
        if (!key) continue;

        // Only handle inbound (not sent by us)
        if (key.fromMe !== false) continue;

        const remoteJid = key.remoteJid as string | undefined;
        if (!remoteJid) continue;

        // Skip group chats — only handle 1:1 conversations
        if (remoteJid.includes('@g.us')) continue;

        // Dedup — skip if we've already processed this message ID
        const msgId = key.id as string | undefined;
        if (msgId) {
          if (processedMessageIds.has(msgId)) {
            console.log('[webhook] Skipping duplicate message', msgId);
            continue;
          }
          if (processedMessageIds.size >= DEDUP_CACHE_MAX) {
            // Trim oldest entries when cache grows too large
            const oldest = processedMessageIds.values().next().value;
            if (oldest) processedMessageIds.delete(oldest);
          }
          processedMessageIds.add(msgId);
        }

        // Extract clean phone number (strip @s.whatsapp.net)
        const phone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
        if (!phone) continue;

        // Extract message text
        const msgContent = msg.message as Record<string, unknown> | undefined;
        if (!msgContent) continue; // Protocol messages, reactions — skip silently

        const messageText: string =
          (msgContent.conversation as string) ||
          ((msgContent.extendedTextMessage as Record<string, unknown>)?.text as string) ||
          '';

        if (!messageText.trim()) continue; // Empty/media-only messages

        // Look up voter by phone number
        const matchedVoters = await searchVoters(phone);
        const voter = matchedVoters.find((v) => v.phone.replace(/\D/g, '') === phone);

        const voterId = voter?.id ?? null;
        const voterName = voter?.name ?? `+${phone}`;

        // Check if an active conversation already exists for this phone
        const existingConvs = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.voterPhone, phone),
              inArray(conversations.status, ['open', 'bot', 'waiting', 'assigned']),
            ),
          )
          .limit(1);

        const existingConv = existingConvs[0];

        if (existingConv) {
          await addMessage(existingConv.id, 'voter', messageText);
          console.log('[webhook] Stored inbound from', phone, 'on', instanceName, '→ conv', existingConv.id);
        } else {
          // Create a new conversation
          const newConv = await addConversation({
            voterId: voterId ?? undefined,
            voterName,
            voterPhone: phone,
            status: 'open',
            priority: 0,
          });
          await addMessage(newConv.id, 'voter', messageText);
          console.log('[webhook] Created conversation for', phone, 'on', instanceName, '→ conv', newConv.id);
        }
      } catch (err) {
        console.error('[webhook] messages.upsert error processing message:', err);
        // Continue processing remaining messages
      }
    }
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Webhook endpoint' });
}
