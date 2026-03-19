import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { conversations, campaigns, groupMessages } from '@/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
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
import { analyzeMessage, isGeminiConfigured } from '@/lib/gemini';
import { addCampaignDeliveryEvent } from '@/lib/db-campaigns';
import { restartInstance, sendText } from '@/lib/evolution';
import { loadConfig } from '@/lib/db-config';
import { logConsent, detectConsentKeyword, OPT_IN_CONFIRMATION, OPT_OUT_CONFIRMATION } from '@/lib/db-compliance';
import { syslogInfo, syslogWarn, syslogError } from '@/lib/system-logger';

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

  // Normalize event name — Evolution API may send uppercase (MESSAGES_UPSERT)
  // or lowercase with dots (messages.upsert). Normalize to lowercase+dots.
  const rawEvent = (body.event as string | undefined) ?? '';
  const event = rawEvent.toLowerCase().replace(/_/g, '.');
  const instanceName = body.instance as string | undefined;

  // Log every event type for diagnostics (rate-limited to non-connection events)
  if (event !== 'connection.update') {
    console.log('[webhook] event:', rawEvent, '→', event, '| instance:', instanceName);
  }

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
          // Logged out — must re-scan QR, cannot auto-recover
          await updateChipHealth(chip.id, { healthStatus: 'disconnected' });
          console.warn('[webhook] Chip', instanceName, 'logged out (statusReason 401) — QR re-scan required');
          syslogWarn('webhook', `Chip ${instanceName} desconectado — QR re-scan necessário`, { instance: instanceName, statusReason: 401 });

        } else if (statusReason === 403) {
          // Banned by WhatsApp — permanent, number is unusable
          await updateChipHealth(chip.id, { healthStatus: 'banned', bannedAt: new Date() });
          await updateChip(chip.id, { status: 'disconnected', enabled: false });
          console.error('[webhook] Chip', instanceName, 'BANNED (statusReason 403)');
          syslogError('webhook', `Chip ${instanceName} BANIDO pelo WhatsApp`, { instance: instanceName, statusReason: 403 });

        } else if (statusReason === 405) {
          // Already logged in on another device — mark disconnected
          await updateChipHealth(chip.id, { healthStatus: 'disconnected' });
          console.warn('[webhook] Chip', instanceName, 'connected on another device (statusReason 405)');
          syslogWarn('webhook', `Chip ${instanceName} conectado em outro dispositivo`, { instance: instanceName, statusReason: 405 });

        } else if ([408, 428, 500, 515].includes(statusReason ?? -1)) {
          // Transient errors — safe to auto-restart
          console.warn('[webhook] Chip', instanceName, 'transient error (statusReason', statusReason, ') — auto-restarting');
          await updateChipHealth(chip.id, { healthStatus: 'degraded', errorCount: (chip.errorCount ?? 0) + 1 });
          syslogWarn('webhook', `Chip ${instanceName} erro transitório — reiniciando automaticamente`, { instance: instanceName, statusReason });
          try {
            const config = await loadConfig();
            if (config?.evolutionApiUrl && config.evolutionApiKey) {
              // Restart after a short delay to let Evolution settle
              setTimeout(() => {
                void restartInstance(config.evolutionApiUrl, config.evolutionApiKey, chip.instanceName ?? instanceName ?? '');
              }, 3000);
            }
          } catch (restartErr) {
            console.error('[webhook] Auto-restart failed for', instanceName, ':', restartErr);
            syslogError('webhook', `Falha ao reiniciar chip ${instanceName}`, { instance: instanceName, error: String(restartErr) });
          }

        } else if (state === 'open') {
          // Healthy connection established (or re-established)
          await updateChipHealth(chip.id, { healthStatus: 'healthy', errorCount: 0 });
          console.log('[webhook] Chip', instanceName, 'connected and healthy');
          syslogInfo('webhook', `Chip ${instanceName} conectado e saudável`, { instance: instanceName });
        }

        console.log('[webhook] connection.update for', instanceName, '→', newStatus, 'statusReason:', statusReason ?? 'none');
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

        // Only handle inbound (not sent by us).
        // Use strict === true to avoid skipping messages where fromMe is undefined.
        if (key.fromMe === true) continue;

        const remoteJid = key.remoteJid as string | undefined;
        if (!remoteJid) continue;

        const msgId = key.id as string | undefined;

        // Extract message text early (needed for both group and 1:1 paths)
        const msgContent = msg.message as Record<string, unknown> | undefined;
        if (!msgContent) continue;
        const groupMsgText: string =
          (msgContent.conversation as string) ||
          ((msgContent.extendedTextMessage as Record<string, unknown>)?.text as string) ||
          '';

        // ─── Group messages — store + Gemini analysis ─────────────────────────
        if (remoteJid.includes('@g.us')) {
          if (!groupMsgText.trim()) continue;
          try {
            const group = await getGroupByJid(remoteJid);
            if (!group) continue; // Unknown group — skip

            // Extract sender from participant field (group messages carry this)
            const participantJid = (msg.participant as string | undefined) ?? '';
            const senderPhone = participantJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');

            // Look up sender name via voter DB
            let senderName: string | null = null;
            if (senderPhone) {
              const normalizedSender = normalizePhone(senderPhone);
              if (normalizedSender) {
                const matchedVoters = await searchVoters(normalizedSender);
                const voter = matchedVoters.find((v) => v.phone === normalizedSender);
                if (voter) senderName = voter.name;
              }
            }

            // Persist message
            const [savedMsg] = await db.insert(groupMessages).values({
              groupId: group.id,
              groupJid: remoteJid,
              senderJid: participantJid || null,
              senderName: senderName ?? (senderPhone ? `+${senderPhone}` : null),
              text: groupMsgText,
              fromMe: false,
              evolutionMessageId: msgId ?? null,
            }).returning();

            // Gemini analysis (non-blocking — fire and forget)
            if (isGeminiConfigured() && savedMsg) {
              void (async () => {
                try {
                  const analysis = await analyzeMessage(groupMsgText, {
                    voterName: senderName ?? undefined,
                    campaignContext: `Grupo WhatsApp: ${group.name}`,
                  });

                  if (analysis) {
                    // Detect alert conditions
                    let aiAlert: string | null = null;
                    if (analysis.sentiment === 'negative') {
                      aiAlert = `Mensagem negativa: "${groupMsgText.slice(0, 80)}"`;
                    }
                    if (/\b(sair|saio|bloqueio|denunci[ao]|spam|golpe|fraude|ódio|racis)\b/i.test(groupMsgText)) {
                      aiAlert = `Possível problema detectado: "${groupMsgText.slice(0, 80)}"`;
                    }

                    await db.update(groupMessages)
                      .set({
                        aiSentiment: analysis.sentiment,
                        aiIntent: analysis.intent,
                        aiSuggestedTags: analysis.suggestedTags,
                        aiSummary: analysis.summary,
                        aiAlert,
                      })
                      .where(eq(groupMessages.id, savedMsg.id));

                    if (aiAlert) {
                      console.warn('[webhook] Group alert on', group.name, ':', aiAlert);
                    }
                  }
                } catch (aiErr) {
                  console.error('[webhook] Group Gemini analysis error:', aiErr);
                }
              })();
            }
          } catch (groupErr) {
            console.error('[webhook] Group message processing error:', groupErr);
          }
          continue;
        }

        // ── 1:1 conversation path below ────────────────────────────────────────
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

        // Message text was already extracted above (groupMsgText)
        // Reuse for 1:1 path
        const messageText = groupMsgText;
        if (!messageText.trim()) continue; // Empty/media-only messages

        // Look up voter by phone number (already normalized)
        const matchedVoters = await searchVoters(phone);
        const voter = matchedVoters.find((v) => v.phone === phone);

        const voterId = voter?.id ?? null;
        const voterName = voter?.name ?? `+${phone}`;

        // Check if an active conversation already exists for this phone
        // ORDER BY last_message_at DESC so we always pick the most recent active conversation
        // when multiple exist for the same number (avoids routing to stale/old conversations)
        const existingConvs = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.voterPhone, phone),
              inArray(conversations.status, ['open', 'bot', 'waiting', 'assigned']),
            ),
          )
          .orderBy(desc(conversations.lastMessageAt))
          .limit(1);

        const existingConv = existingConvs[0];
        let conversationId: string | undefined;

        if (existingConv) {
          await addMessage(existingConv.id, 'voter', messageText);
          conversationId = existingConv.id;
          console.log('[webhook] Stored inbound from', phone, 'on', instanceName, '→ conv', existingConv.id);
          syslogInfo('webhook', `Mensagem recebida de ${voterName}`, { phone, instance: instanceName, conversationId: existingConv.id, messageLength: messageText.length });
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
          syslogInfo('webhook', `Nova conversa iniciada com ${voterName}`, { phone, instance: instanceName, conversationId: newConv.id });
        }

        // ─── Reply correlation (Phase 17 + Phase 21-02) ───────────────────────────
        // Check if this sender has a recent message from an active campaign
        try {
          const recentMessage = await findRecentMessageToPhone(phone, 7);
          if (recentMessage?.campaignId) {
            const recordResult = await recordReply(
              recentMessage.campaignId, 
              phone, 
              voterId ?? undefined
            );
            if (recordResult.updated) {
              console.log('[webhook] Recorded reply for campaign', recentMessage.campaignId, 'from', phone);
              
              // Log campaign reply event for tracking
              try {
                await addCampaignDeliveryEvent({
                  campaignId: recentMessage.campaignId,
                  chipId: null,
                  voterId: voterId ?? null,
                  voterPhone: phone,
                  eventType: 'reply_received',
                  message: `Resposta recebida de ${voterName}`,
                  metadata: {
                    conversationId,
                    messageLength: messageText.length,
                  },
                });
              } catch (eventErr) {
                console.error('[webhook] Failed to log reply event:', eventErr);
              }
            }
          }
        } catch (replyErr) {
          console.error('[webhook] Reply correlation error:', replyErr);
        }

        // ─── Opt-in/out keyword detection (Phase 31) ────────────────────────────
        if (voterId) {
          const consentAction = detectConsentKeyword(messageText);
          if (consentAction) {
            try {
              await logConsent(voterId, consentAction, 'whatsapp', `Keyword: "${messageText.trim().substring(0, 50)}"`);
              console.log('[webhook] Consent recorded:', consentAction, 'for voter', voterId);
              syslogInfo('webhook', `Consentimento registrado: ${consentAction === 'opt_in' ? 'opt-in' : 'opt-out'} para ${voterName}`, { voterId, phone, action: consentAction });

              // Send confirmation reply via WhatsApp
              try {
                const config = await loadConfig();
                if (config?.evolutionApiUrl && config.evolutionApiKey && instanceName) {
                  const confirmationText = consentAction === 'opt_in'
                    ? OPT_IN_CONFIRMATION
                    : OPT_OUT_CONFIRMATION;
                  await sendText(
                    config.evolutionApiUrl,
                    config.evolutionApiKey,
                    instanceName,
                    phone,
                    confirmationText,
                    { delay: 2000 },
                  );
                  console.log('[webhook] Sent consent confirmation to', phone);
                }
              } catch (replyErr) {
                console.error('[webhook] Failed to send consent confirmation:', replyErr);
              }
            } catch (consentErr) {
              console.error('[webhook] Consent logging error:', consentErr);
            }
          }
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
            syslogWarn('webhook', `Grupo "${group.name}" próximo da capacidade máxima (${Math.round(newSize / group.maxSize * 100)}%)`, { groupId: group.id, groupJid, currentSize: newSize, maxSize: group.maxSize });
          }
          
          // Log if full
          if (newStatus === 'full') {
            console.warn('[webhook] Group', group.name, 'is now FULL at', newSize, 'members');
            syslogWarn('webhook', `Grupo "${group.name}" está CHEIO (${newSize} membros)`, { groupId: group.id, groupJid, size: newSize });
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
                    syslogInfo('webhook', `Entrada em grupo registrada para campanha`, { campaignId: group.campaignId, phone: normalizedPhone, groupJid });
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
