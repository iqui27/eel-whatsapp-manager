'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Calendar,
  Users,
  Send,
  AlertTriangle,
  CalendarCheck,
  Cpu,
} from 'lucide-react';
import type { Campaign, Chip, Config, Segment } from '@/db';
import {
  buildCampaignPreviewContext,
  getTemplateValidationMessage,
  isCandidateProfileConfigured,
  resolveCampaignTemplate,
  type CandidateProfileContext,
  validateCampaignTemplates,
} from '@/lib/campaign-variables';
import { SendConfigPanel, DEFAULT_SEND_CONFIG, type SendConfigValue } from '@/components/SendConfigPanel';

const EMPTY_CANDIDATE_PROFILE: CandidateProfileContext = {
  candidateDisplayName: '',
  candidateOffice: '',
  candidateParty: '',
  candidateRegion: '',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgendarCampanhaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [segment, setSegment] = useState<Segment | null>(null);
  const [allChips, setAllChips] = useState<Chip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Scheduling state
  const today = new Date().toISOString().split('T')[0];
  const [scheduleDate, setScheduleDate] = useState(today);
  const [selectedChipId, setSelectedChipId] = useState('auto');
  const [sendConfig, setSendConfig] = useState<SendConfigValue>(DEFAULT_SEND_CONFIG);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfileContext>(EMPTY_CANDIDATE_PROFILE);

  const loadCampaign = useCallback(async () => {
    try {
      const [campaignRes, chipsRes, settingsRes] = await Promise.all([
        fetch(`/api/campaigns?id=${params.id}`),
        fetch('/api/chips'),
        fetch('/api/settings'),
      ]);

      if (campaignRes.status === 401 || chipsRes.status === 401 || settingsRes.status === 401) {
        router.push('/login');
        return;
      }

      if (chipsRes.ok) {
        const chips: Chip[] = await chipsRes.json();
        setAllChips(chips);
      }

      if (settingsRes.ok) {
        const settings: Partial<Config> = await settingsRes.json();
        setCandidateProfile({
          candidateDisplayName: settings.candidateDisplayName ?? '',
          candidateOffice: settings.candidateOffice ?? '',
          candidateParty: settings.candidateParty ?? '',
          candidateRegion: settings.candidateRegion ?? '',
        });
      }

      if (campaignRes.ok) {
        const data: Campaign[] = await campaignRes.json();
        const c = data.find((item) => item.id === params.id) ?? data[0];
        if (c) {
          setCampaign(c);
          setSelectedChipId(c.chipId ?? 'auto');
          // Restore send config from campaign DB values
          setSendConfig({
            sendRate: (c.sendRate as SendConfigValue['sendRate']) ?? DEFAULT_SEND_CONFIG.sendRate,
            batchSize: c.batchSize ?? DEFAULT_SEND_CONFIG.batchSize,
            minDelayMs: c.minDelayMs ?? DEFAULT_SEND_CONFIG.minDelayMs,
            maxDelayMs: c.maxDelayMs ?? DEFAULT_SEND_CONFIG.maxDelayMs,
            typingDelayMin: c.typingDelayMin ?? DEFAULT_SEND_CONFIG.typingDelayMin,
            typingDelayMax: c.typingDelayMax ?? DEFAULT_SEND_CONFIG.typingDelayMax,
            maxDailyPerChip: c.maxDailyPerChip ?? DEFAULT_SEND_CONFIG.maxDailyPerChip,
            maxHourlyPerChip: c.maxHourlyPerChip ?? DEFAULT_SEND_CONFIG.maxHourlyPerChip,
            pauseOnChipDegraded: c.pauseOnChipDegraded ?? DEFAULT_SEND_CONFIG.pauseOnChipDegraded,
            selectedChipIds: c.selectedChipIds ?? DEFAULT_SEND_CONFIG.selectedChipIds,
            chipStrategy: (c.chipStrategy as SendConfigValue['chipStrategy']) ?? DEFAULT_SEND_CONFIG.chipStrategy,
            restPauseEvery: c.restPauseEvery ?? DEFAULT_SEND_CONFIG.restPauseEvery,
            restPauseDurationMs: c.restPauseDurationMs ?? DEFAULT_SEND_CONFIG.restPauseDurationMs,
            longBreakEvery: c.longBreakEvery ?? DEFAULT_SEND_CONFIG.longBreakEvery,
            longBreakDurationMs: c.longBreakDurationMs ?? DEFAULT_SEND_CONFIG.longBreakDurationMs,
            circuitBreakerThreshold: c.circuitBreakerThreshold ?? DEFAULT_SEND_CONFIG.circuitBreakerThreshold,
            windowStart: c.windowStart ?? DEFAULT_SEND_CONFIG.windowStart,
            windowEnd: c.windowEnd ?? DEFAULT_SEND_CONFIG.windowEnd,
          });
          if (c.segmentId) {
            const sres = await fetch(`/api/segments?id=${c.segmentId}`);
            if (sres.ok) {
              const segs: Segment[] = await sres.json();
              setSegment(segs.find((item) => item.id === c.segmentId) ?? null);
            }
          }
        }
      }
    } catch {
      /* silently fail */
    } finally {
      setIsLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => { loadCampaign(); }, [loadCampaign]);

  const scheduledAtPreview = scheduleDate
    ? new Date(`${scheduleDate}T08:00:00`)
    : null;
  const templateValidation = validateCampaignTemplates(
    [
      campaign?.template ?? '',
      campaign?.abEnabled ? campaign.abVariantB ?? '' : '',
    ],
    {
      candidateProfile,
      hasVoterData: true,
    },
  );
  const templateValidationMessage = getTemplateValidationMessage(templateValidation);
  const candidateProfileReady = isCandidateProfileConfigured(candidateProfile);
  const candidateVariableSelected = templateValidation.supportedVariables.includes('{candidato}');
  const previewContext = buildCampaignPreviewContext({
    candidateProfile,
    scheduledAt: scheduledAtPreview,
  });
  const previewMessage = campaign
    ? resolveCampaignTemplate(campaign.template ?? '', previewContext)
    : '';

  const handleSchedule = async () => {
    if (!campaign) return;

    if (templateValidationMessage) {
      toast.error(templateValidationMessage);
      return;
    }

    setIsSending(true);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${sendConfig.windowStart}:00`).toISOString();
      const patchRes = await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: campaign.id,
          scheduledAt,
          chipId: sendConfig.selectedChipIds?.[0] ?? (selectedChipId !== 'auto' ? selectedChipId : null),
          status: 'scheduled',
          variables: templateValidation.supportedVariables,
          // Persist send config
          sendRate: sendConfig.sendRate,
          batchSize: sendConfig.batchSize,
          minDelayMs: sendConfig.minDelayMs,
          maxDelayMs: sendConfig.maxDelayMs,
          typingDelayMin: sendConfig.typingDelayMin,
          typingDelayMax: sendConfig.typingDelayMax,
          maxDailyPerChip: sendConfig.maxDailyPerChip,
          maxHourlyPerChip: sendConfig.maxHourlyPerChip,
          pauseOnChipDegraded: sendConfig.pauseOnChipDegraded,
          selectedChipIds: sendConfig.selectedChipIds,
          chipStrategy: sendConfig.chipStrategy,
          restPauseEvery: sendConfig.restPauseEvery,
          restPauseDurationMs: sendConfig.restPauseDurationMs,
          longBreakEvery: sendConfig.longBreakEvery,
          longBreakDurationMs: sendConfig.longBreakDurationMs,
          circuitBreakerThreshold: sendConfig.circuitBreakerThreshold,
          windowStart: sendConfig.windowStart,
          windowEnd: sendConfig.windowEnd,
        }),
      });

      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}));
        toast.error(data?.error ?? 'Erro ao agendar campanha');
        return;
      }

      setCampaign((prev) => prev
        ? {
          ...prev,
          status: 'scheduled',
          scheduledAt: new Date(scheduledAt),
          chipId: selectedChipId !== 'auto' ? selectedChipId : null,
        }
        : prev);

      toast.success(`Campanha agendada para ${new Date(scheduledAt).toLocaleString('pt-BR')}`);
      setTimeout(() => router.push(`/campanhas/${campaign.id}/monitor`), 800);
    } catch {
      toast.error('Erro ao agendar campanha');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendNow = async () => {
    if (!campaign) return;

    if (templateValidationMessage) {
      toast.error(templateValidationMessage);
      return;
    }

    setIsSending(true);

    try {
      // Persist send config before sending
      await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: campaign.id,
          sendRate: sendConfig.sendRate,
          batchSize: sendConfig.batchSize,
          minDelayMs: sendConfig.minDelayMs,
          maxDelayMs: sendConfig.maxDelayMs,
          typingDelayMin: sendConfig.typingDelayMin,
          typingDelayMax: sendConfig.typingDelayMax,
          maxDailyPerChip: sendConfig.maxDailyPerChip,
          maxHourlyPerChip: sendConfig.maxHourlyPerChip,
          pauseOnChipDegraded: sendConfig.pauseOnChipDegraded,
          selectedChipIds: sendConfig.selectedChipIds,
          chipStrategy: sendConfig.chipStrategy,
          restPauseEvery: sendConfig.restPauseEvery,
          restPauseDurationMs: sendConfig.restPauseDurationMs,
          longBreakEvery: sendConfig.longBreakEvery,
          longBreakDurationMs: sendConfig.longBreakDurationMs,
          circuitBreakerThreshold: sendConfig.circuitBreakerThreshold,
          windowStart: sendConfig.windowStart,
          windowEnd: sendConfig.windowEnd,
          variables: templateValidation.supportedVariables,
        }),
      });

      // Prefer the chip selected in SendConfigPanel (selectedChipIds), fall back to legacy selectedChipId
      const resolvedChipId =
        sendConfig.selectedChipIds?.[0] ??
        (selectedChipId && selectedChipId !== 'auto' ? selectedChipId : null);
      const payload = resolvedChipId ? { chipId: resolvedChipId } : {};
      const res = await fetch(`/api/campaigns/${campaign.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? 'Não foi possível iniciar o envio');
        return;
      }

      toast.success('Envio iniciado');
      router.push(`/campanhas/${campaign.id}/monitor`);
    } catch {
      toast.error('Erro ao iniciar envio');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <SidebarLayout currentPage="campanhas" pageTitle="Agendar Campanha">
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          Carregando campanha...
        </div>
      </SidebarLayout>
    );
  }

  if (!campaign) {
    return (
      <SidebarLayout currentPage="campanhas" pageTitle="Agendar Campanha">
        <div className="p-6 text-center text-muted-foreground">
          Campanha não encontrada.{' '}
          <Link href="/campanhas" className="text-primary underline">Voltar</Link>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="campanhas" pageTitle="Agendar Campanha">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Back nav */}
        <div className="flex items-center gap-2">
          <Link href={`/campanhas/${campaign.id}/editar`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao editor
            </Button>
          </Link>
        </div>

        {/* Campaign summary card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Resumo da Campanha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Campanha</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{campaign.name}</span>
                {campaign.status === 'scheduled' && campaign.scheduledAt && (
                  <Badge variant="secondary" className="text-xs">
                    Agendada para {new Date(campaign.scheduledAt).toLocaleString('pt-BR')}
                  </Badge>
                )}
              </div>
            </div>
            {segment ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Segmento
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{segment.name}</span>
                  {segment.audienceCount && (
                    <Badge variant="secondary" className="text-xs">
                      ~{segment.audienceCount} eleitores
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Segmento</span>
                <span className="text-xs text-muted-foreground italic">Nenhum selecionado</span>
              </div>
            )}
            {campaign.abEnabled && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Teste A/B</span>
                <Badge className="text-xs bg-purple-500/10 text-purple-600 border-purple-200">
                  A: {campaign.abSplitPercent}% · B: {100 - (campaign.abSplitPercent ?? 50)}%
                </Badge>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Variáveis usadas</span>
              <span className="text-right text-xs text-muted-foreground">
                {(campaign.variables?.length ? campaign.variables : templateValidation.supportedVariables).join(' · ') || 'Nenhuma'}
              </span>
            </div>
          </CardContent>
        </Card>

        {templateValidationMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Campanha precisa de ajuste antes do envio</p>
              <p className="text-xs text-amber-800/90">{templateValidationMessage}</p>
            </div>
          </div>
        )}

        {!candidateProfileReady && candidateVariableSelected && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
            Configure o perfil do candidato em <Link href="/settings" className="font-medium text-primary underline">Ajustes</Link> para usar <code className="font-mono text-[11px]">{'{candidato}'}</code> no envio real.
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prévia de resolução</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
              <p className="whitespace-pre-wrap">{previewMessage || 'A mensagem aparecerá aqui quando a campanha tiver conteúdo.'}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              A data da prévia acompanha o agendamento selecionado. No envio manual, <code className="font-mono text-[11px]">{'{data}'}</code> usa a data/hora real da execução.
            </p>
          </CardContent>
        </Card>

        {/* Date selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              Data de Envio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="date"
              min={today}
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </CardContent>
        </Card>

        {/* Send config panel — replaces decorative time windows and send rate */}
        <SendConfigPanel
          value={sendConfig}
          onChange={setSendConfig}
          allChips={allChips}
        />

        {/* Chip resolution indicator — shows exactly which chip will be used */}
        {(() => {
          const resolvedId = sendConfig.selectedChipIds?.[0] ?? (selectedChipId !== 'auto' ? selectedChipId : null);
          const chip = resolvedId ? allChips.find(c => c.id === resolvedId) : null;
          if (sendConfig.selectedChipIds && sendConfig.selectedChipIds.length > 1) {
            return (
              <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
                <Cpu className="h-4 w-4 shrink-0 text-blue-500" />
                <span>
                  <span className="font-medium">{sendConfig.selectedChipIds.length} chips selecionados</span>
                  {' '}— estratégia: {sendConfig.chipStrategy === 'round_robin' ? 'rotação' : sendConfig.chipStrategy === 'least_loaded' ? 'menos carregado' : 'afinidade'}.{' '}
                  O primeiro a enviar será <span className="font-medium">{allChips.find(c => c.id === sendConfig.selectedChipIds[0])?.name ?? sendConfig.selectedChipIds[0]}</span>.
                </span>
              </div>
            );
          }
          if (chip) {
            return (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
                <Cpu className="h-4 w-4 shrink-0 text-green-500" />
                <span>Chip selecionado: <span className="font-semibold">{chip.name}</span> ({chip.instanceName ?? chip.name})</span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <Cpu className="h-4 w-4 shrink-0 text-amber-500" />
              <span>Nenhum chip selecionado — será usado o <span className="font-medium">primeiro chip saudável disponível</span>. Selecione um chip acima para garantir o envio pelo chip correto.</span>
            </div>
          );
        })()}

        <Separator />

        {/* Action bar */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/campanhas">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Cancelar
            </Button>
          </Link>
          <Button
            onClick={handleSchedule}
            disabled={isSending || !scheduleDate || Boolean(templateValidationMessage)}
            className="min-w-[180px]"
          >
            {isSending ? 'Agendando...' : (
              <>
                <CalendarCheck className="mr-1.5 h-4 w-4" />
                Agendar campanha
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleSendNow}
            disabled={isSending || Boolean(templateValidationMessage)}
            className="min-w-[180px]"
          >
            <Send className="mr-1.5 h-4 w-4" />
            Enviar agora
          </Button>
        </div>
      </div>
    </SidebarLayout>
  );
}
