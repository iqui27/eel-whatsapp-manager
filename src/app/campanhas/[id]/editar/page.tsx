'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { calculateCtaScore, scoreBg } from '@/lib/cta-score';
import type { Campaign, Chip, Config, Segment } from '@/db';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FlaskConical,
  MessageSquare,
  Save,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import {
  buildCampaignPreviewContext,
  getTemplateValidationMessage,
  isCandidateProfileConfigured,
  resolveCampaignTemplate,
  SUPPORTED_CAMPAIGN_VARIABLES,
  type CandidateProfileContext,
  validateCampaignTemplates,
} from '@/lib/campaign-variables';
import { DEFAULT_SEND_CONFIG, type SendConfigValue } from '@/components/SendConfigPanel';
import { WhatsAppPreview } from '@/components/whatsapp-preview';
import { WhatsAppFormatToolbar } from '@/components/whatsapp-format-toolbar';

// Lazy-loaded heavy components for better initial bundle size
// GeminiMessageAssistant: ~617 lines, loads only when user interacts with AI button
const GeminiMessageAssistant = dynamic(
  () => import('@/components/gemini-message-assistant'),
  {
    loading: () => <Skeleton className="h-32 w-full" />,
    ssr: false,
  }
);

// SendConfigPanel: ~578 lines, deferred from initial load
const SendConfigPanel = dynamic(
  () => import('@/components/SendConfigPanel').then((mod) => mod.SendConfigPanel),
  {
    loading: () => <Skeleton className="h-96 w-full" />,
  }
);

const EMPTY_CANDIDATE_PROFILE: CandidateProfileContext = {
  candidateDisplayName: '',
  candidateOffice: '',
  candidateParty: '',
  candidateRegion: '',
};

function QualityChecks({ message }: { message: string }) {
  const result = calculateCtaScore(message);
  const { checks, score, wordCount } = result;

  const items = [
    { label: 'Tem chamada para ação clara', ok: checks.hasActionVerb },
    { label: 'Usa variável de nome ({nome})', ok: message.includes('{nome}') },
    { label: 'Abaixo de 120 palavras', ok: checks.underWordLimit },
    { label: 'Sem urgência excessiva (!!! ???)', ok: checks.noPunctSpam && checks.noAllCaps },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          CTA Score
        </span>
        <span className={cn('rounded-full border px-2.5 py-0.5 text-sm font-semibold', scoreBg(score))}>
          {score}/100
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            {item.ok ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            )}
            <span className={item.ok ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-1 text-xs text-muted-foreground">
        <span>{wordCount} palavras</span>
        <span
          className={cn(
            wordCount > 120 ? 'font-medium text-red-600' : wordCount > 80 ? 'text-amber-600' : 'text-green-600',
          )}
        >
          {wordCount > 120 ? `${wordCount - 120} acima do limite` : `${120 - wordCount} restantes`}
        </span>
      </div>
    </div>
  );
}

export default function EditarCampanhaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [campaignName, setCampaignName] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [message, setMessage] = useState('');
  const [abEnabled, setAbEnabled] = useState(false);
  const [variantB, setVariantB] = useState('');
  const [splitPct, setSplitPct] = useState(50);
  const [campaignStatus, setCampaignStatus] = useState<Campaign['status']>('draft');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [connectedChips, setConnectedChips] = useState<Chip[]>([]);
  const [allChips, setAllChips] = useState<Chip[]>([]);
  const [selectedChipId, setSelectedChipId] = useState('auto');
  const [sendConfig, setSendConfig] = useState<SendConfigValue>(DEFAULT_SEND_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfileContext>(EMPTY_CANDIDATE_PROFILE);
  const [selectedChipProfile, setSelectedChipProfile] = useState<{
    profileName?: string;
    profilePictureUrl?: string;
  } | null>(null);

  const isLocked = campaignStatus === 'sent' || campaignStatus === 'sending';

  const loadCampaign = useCallback(async () => {
    setIsLoading(true);
    setNotFound(false);

    try {
      const [campaignRes, segmentsRes, chipsRes, settingsRes] = await Promise.all([
        fetch(`/api/campaigns?id=${params.id}`),
        fetch('/api/segments'),
        fetch('/api/chips'),
        fetch('/api/settings'),
      ]);

      if (
        campaignRes.status === 401
        || segmentsRes.status === 401
        || chipsRes.status === 401
        || settingsRes.status === 401
      ) {
        router.push('/login');
        return;
      }

      if (segmentsRes.ok) {
        setSegments(await segmentsRes.json());
      }

      if (chipsRes.ok) {
        const chips: Chip[] = await chipsRes.json();
        setAllChips(chips);
        setConnectedChips(chips.filter((chip) => chip.status === 'connected'));
        // Set initial chip profile from first connected chip (will be updated by sendConfig effect)
        const firstConnected = chips.find((chip) => chip.status === 'connected');
        if (firstConnected) {
          setSelectedChipProfile({
            profileName: firstConnected.profileName ?? firstConnected.name,
            profilePictureUrl: firstConnected.profilePictureUrl ?? undefined,
          });
        }
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

      if (!campaignRes.ok) {
        if (campaignRes.status === 404) {
          setNotFound(true);
          return;
        }
        throw new Error('Erro ao carregar campanha');
      }

      const payload: Campaign[] | Campaign = await campaignRes.json();
      const campaign = Array.isArray(payload)
        ? payload.find((item) => item.id === params.id) ?? payload[0]
        : payload;

      if (!campaign) {
        setNotFound(true);
        return;
      }

      setCampaignName(campaign.name);
      setSegmentId(campaign.segmentId ?? '');
      setMessage(campaign.template ?? '');
      setAbEnabled(Boolean(campaign.abEnabled));
      setVariantB(campaign.abVariantB ?? '');
      setSplitPct(campaign.abSplitPercent ?? 50);
      setCampaignStatus(campaign.status ?? 'draft');
      setSelectedChipId(campaign.chipId ?? 'auto');
      // Restore date range from DB
      const toDateInput = (v: Date | string | null | undefined) => {
        if (!v) return '';
        const d = new Date(v);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
      };
      setStartDate(toDateInput(campaign.startDate));
      setEndDate(toDateInput(campaign.endDate));
      // Restore send config from DB
      setSendConfig({
        sendRate: (campaign.sendRate as SendConfigValue['sendRate']) ?? DEFAULT_SEND_CONFIG.sendRate,
        batchSize: campaign.batchSize ?? DEFAULT_SEND_CONFIG.batchSize,
        minDelayMs: campaign.minDelayMs ?? DEFAULT_SEND_CONFIG.minDelayMs,
        maxDelayMs: campaign.maxDelayMs ?? DEFAULT_SEND_CONFIG.maxDelayMs,
        typingDelayMin: campaign.typingDelayMin ?? DEFAULT_SEND_CONFIG.typingDelayMin,
        typingDelayMax: campaign.typingDelayMax ?? DEFAULT_SEND_CONFIG.typingDelayMax,
        maxDailyPerChip: campaign.maxDailyPerChip ?? DEFAULT_SEND_CONFIG.maxDailyPerChip,
        maxHourlyPerChip: campaign.maxHourlyPerChip ?? DEFAULT_SEND_CONFIG.maxHourlyPerChip,
        pauseOnChipDegraded: campaign.pauseOnChipDegraded ?? DEFAULT_SEND_CONFIG.pauseOnChipDegraded,
        selectedChipIds: campaign.selectedChipIds ?? DEFAULT_SEND_CONFIG.selectedChipIds,
        chipStrategy: (campaign.chipStrategy as SendConfigValue['chipStrategy']) ?? DEFAULT_SEND_CONFIG.chipStrategy,
        restPauseEvery: campaign.restPauseEvery ?? DEFAULT_SEND_CONFIG.restPauseEvery,
        restPauseDurationMs: campaign.restPauseDurationMs ?? DEFAULT_SEND_CONFIG.restPauseDurationMs,
        longBreakEvery: campaign.longBreakEvery ?? DEFAULT_SEND_CONFIG.longBreakEvery,
        longBreakDurationMs: campaign.longBreakDurationMs ?? DEFAULT_SEND_CONFIG.longBreakDurationMs,
        circuitBreakerThreshold: campaign.circuitBreakerThreshold ?? DEFAULT_SEND_CONFIG.circuitBreakerThreshold,
        windowStart: campaign.windowStart ?? DEFAULT_SEND_CONFIG.windowStart,
        windowEnd: campaign.windowEnd ?? DEFAULT_SEND_CONFIG.windowEnd,
      });
    } catch {
      toast.error('Erro ao carregar campanha');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // Sync chip profile with selected chip(s) from SendConfigPanel
  useEffect(() => {
    if (allChips.length === 0) return;
    const selectedIds = sendConfig.selectedChipIds;
    const firstId = Array.isArray(selectedIds) && selectedIds.length > 0 ? selectedIds[0] : null;
    const chip = firstId
      ? allChips.find((c) => c.id === firstId)
      : allChips.find((c) => c.status === 'connected');
    if (chip) {
      setSelectedChipProfile({
        profileName: chip.profileName ?? chip.name,
        profilePictureUrl: chip.profilePictureUrl ?? undefined,
      });
    } else {
      setSelectedChipProfile(null);
    }
  }, [allChips, sendConfig.selectedChipIds]);

  const handleMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
  };

  const insertVariable = useCallback(
    (variable: string) => {
      if (isLocked) return;

      const element = textareaRef.current;
      if (!element) return;

      const start = element.selectionStart;
      const end = element.selectionEnd;
      const newMessage = message.slice(0, start) + variable + message.slice(end);
      setMessage(newMessage);

      requestAnimationFrame(() => {
        element.focus();
        const position = start + variable.length;
        element.setSelectionRange(position, position);
      });
    },
    [isLocked, message],
  );

  const templateValidation = validateCampaignTemplates([message, abEnabled ? variantB : ''], {
    candidateProfile,
    hasVoterData: true,
  });
  const templateValidationMessage = getTemplateValidationMessage(templateValidation);
  const previewContext = buildCampaignPreviewContext({ candidateProfile });
  const candidateProfileReady = isCandidateProfileConfigured(candidateProfile);
  const candidateVariableSelected = templateValidation.supportedVariables.includes('{candidato}');

  const handleSave = async () => {
    const trimmedName = campaignName.trim();
    if (!trimmedName) {
      toast.error('Dê um nome para a campanha');
      return;
    }
    if (trimmedName.length < 3 || trimmedName.length > 100) {
      toast.error('Nome deve ter entre 3 e 100 caracteres');
      return;
    }

    if (!message.trim()) {
      toast.error('Mensagem não pode estar vazia');
      return;
    }
    if (message.length > 65536) {
      toast.error('Mensagem excede o limite do WhatsApp (65.536 caracteres)');
      return;
    }

    if (templateValidationMessage) {
      toast.error(templateValidationMessage);
      return;
    }

    if (endDate && startDate && endDate <= startDate) {
      toast.error('Data de fim deve ser posterior à data de início');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: params.id,
          name: campaignName.trim(),
          template: message,
          segmentId: segmentId || null,
          chipId: selectedChipId !== 'auto' ? selectedChipId : null,
          abEnabled,
          abVariantB: abEnabled ? variantB : null,
          abSplitPercent: abEnabled ? splitPct : 50,
          variables: templateValidation.supportedVariables,
          startDate: startDate || null,
          endDate: endDate || null,
          // Send config
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

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data?.error ?? 'Erro ao salvar alterações');
        return;
      }

      toast.success('Campanha atualizada');
      router.refresh();
      router.push('/campanhas');
    } catch {
      toast.error('Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  };

  const wordCount = message.trim() ? message.trim().split(/\s+/).length : 0;

  if (isLoading) {
    return (
      <SidebarLayout currentPage="campanhas" pageTitle="Editar campanha">
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Carregando campanha...
        </div>
      </SidebarLayout>
    );
  }

  if (notFound) {
    return (
      <SidebarLayout currentPage="campanhas" pageTitle="Editar campanha">
        <div className="p-6 text-center text-muted-foreground">
          Campanha não encontrada.{' '}
          <Link href="/campanhas" className="text-primary underline">
            Voltar para campanhas
          </Link>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="campanhas" pageTitle="Editar campanha">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-border bg-background px-6 pt-4 pb-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Link href="/campanhas" className="hover:text-foreground transition-colors">Campanhas</Link>
            <span>/</span>
            <span>Editar</span>
          </div>
          {/* Editable title */}
          <div className="flex items-center gap-2 group">
            <input
              placeholder="Nome da campanha"
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
              disabled={isLocked}
              className="flex-1 bg-transparent text-xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40 border-b-2 border-transparent focus:border-primary transition-colors disabled:cursor-default pb-0.5"
            />
            {!isLocked && (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40 group-focus-within:text-primary shrink-0 transition-colors" aria-hidden="true">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              </svg>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex gap-6 p-6">
          {/* Left column: scrollable content */}
          <div className="flex-1 min-w-0 overflow-y-auto space-y-4 pb-4">
            {isLocked && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Campanha já enviada — edição não disponível</p>
                  <p className="text-xs text-amber-800/80">
                    Este conteúdo está em modo somente leitura porque a campanha já entrou em fluxo de envio.
                  </p>
                </div>
              </div>
            )}
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Editor de Mensagem</span>
                  </div>
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Inserir variável
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {SUPPORTED_CAMPAIGN_VARIABLES.map((variable) => (
                          <button
                            key={variable.key}
                            type="button"
                            onClick={() => insertVariable(variable.key)}
                            disabled={isLocked}
                            className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 font-mono text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {variable.key}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Variáveis suportadas pelo envio: {SUPPORTED_CAMPAIGN_VARIABLES.map((variable) => variable.key).join(' · ')}
                      </p>
                    </div>

                    {templateValidationMessage && (
                      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">Template precisa de ajuste</p>
                          <p className="text-xs text-amber-800/90">{templateValidationMessage}</p>
                        </div>
                      </div>
                    )}

                    {!candidateProfileReady && candidateVariableSelected && (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
                        Configure o perfil do candidato em <Link href="/settings" className="font-medium text-primary underline">Ajustes</Link> para usar <code className="font-mono text-[11px]">{'{candidato}'}</code> com valor real.
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {!isLocked && (
                        <WhatsAppFormatToolbar
                          textareaRef={textareaRef}
                          onTextChange={setMessage}
                          currentText={message}
                        />
                      )}
                      <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleMessageChange}
                        placeholder="Olá {nome}! Aqui é a equipe do {candidato}. Gostaríamos de contar com o seu apoio em {bairro}..."
                        className={cn(
                          'min-h-[160px] max-h-[320px] overflow-y-auto w-full resize-none border border-border bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground transition-colors placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-70',
                          !isLocked ? 'rounded-t-none rounded-b-lg' : 'rounded-lg',
                        )}
                        disabled={isLocked}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="italic">
                          Use variáveis para personalizar. Evite urgência excessiva e linguagem de spam.
                        </span>
                        <span
                          className={cn(
                            'font-medium tabular-nums',
                            wordCount > 120 ? 'text-red-600' : wordCount > 80 ? 'text-amber-600' : 'text-muted-foreground',
                          )}
                        >
                          {wordCount}/120 palavras
                        </span>
                      </div>
                    </div>

                    {/* AI Assistant — hidden for locked campaigns */}
                    {!isLocked && (
                      <GeminiMessageAssistant
                        currentMessage={message}
                        onInsertMessage={setMessage}
                        candidateName={candidateProfile.candidateDisplayName ?? undefined}
                        segmentDescription={segments.find((s) => s.id === segmentId)?.name}
                      />
                    )}

                    <div className="border-t border-border pt-4">
                      <QualityChecks message={message} />
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Teste A/B</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{abEnabled ? 'Ativado' : 'Desativado'}</span>
                      <Switch
                        id="ab-toggle"
                        checked={abEnabled}
                        onCheckedChange={setAbEnabled}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                  {abEnabled && (
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Divisão</span>
                          <span className="font-medium tabular-nums">
                            Variante A: {splitPct}% · Variante B: {100 - splitPct}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={90}
                          step={5}
                          value={splitPct}
                          onChange={(event) => setSplitPct(Number(event.target.value))}
                          className="w-full accent-primary"
                          disabled={isLocked}
                        />
                        <div className="flex h-2 overflow-hidden rounded-full">
                          <div
                            className="bg-primary transition-all duration-200"
                            style={{ width: `${splitPct}%` }}
                          />
                          <div className="flex-1 bg-primary/30" />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                            B
                          </span>
                          <p className="text-sm font-medium text-foreground">Mensagem Variante B</p>
                        </div>
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {SUPPORTED_CAMPAIGN_VARIABLES.map((variable) => (
                            <button
                              key={variable.key}
                              type="button"
                              onClick={() => setVariantB((previous) => previous + variable.key)}
                              disabled={isLocked}
                              className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {variable.key}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={variantB}
                          onChange={(event) => setVariantB(event.target.value)}
                          placeholder="Mensagem alternativa para o grupo B..."
                          className="min-h-[120px] w-full resize-none rounded-lg border border-border bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground transition-colors placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
                          disabled={isLocked}
                        />
                        <QualityChecks message={variantB} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Range */}
                <div className="bg-card border border-border rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Período</span>
                    <span className="text-[10px] text-muted-foreground/60">Opcional</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="start-date" className="text-xs text-muted-foreground">Início</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        disabled={isLocked}
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="end-date" className="text-xs text-muted-foreground">Fim</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || undefined}
                        disabled={isLocked}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                  {endDate && startDate && endDate <= startDate && (
                    <p className="mt-2 text-xs text-red-600">A data de fim deve ser posterior à data de início.</p>
                  )}
                </div>

                {/* Segment selector */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Segmento</span>
                  </div>
                  <div>
                    <Select
                      value={segmentId || 'none'}
                      onValueChange={(v) => setSegmentId(v === 'none' ? '' : v)}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Nenhum segmento selecionado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum segmento</SelectItem>
                        {segments.map((seg) => (
                          <SelectItem key={seg.id} value={seg.id}>
                            {seg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {segmentId && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {segments.find((s) => s.id === segmentId)?.segmentTag ?? 'Segmento selecionado'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Send Config Panel */}
                <SendConfigPanel
                  value={sendConfig}
                  onChange={setSendConfig}
                  allChips={allChips}
                  disabled={isLocked}
                />
          </div>

          {/* Right column: fills container height, scrolls if preview is tall */}
          <div className="hidden lg:block w-[360px] shrink-0 overflow-y-auto">
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prévia WhatsApp</span>
              </div>
              <WhatsAppPreview
                message={resolveCampaignTemplate(message, previewContext)}
                profileName={selectedChipProfile?.profileName}
                profilePictureUrl={selectedChipProfile?.profilePictureUrl}
              />
              <p className="text-center text-[10px] text-muted-foreground">
                Variáveis substituídas por valores reais no envio
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/campanhas">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Voltar
              </Button>
            </Link>
            {isLocked ? (
              <p className="text-xs text-muted-foreground">
                Edição bloqueada para campanhas com status <strong>{campaignStatus}</strong>.
              </p>
            ) : (
              <Button
                onClick={handleSave}
                disabled={isSaving || !campaignName.trim() || !message.trim() || Boolean(templateValidationMessage)}
              >
                <Save className="mr-1.5 h-4 w-4" />
                {isSaving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
