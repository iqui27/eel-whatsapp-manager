import { db } from '@/db';
import { voters, segments, type Campaign, type Voter } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { addCampaignDeliveryEvent, getCampaign, updateCampaign } from '@/lib/db-campaigns';
import { loadConfig } from '@/lib/db-config';
import {
  buildCampaignRuntimeContext,
  getTemplateValidationMessage,
  resolveCampaignTemplate,
  validateCampaignTemplates,
} from '@/lib/campaign-variables';
import { getSegmentVoterIds } from '@/lib/db-segments';
import { getGroupForSegment } from '@/lib/db-groups';
import { getHealthyChips } from '@/lib/db-chips';
import { sendText } from '@/lib/evolution';

type DeliveryError = Error & { status?: number };

type ExecuteCampaignSendOptions = {
  campaignId: string;
  requestedChipId?: string | null;
  skipScheduleGuard?: boolean;
};

type ExecuteCampaignSendResult = {
  campaignId: string;
  audience: number;
  sent: number;
  delivered: number;
  failed: number;
  chipId: string | null;
  chipInstanceName: string;
  status: Campaign['status'];
};

function createDeliveryError(message: string, status: number): DeliveryError {
  const error = new Error(message) as DeliveryError;
  error.status = status;
  return error;
}

function normalizePhone(phone: string | null | undefined) {
  return phone?.replace(/\D/g, '') ?? '';
}

function resolveExecutionDate(campaign: Campaign, skipScheduleGuard: boolean) {
  if (skipScheduleGuard && campaign.scheduledAt) {
    return campaign.scheduledAt;
  }

  return new Date();
}

function resolveRuntimeTemplate(
  template: string,
  voter: Voter,
  candidateProfile: NonNullable<Awaited<ReturnType<typeof loadConfig>>>,
  executionDate: Date,
  groupInviteLink?: string,
) {
  return resolveCampaignTemplate(
    template,
    buildCampaignRuntimeContext({
      candidateProfile,
      voter,
      scheduledAt: executionDate,
      now: executionDate,
      groupInviteLink,
    }),
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function resolveExecutionContext(
  campaignId: string,
  requestedChipId?: string | null,
  skipScheduleGuard = false,
) {
  const campaign = await getCampaign(campaignId);
  if (!campaign) {
    throw createDeliveryError('Campaign not found', 404);
  }

  if (!campaign.segmentId) {
    throw createDeliveryError('Campanha sem segmento definido', 400);
  }

  if (!skipScheduleGuard && campaign.scheduledAt && new Date(campaign.scheduledAt) > new Date()) {
    throw createDeliveryError(
      `Campanha agendada para ${new Date(campaign.scheduledAt).toISOString()}`,
      400,
    );
  }

  const config = await loadConfig();
  if (!config) {
    throw createDeliveryError('Sistema não configurado', 400);
  }

  const voterIds = await getSegmentVoterIds(campaign.segmentId);
  if (voterIds.length === 0) {
    throw createDeliveryError('Segmento sem eleitores para envio', 400);
  }

  // Resolve group invite link if template uses {link_grupo}
  let groupInviteLink = '';
  if (campaign.template.includes('{link_grupo}')) {
    const [segment] = await db.select().from(segments).where(eq(segments.id, campaign.segmentId)).limit(1);
    const segmentTag = segment?.segmentTag ?? null;
    if (segmentTag) {
      const group = await getGroupForSegment(segmentTag);
      groupInviteLink = group?.inviteUrl ?? '';
    }
  }

  const segmentVoters = await db
    .select()
    .from(voters)
    .where(inArray(voters.id, voterIds));

  // Use healthStatus-based lookup (covers chips where legacy status field is stale)
  const connectedChips = await getHealthyChips();

  const preferredChipId = requestedChipId ?? campaign.chipId ?? null;
  const selectedChip = (
    preferredChipId
      ? connectedChips.find((chip) =>
        chip.id === preferredChipId
        || chip.instanceName === preferredChipId
        || chip.name === preferredChipId)
      : undefined
  ) ?? connectedChips[0] ?? null;

  // Resolve the Evolution API instance name.
  // When a chip is explicitly found, use its instanceName/name only — never fall back to
  // config.instanceName, which would silently send via the wrong phone.
  let chipInstanceName: string;
  if (selectedChip) {
    const chipInstance = selectedChip.instanceName || selectedChip.name;
    if (!chipInstance) {
      throw createDeliveryError(
        `Chip selecionado não tem instanceName configurado. Configure o nome da instância Evolution API para este chip.`,
        400,
      );
    }
    chipInstanceName = chipInstance;
  } else if (config.instanceName) {
    chipInstanceName = config.instanceName;
  } else {
    throw createDeliveryError('Nenhum chip conectado disponível', 400);
  }

  return {
    campaign,
    config,
    segmentVoters,
    selectedChip,
    chipInstanceName,
    groupInviteLink,
  };
}

export function getDeliveryErrorStatus(error: unknown, fallbackStatus = 500) {
  if (typeof error === 'object' && error && 'status' in error && typeof error.status === 'number') {
    return error.status;
  }
  return fallbackStatus;
}

export async function executeCampaignSend({
  campaignId,
  requestedChipId,
  skipScheduleGuard = false,
}: ExecuteCampaignSendOptions): Promise<ExecuteCampaignSendResult> {
  const {
    campaign,
    config,
    segmentVoters,
    selectedChip,
    chipInstanceName,
    groupInviteLink,
  } = await resolveExecutionContext(campaignId, requestedChipId, skipScheduleGuard);

  const audience = segmentVoters.length;
  const activeChipId = selectedChip?.id ?? campaign.chipId ?? null;
  const executionDate = resolveExecutionDate(campaign, skipScheduleGuard);
  const validation = validateCampaignTemplates(
    [
      campaign.template,
      campaign.abEnabled ? campaign.abVariantB ?? '' : '',
    ],
    {
      candidateProfile: config,
      hasVoterData: true,
    },
  );
  const validationMessage = getTemplateValidationMessage(validation);

  if (validationMessage) {
    throw createDeliveryError(validationMessage, 400);
  }

  await updateCampaign(campaignId, {
    status: 'sending',
    totalSent: audience,
    totalDelivered: 0,
    totalFailed: 0,
    totalReplied: 0,
    updatedAt: new Date(),
  });

  await addCampaignDeliveryEvent({
    campaignId,
    chipId: activeChipId,
    eventType: 'send_started',
    message: `Envio iniciado com ${chipInstanceName}`,
    metadata: {
      audience,
      chipName: selectedChip?.name ?? null,
      chipInstanceName,
      executionDate: executionDate.toISOString(),
    },
  });

  let delivered = 0;
  let failed = 0;

  try {
    for (const voter of segmentVoters) {
      const phone = normalizePhone(voter.phone);
      const text = resolveRuntimeTemplate(campaign.template, voter, config, executionDate, groupInviteLink);

      if (!phone) {
        failed += 1;
        await addCampaignDeliveryEvent({
          campaignId,
          chipId: activeChipId,
          voterId: voter.id,
          voterPhone: voter.phone,
          eventType: 'message_failed',
          message: `Falha ao enviar para ${voter.name}: telefone inválido`,
          metadata: {
            reason: 'invalid_phone',
          },
        });
        continue;
      }

      if (!text.trim()) {
        failed += 1;
        await addCampaignDeliveryEvent({
          campaignId,
          chipId: activeChipId,
          voterId: voter.id,
          voterPhone: voter.phone,
          eventType: 'message_failed',
          message: `Falha ao enviar para ${voter.name}: mensagem vazia após interpolação`,
          metadata: {
            reason: 'empty_message',
          },
        });
        continue;
      }

      try {
        await sendText(
          config.evolutionApiUrl,
          config.evolutionApiKey,
          chipInstanceName,
          phone,
          text,
        );

        delivered += 1;
        await addCampaignDeliveryEvent({
          campaignId,
          chipId: activeChipId,
          voterId: voter.id,
          voterPhone: voter.phone,
          eventType: 'message_sent',
          message: `Mensagem enviada para ${voter.name} (${phone})`,
          metadata: {
            chipName: selectedChip?.name ?? null,
            chipInstanceName,
          },
        });
      } catch (error) {
        failed += 1;
        await addCampaignDeliveryEvent({
          campaignId,
          chipId: activeChipId,
          voterId: voter.id,
          voterPhone: voter.phone,
          eventType: 'message_failed',
          message: `Falha ao enviar para ${voter.name} (${phone})`,
          metadata: {
            error: error instanceof Error ? error.message : String(error),
            chipName: selectedChip?.name ?? null,
            chipInstanceName,
          },
        });
      }

      await sleep(150);
    }

    await updateCampaign(campaignId, {
      status: 'sent',
      totalSent: audience,
      totalDelivered: delivered,
      totalFailed: failed,
      updatedAt: new Date(),
    });

    await addCampaignDeliveryEvent({
      campaignId,
      chipId: activeChipId,
      eventType: 'send_completed',
      message: `Envio concluído: ${delivered} entregas, ${failed} falhas`,
      metadata: {
        audience,
        delivered,
        failed,
        chipName: selectedChip?.name ?? null,
        chipInstanceName,
      },
    });

    return {
      campaignId,
      audience,
      sent: audience,
      delivered,
      failed,
      chipId: activeChipId,
      chipInstanceName,
      status: 'sent',
    };
  } catch (error) {
    await updateCampaign(campaignId, {
      status: skipScheduleGuard ? 'paused' : 'cancelled',
      totalSent: audience,
      totalDelivered: delivered,
      totalFailed: failed,
      updatedAt: new Date(),
    });

    await addCampaignDeliveryEvent({
      campaignId,
      chipId: activeChipId,
      eventType: 'send_failed',
      message: 'Envio interrompido por falha inesperada',
      metadata: {
        delivered,
        failed,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
}
