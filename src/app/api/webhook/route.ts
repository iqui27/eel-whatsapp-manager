import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { conversations } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { loadChips, updateChip, updateChipHealth } from '@/lib/db-chips';
import { addConversation, addMessage } from '@/lib/db-conversations';
import { searchVoters } from '@/lib/db-voters';
import { normalizePhone } from '@/lib/phone';
import { getGroupByJid, updateGroupSize } from '@/lib/db-groups';
import { 
  updateMessageDeliveryStatus, 
  findRecentMessageToPhone, 
  recordReply,
  recordGroupJoin 
} from '@/lib/conversion-tracking';
import { triggerAnalysis, applyAutoTags } from '@/lib/ai-analysis';
import { isGeminiConfigured } from '@/lib/gemini';

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

  // ─── Track lastWebhookEvent on EVERY event for health monitoring ────────────
  if (instanceName) {
    try {
      const chips = await loadChips();
      const chip = chips.find(
        (c) => c.name === instanceName || c.instanceName === instanceName,
      );
      if (chip) {
        await updateChipHealth(chip.id, { lastWebhookEvent: new Date() });
      }
    } catch (err) {
      console.error('[webhook] Failed to update lastWebhookEvent:', err);
    }
  }

  // ─── connection.update — keep chip status in sync ───────────────────────────
  if (event === 'connection.update') {
    try {
      const chips = await loadChips();
      const chip = chips.find(
        (c) => c.name === instanceName || c.instanceName === instanceName,
      );

      if (chip) {
        const data = body.data as Record<string, unknown> | undefined;
        const state = data?.state as string | undefined;
        const statusReason = data?.statusReason as number | undefined;

        const newStatus: 'connected' | 'disconnected' =
          state === 'open' ? 'connected' : 'disconnected';

        // Update legacy status field (backward compat)
        await updateChip(chip.id, { status: newStatus });

        // Handle statusReason codes for health monitoring
        if (statusReason === 401) {
          // Logged out — mark disconnected, user must rescan QR
          await updateChipHealth(chip.id, { healthStatus: 'disconnected' });
          console.warn('[webhook] Chip', instanceName, 'logged out (statusReason 401)');
        } else if (statusReason === 408 || statusReason === 515) {
          // Timeout (408) or restart needed (515) — cron will handle restart
          // Just update status, don't block webhook response
          console.warn('[webhook] Chip', instanceName, 'needs restart (statusReason', statusReason, ')');
        } else if (state === 'open') {
          // Healthy connection established
          await updateChipHealth(chip.id, { healthStatus: 'healthy', errorCount: 0 });
        }

        console.log('[webhook] connection.update for', instanceName, '→', newStatus, 'statusReason:', statusReason);
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

        // Extract clean phone number (strip @s.whatsapp.net) and normalize
        const rawPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
        if (!rawPhone) continue;
        
        // Normalize to E.164 format for database lookup
        const phone = normalizePhone(rawPhone);
        if (!phone) continue;

        // Extract message text
        const msgContent = msg.message as Record<string, unknown> | undefined;
        if (!msgContent) continue; // Protocol messages, reactions — skip silently

        const messageText: string =
          (msgContent.conversation as string) ||
          ((msgContent.extendedTextMessage as Record<string, unknown>)?.text as string) ||
          '';

        if (!messageText.trim()) continue; // Empty/media-only messages

        // Look up voter by phone number (already normalized)
        const matchedVoters = await searchVoters(phone);
        const voter = matchedVoters.find((v) => v.phone === phone);

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
        let conversationId: string | undefined;

        if (existingConv) {
          await addMessage(existingConv.id, 'voter', messageText);
          conversationId = existingConv.id;
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
          conversationId = newConv.id;
          console.log('[webhook] Created conversation for', phone, 'on', instanceName, '→ conv', newConv.id);
        }

        // ─── Reply correlation (Phase 17) ───────────────────────────────────────
        // Check if this sender has a recent message from an active campaign
        try {
          const recentMessage = await findRecentMessageToPhone(phone, 7);
          if (recentMessage?.campaignId) {
            const result = await recordReply(
              recentMessage.campaignId, 
              phone, 
              voterId ?? undefined
            );
            if (result.updated) {
              console.log('[webhook] Recorded reply for campaign', recentMessage.campaignId, 'from', phone);
            }
          }
        } catch (replyErr) {
          console.error('[webhook] Reply correlation error:', replyErr);
        }

        // ─── AI Analysis (Phase 18) ───────────────────────────────────────────
        // Trigger Gemini analysis for inbound message
        if (isGeminiConfigured()) {
          try {
            const aiResult = await triggerAnalysis(phone, messageText, {
              conversationId,
              voterId: voterId ?? undefined,
              voterName,
              voterTags: voter?.tags ?? undefined,
            });

            if (aiResult?.analysis) {
              console.log('[webhook] AI analysis for', phone, ':', 
                aiResult.analysis.sentiment, aiResult.analysis.intent);
              
              // Auto-apply suggested tags if enabled
              if (voterId && aiResult.analysis.suggestedTags.length > 0) {
                const autoTagEnabled = process.env.AI_AUTO_TAG !== 'false';
                if (autoTagEnabled) {
                  await applyAutoTags(voterId, aiResult.analysis.suggestedTags);
                }
              }
            }
          } catch (aiErr) {
            console.error('[webhook] AI analysis error:', aiErr);
            // Don't fail the webhook for AI errors
          }
        }
      } catch (err) {
        console.error('[webhook] messages.upsert error processing message:', err);
        // Continue processing remaining messages
      }
    }
  }

  // ─── messages.update — delivery status tracking (Phase 17) ───────────────────
  if (event === 'messages.update') {
    const updates = (body.data as unknown[]) ?? [];
    console.log('[webhook] messages.update received:', updates.length, 'update(s) on instance', instanceName);

    for (const rawUpdate of updates) {
      const update = rawUpdate as Record<string, unknown>;
      
      try {
        const key = update.key as Record<string, unknown> | undefined;
        const status = update.status as number | undefined;
        
        if (!key || status === undefined) continue;

        const msgId = key.id as string | undefined;
        const remoteJid = key.remoteJid as string | undefined;

        if (!msgId) continue;

        // Evolution API status codes:
        // 0 = error, 1 = pending, 2 = server_ack (sent), 3 = delivered, 4 = read, 5 = played
        let deliveryStatus: 'delivered' | 'read' | 'failed' | null = null;
        let failReason: string | undefined;

        if (status === 0) {
          deliveryStatus = 'failed';
          failReason = (update.error as string) || 'Unknown error';
        } else if (status === 3) {
          deliveryStatus = 'delivered';
        } else if (status === 4 || status === 5) {
          deliveryStatus = 'read';
        }

        if (deliveryStatus && remoteJid) {
          // The evolutionMessageId is the message key ID
          const result = await updateMessageDeliveryStatus(msgId, deliveryStatus, failReason);
          if (result.updated) {
            console.log('[webhook] Updated message', msgId, '→', deliveryStatus, 'campaign:', result.campaignId);
          }
        }
      } catch (updateErr) {
        console.error('[webhook] messages.update error processing update:', updateErr);
      }
    }
  }

  // ─── group_participants.update — group management + conversion tracking ─────
  if (event === 'group_participants.update') {
    try {
      const data = body.data as Record<string, unknown> | undefined;
      const groupJid = data?.id as string | undefined;
      const action = data?.action as string | undefined;
      const participants = (data?.participants as string[]) ?? [];

      console.log('[webhook] group_participants.update for', groupJid, 'action:', action, 'participants:', participants.length);

      if (groupJid && action) {
        // Look up group in database
        const group = await getGroupByJid(groupJid);
        
        if (group) {
          // Calculate size change based on action
          let sizeDelta = 0;
          
          if (action === 'add') {
            sizeDelta = participants.length;
          } else if (action === 'remove') {
            sizeDelta = -participants.length;
          }
          
          // Update group size
          const newSize = Math.max(0, group.currentSize + sizeDelta);
          const newStatus = newSize >= group.maxSize ? 'full' : 'active';
          
          await updateGroupSize(group.id, newSize, newStatus);
          
          console.log('[webhook] Updated group', group.name, 'size:', group.currentSize, '→', newSize, 'status:', newStatus);
          
          // Log warning if near capacity
          if (newSize >= group.maxSize * 0.9 && newSize < group.maxSize) {
            console.warn('[webhook] Group', group.name, 'at', Math.round(newSize / group.maxSize * 100), '% capacity - overflow recommended');
          }
          
          // Log if full
          if (newStatus === 'full') {
            console.warn('[webhook] Group', group.name, 'is now FULL at', newSize, 'members');
          }

          // ─── Group join conversion tracking (Phase 17) ─────────────────────────
          if (action === 'add' && group.campaignId && participants.length > 0) {
            for (const participantJid of participants) {
              try {
                // Extract phone from participant JID
                const participantPhone = participantJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
                const normalizedPhone = normalizePhone(participantPhone);
                
                if (normalizedPhone) {
                  const result = await recordGroupJoin(
                    group.campaignId,
                    normalizedPhone,
                    groupJid
                  );
                  if (result.updated) {
                    console.log('[webhook] Recorded group join for campaign', group.campaignId, 'from', normalizedPhone);
                  }
                }
              } catch (joinErr) {
                console.error('[webhook] Group join tracking error:', joinErr);
              }
            }
          }
        } else {
          console.log('[webhook] Group', groupJid, 'not found in database - sync needed');
        }
      }
    } catch (err) {
      console.error('[webhook] group_participants.update error:', err);
    }
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Webhook endpoint' });
}
