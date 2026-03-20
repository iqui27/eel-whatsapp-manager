'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { Config, Segment, Campaign, Chip } from '@/db';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Save,
  Check,
  X,
  MessageSquare,
  Smartphone,
  FlaskConical,
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
import { SendConfigPanel, DEFAULT_SEND_CONFIG, type SendConfigValue } from '@/components/SendConfigPanel';
import { WhatsAppPreview } from '@/components/whatsapp-preview';
import { WhatsAppFormatToolbar } from '@/components/whatsapp-format-toolbar';
import { GeminiMessageAssistant } from '@/components/gemini-message-assistant';

// ─── Candidate profile empty state ────────────────────────────────────────────

const EMPTY_CANDIDATE_PROFILE: CandidateProfileContext = {
  candidateDisplayName: '',
  candidateOffice: '',
  candidateParty: '',
  candidateRegion: '',
};

// ─── Quality checks ───────────────────────────────────────────────────────────

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
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CTA Score</span>
        <span className={cn('rounded-full border px-2.5 py-0.5 text-sm font-semibold', scoreBg(score))}>
          {score}/100
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            {item.ok
              ? <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
              : <X className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
            <span className={item.ok ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
        <span>{wordCount} palavras</span>
        <span className={cn(
          wordCount > 120 ? 'text-red-600 font-medium' :
          wordCount > 80 ? 'text-amber-600' : 'text-green-600'
        )}>
          {wordCount > 120 ? `${wordCount - 120} acima do limite` : `${120 - wordCount} restantes`}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NovaCampanhaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voterContextId = searchParams.get('voterId');
  const voterContextName = searchParams.get('voterName');
  const campaignSource = searchParams.get('source');

  const [campaignName, setCampaignName] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [message, setMessage] = useState('');
  const [abEnabled, setAbEnabled] = useState(false);
  const [variantB, setVariantB] = useState('');
  const [splitPct, setSplitPct] = useState(50);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [connectedChips, setConnectedChips] = useState<Chip[]>([]);
  const [allChips, setAllChips] = useState<Chip[]>([]);
  const [selectedChipId, setSelectedChipId] = useState('auto');
  const [sendConfig, setSendConfig] = useState<SendConfigValue>(DEFAULT_SEND_CONFIG);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [prefilledSegmentName, setPrefilledSegmentName] = useState<string | null>(null);
  const [isBootstrappingSegment, setIsBootstrappingSegment] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfileContext>(EMPTY_CANDIDATE_PROFILE);
  const [selectedChipProfile, setSelectedChipProfile] = useState<{
    profileName?: string;
    profilePictureUrl?: string;
  } | null>(null);

  // Load segments for selector
  useEffect(() => {
    let cancelled = false;

    const loadBootData = async () => {
      try {
        const [segmentsRes, chipsRes, settingsRes] = await Promise.all([
          fetch('/api/segments'),
          fetch('/api/chips'),
          fetch('/api/settings'),
        ]);

        if (segmentsRes.status === 401 || chipsRes.status === 401 || settingsRes.status === 401) {
          router.push('/login');
          return;
        }

        if (!cancelled && segmentsRes.ok) {
          setSegments(await segmentsRes.json());
        }

        if (!cancelled && chipsRes.ok) {
          const chips: Chip[] = await chipsRes.json();
          setAllChips(chips);
          setConnectedChips(chips.filter((chip) => chip.status === 'connected'));
          // Set initial chip profile from the first connected chip
          const firstConnected = chips.find((chip) => chip.status === 'connected');
          if (firstConnected) {
            setSelectedChipProfile({
              profileName: firstConnected.profileName ?? firstConnected.name,
              profilePictureUrl: firstConnected.profilePictureUrl ?? undefined,
            });
          }
        }

        if (!cancelled && settingsRes.ok) {
          const settings: Partial<Config> = await settingsRes.json();
          setCandidateProfile({
            candidateDisplayName: settings.candidateDisplayName ?? '',
            candidateOffice: settings.candidateOffice ?? '',
            candidateParty: settings.candidateParty ?? '',
            candidateRegion: settings.candidateRegion ?? '',
          });
        }
      } catch {
        // keep best-effort loading for planning phase changes
      }
    };

    loadBootData();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!voterContextId || campaignSource !== 'crm') {
      setPrefilledSegmentName(null);
      return;
    }

    let cancelled = false;

    const bootstrapSegment = async () => {
      setIsBootstrappingSegment(true);
      try {
        const response = await fetch('/api/segments/from-voter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voterId: voterContextId,
            voterName: voterContextName,
          }),
        });

        if (!response.ok) {
          throw new Error('Erro ao preparar segmento do eleitor');
        }

        const segment: Segment = await response.json();
        if (cancelled) return;

        setSegmentId(segment.id);
        setPrefilledSegmentName(segment.name);
        setSegments((current) => {
          const remaining = current.filter((item) => item.id !== segment.id);
          return [segment, ...remaining];
        });
      } catch {
        if (!cancelled) {
          toast.error('Não foi possível preparar o segmento individual deste eleitor');
        }
      } finally {
        if (!cancelled) {
          setIsBootstrappingSegment(false);
        }
      }
    };

    bootstrapSegment();

    return () => {
      cancelled = true;
    };
  }, [campaignSource, voterContextId, voterContextName]);

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

  // Auto-grow textarea
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.max(160, el.scrollHeight)}px`;
  };

  // Insert variable at cursor
  const insertVariable = useCallback((variable: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newMessage = message.slice(0, start) + variable + message.slice(end);
    setMessage(newMessage);
    // Restore focus + cursor after React re-render
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + variable.length;
      el.setSelectionRange(pos, pos);
    });
  }, [message]);

  const templateValidation = validateCampaignTemplates([message, abEnabled ? variantB : ''], {
    candidateProfile,
    hasVoterData: true,
  });
  const templateValidationMessage = getTemplateValidationMessage(templateValidation);
  const previewContext = buildCampaignPreviewContext({ candidateProfile });
  const candidateProfileReady = isCandidateProfileConfigured(candidateProfile);
  const candidateVariableSelected = templateValidation.supportedVariables.includes('{candidato}');

  const saveDraft = async (): Promise<string | null> => {
    const trimmedName = campaignName.trim();
    if (!trimmedName) {
      toast.error('Dê um nome para a campanha');
      return null;
    }
    if (trimmedName.length < 3 || trimmedName.length > 100) {
      toast.error('Nome deve ter entre 3 e 100 caracteres');
      return null;
    }

    if (!message.trim()) {
      toast.error('Mensagem não pode estar vazia');
      return null;
    }
    if (message.length > 65536) {
      toast.error('Mensagem excede o limite do WhatsApp (65.536 caracteres)');
      return null;
    }

    if (templateValidationMessage) {
      toast.error(templateValidationMessage);
      return null;
    }

    if (endDate && startDate && endDate <= startDate) {
      toast.error('Data de fim deve ser posterior à data de início');
      return null;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName.trim(),
          template: message,
          startDate: startDate || null,
          endDate: endDate || null,
          segmentId: segmentId || null,
          chipId: selectedChipId !== 'auto' ? selectedChipId : null,
          status: 'draft',
          abEnabled,
          abVariantB: abEnabled ? variantB : null,
          abSplitPercent: abEnabled ? splitPct : 50,
          variables: templateValidation.supportedVariables,
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
      if (res.ok) {
        const saved: Campaign = await res.json();
        toast.success('Rascunho salvo');
        return saved.id;
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? 'Erro ao salvar rascunho');
        return null;
      }
    } catch {
      toast.error('Erro ao salvar rascunho');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    await saveDraft();
  };

  const handleContinue = async () => {
    const id = await saveDraft();
    if (id) router.push(`/campanhas/${id}/agendar`);
  };

  // Word count for textarea footer
  const wordCount = message.trim() ? message.trim().split(/\s+/).length : 0;

  return (
    <SidebarLayout currentPage="campanhas" pageTitle="Nova Campanha">
      <div className="flex flex-col h-full">
        {/* ── Metadata bar ── */}
        <div className="border-b border-border bg-background px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/campanhas">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" />
                Campanhas
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <Input
              placeholder="Nome da campanha (ex: Apoiadores Zona Sul — Semana 2)"
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              className="flex-1 min-w-[260px] max-w-[480px] text-base font-medium border-0 shadow-none focus-visible:ring-0 px-0 placeholder:font-normal"
            />
          </div>
        </div>

        {/* ── Split pane ── */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-4">
            {voterContextId && voterContextName && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="bg-background/80 text-primary">
                    Campanha direcionada para {voterContextName}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {isBootstrappingSegment
                      ? 'Preparando o segmento individual deste eleitor...'
                      : prefilledSegmentName
                        ? `Segmento individual pré-selecionado: ${prefilledSegmentName}. Você ainda pode trocar o segmento antes de salvar.`
                        : 'Campanhas enviam para segmentos. O segmento individual deste eleitor será preparado automaticamente quando possível.'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] h-full">

              {/* Left — editor */}
              <div className="space-y-4">
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Editor de Mensagem
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Variable toolbar */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                        Inserir variável
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {SUPPORTED_CAMPAIGN_VARIABLES.map(v => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => insertVariable(v.key)}
                            className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors font-mono"
                          >
                            {v.key}
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

                    {/* Formatting toolbar + Textarea */}
                    <div className="space-y-1.5">
                      <WhatsAppFormatToolbar
                        textareaRef={textareaRef}
                        onTextChange={setMessage}
                        currentText={message}
                      />
                      <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleMessageChange}
                        placeholder="Olá {nome}! Aqui é a equipe do {candidato}. Gostaríamos de contar com o seu apoio em {bairro}..."
                        className="w-full min-h-[160px] resize-none rounded-t-none rounded-b-lg border border-border bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="italic">
                          Use variáveis para personalizar. Evite urgência excessiva e linguagem de spam.
                        </span>
                        <span className={cn(
                          'font-medium tabular-nums',
                          wordCount > 120 ? 'text-red-600' :
                          wordCount > 80 ? 'text-amber-600' : 'text-muted-foreground'
                        )}>
                          {wordCount}/120 palavras
                        </span>
                      </div>
                    </div>

                    {/* AI Assistant */}
                    <GeminiMessageAssistant
                      currentMessage={message}
                      onInsertMessage={setMessage}
                      candidateName={candidateProfile.candidateDisplayName ?? undefined}
                      segmentDescription={segments.find(s => s.id === segmentId)?.name}
                    />

                    {/* Quality indicators */}
                    <Separator />
                    <QualityChecks message={message} />
                  </CardContent>
                </Card>

                {/* A/B Test Panel */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-primary" />
                        Teste A/B
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="ab-toggle" className="text-sm font-normal text-muted-foreground cursor-pointer">
                          {abEnabled ? 'Ativado' : 'Desativado'}
                        </Label>
                        <Switch
                          id="ab-toggle"
                          checked={abEnabled}
                          onCheckedChange={setAbEnabled}
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {abEnabled && (
                    <CardContent className="space-y-4">
                      {/* Split percentage slider */}
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
                          onChange={e => setSplitPct(Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                        <div className="flex overflow-hidden rounded-full h-2">
                          <div
                            className="bg-primary transition-all duration-200"
                            style={{ width: `${splitPct}%` }}
                          />
                          <div
                            className="bg-primary/30 flex-1"
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Variant B editor */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-primary/10 text-primary text-xs font-bold px-2 py-0.5">B</span>
                          <p className="text-sm font-medium text-foreground">Mensagem Variante B</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {SUPPORTED_CAMPAIGN_VARIABLES.map(v => (
                            <button
                              key={v.key}
                              type="button"
                              onClick={() => setVariantB(prev => prev + v.key)}
                              className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/15 transition-colors font-mono"
                            >
                              {v.key}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={variantB}
                          onChange={e => setVariantB(e.target.value)}
                          placeholder="Mensagem alternativa para o grupo B..."
                          className="w-full min-h-[120px] resize-none rounded-lg border border-border bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                        />
                        <QualityChecks message={variantB} />
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Date Range */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Período da Campanha</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Opcional — deixe em branco para campanhas pontuais sem janela de vigência.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="start-date" className="text-xs font-medium">Data de início</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="end-date" className="text-xs font-medium">Data de fim</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate || undefined}
                          className="text-sm"
                        />
                      </div>
                    </div>
                    {endDate && startDate && endDate <= startDate && (
                      <p className="text-xs text-red-600">A data de fim deve ser posterior à data de início.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Send Config Panel */}
                <SendConfigPanel
                  value={sendConfig}
                  onChange={setSendConfig}
                  allChips={allChips}
                />
              </div>

              {/* Right — WhatsApp preview */}
              <div className="lg:sticky lg:top-6 h-fit">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Smartphone className="h-4 w-4 text-primary" />
                      Prévia WhatsApp
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    <WhatsAppPreview
                      message={resolveCampaignTemplate(message, previewContext)}
                      profileName={selectedChipProfile?.profileName}
                      profilePictureUrl={selectedChipProfile?.profilePictureUrl}
                    />
                    <p className="text-[10px] text-muted-foreground text-center mt-2 px-2">
                      As variáveis são substituídas por valores reais no envio
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom action bar ── */}
        <div className="border-t border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/campanhas">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Cancelar
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving || !campaignName.trim() || Boolean(templateValidationMessage)}
              >
                <Save className="mr-1.5 h-4 w-4" />
                Salvar rascunho
              </Button>
              <Button
                onClick={handleContinue}
                disabled={isSaving || !campaignName.trim() || !message.trim() || Boolean(templateValidationMessage)}
              >
                Continuar
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
