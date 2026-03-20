'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send,
  ArrowRight,
  Loader2,
  MessageSquare,
  Smartphone,
  Check,
  X,
  Calendar,
  SkipForward,
  Users,
} from 'lucide-react';
import {
  loadWizardState,
  saveWizardState,
  type WizardState,
  markStepCompleted,
  markStepSkipped,
  getNextStep,
} from '@/lib/setup-wizard';
import { cn } from '@/lib/utils';
import { calculateCtaScore, scoreBg } from '@/lib/cta-score';
import type { Segment, Chip, Campaign, Config } from '@/db/schema';
import {
  buildCampaignPreviewContext,
  getTemplateValidationMessage,
  isCandidateProfileConfigured,
  resolveCampaignTemplate,
  SUPPORTED_CAMPAIGN_VARIABLES,
  type CampaignVariableKey,
  type CandidateProfileContext,
  validateCampaignTemplates,
} from '@/lib/campaign-variables';
import { WhatsAppPreview } from '@/components/whatsapp-preview';

const EMPTY_CANDIDATE_PROFILE: CandidateProfileContext = {
  candidateDisplayName: '',
  candidateOffice: '',
  candidateParty: '',
  candidateRegion: '',
};

// ─── Quality Checks ───────────────────────────────────────────────────────────

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

export default function WizardCampaignPage() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [state, setState] = useState<WizardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfileContext>(EMPTY_CANDIDATE_PROFILE);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [chipId, setChipId] = useState('auto');
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      const loaded = loadWizardState();
      setState(loaded);
      
      // Pre-fill from wizard state
      if (loaded.segments.items.length > 0) {
        setSegmentId(loaded.segments.items[0].id);
      }
      if (loaded.segments.items[0]?.chipId) {
        setChipId(loaded.segments.items[0].chipId);
      }
      
      try {
        const [segmentsRes, chipsRes, settingsRes] = await Promise.all([
          fetch('/api/segments'),
          fetch('/api/chips'),
          fetch('/api/settings'),
        ]);
        
        if (segmentsRes.ok) {
          const data: Segment[] = await segmentsRes.json();
          setSegments(data);
          
          // Pre-select segment if not already set
          if (!segmentId && data.length > 0) {
            setSegmentId(data[0].id);
          }
        }
        
        if (chipsRes.ok) {
          setChips(await chipsRes.json());
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
      } catch (err) {
        console.error('Failed to load data:', err);
      }
      
      setLoading(false);
    };
    
    loadData();
  }, []);
  
  // Save state when it changes
  useEffect(() => {
    if (state) {
      saveWizardState(state);
    }
  }, [state]);
  
  const connectedChips = chips.filter(c => c.status === 'connected' && c.enabled);
  
  const templateValidation = validateCampaignTemplates([message], {
    candidateProfile,
    hasVoterData: true,
  });
  const templateValidationMessage = getTemplateValidationMessage(templateValidation);
  const previewContext = buildCampaignPreviewContext({ candidateProfile });
  const selectedChip = chipId !== 'auto' ? chips.find(c => c.id === chipId) : connectedChips[0];
  
  // Insert variable at cursor
  const insertVariable = useCallback((variable: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newMessage = message.slice(0, start) + variable + message.slice(end);
    setMessage(newMessage);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + variable.length;
      el.setSelectionRange(pos, pos);
    });
  }, [message]);
  
  // Auto-grow textarea
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.max(160, el.scrollHeight)}px`;
  };
  
  const wordCount = message.trim() ? message.trim().split(/\s+/).length : 0;
  
  const saveCampaign = async (): Promise<string | null> => {
    if (!campaignName.trim()) {
      toast.error('Dê um nome para a campanha');
      return null;
    }
    
    if (!message.trim()) {
      toast.error('Digite a mensagem da campanha');
      return null;
    }
    
    if (!segmentId) {
      toast.error('Selecione um segmento');
      return null;
    }
    
    setSaving(true);
    
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName.trim(),
          template: message,
          segmentId,
          chipId: chipId !== 'auto' ? chipId : null,
          status: 'draft',
          variables: templateValidation.supportedVariables,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Erro ao salvar campanha');
      }
      
      const campaign: Campaign = await res.json();
      return campaign.id;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar campanha');
      return null;
    } finally {
      setSaving(false);
    }
  };
  
  const handleSkip = () => {
    if (!state) return;
    
    const newState = markStepSkipped(state, 'campaign');
    setState(newState);
    
    toast.success('Assistente de configuração concluído!');
    router.push('/dashboard');
  };
  
  const handleSaveDraft = async () => {
    const id = await saveCampaign();
    if (id) {
      toast.success('Rascunho salvo');
    }
  };
  
  const handleContinue = async () => {
    const id = await saveCampaign();
    if (!id) return;
    
    // Update wizard state
    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        campaign: {
          id,
          name: campaignName,
          template: message,
          segmentId,
          chipId: chipId !== 'auto' ? chipId : null,
          scheduled: false,
          scheduledAt: null,
        },
      };
    });
    
    const newState = markStepCompleted(state!, 'campaign');
    setState(newState);
    
    toast.success('Campanha criada! Configure o envio na página de campanhas.');
    router.push('/campanhas');
  };
  
  if (loading || !state) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // No segments
  if (segments.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Send className="h-6 w-6" />
            Criar Campanha
          </h2>
          <p className="text-muted-foreground">
            Crie sua primeira campanha para enviar mensagens personalizadas.
          </p>
        </div>
        
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum segmento criado ainda. Crie segmentos primeiro.
            </p>
            <Button variant="outline" onClick={() => router.push('/wizard/segments')}>
              Voltar para Segmentos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const selectedSegment = segments.find(s => s.id === segmentId);
  
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Send className="h-6 w-6" />
            Criar Campanha
          </h2>
          <Badge variant="secondary">
            Opcional
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Crie sua primeira campanha e envie mensagens personalizadas para seus eleitores.
        </p>
      </div>
      
      {/* Quick setup */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left - Editor */}
        <div className="space-y-4">
          {/* Campaign name and segment */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Configuração Rápida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Nome da campanha (ex: Boas-vindas Zona Sul)"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select value={segmentId} onValueChange={setSegmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.audienceCount?.toLocaleString() || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={chipId} onValueChange={setChipId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (primeiro disponível)</SelectItem>
                    {connectedChips.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSegment && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {selectedSegment.audienceCount?.toLocaleString() || 0} eleitores no segmento
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Message editor */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" />
                Mensagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Variable toolbar */}
              <div className="flex flex-wrap gap-1.5">
                {SUPPORTED_CAMPAIGN_VARIABLES.slice(0, 5).map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-mono text-primary hover:bg-primary/15 transition-colors"
                  >
                    {v.key}
                  </button>
                ))}
              </div>
              
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleMessageChange}
                placeholder="Olá {nome}! Aqui é a equipe do {candidato}. Gostaríamos de contar com o seu apoio..."
                className="w-full min-h-[180px] resize-none rounded-lg border border-border bg-background px-3.5 py-3 text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
              />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="italic">Use variáveis para personalizar</span>
                <span className={cn(
                  'font-medium tabular-nums',
                  wordCount > 120 ? 'text-red-600' :
                  wordCount > 80 ? 'text-amber-600' : 'text-muted-foreground'
                )}>
                  {wordCount}/120 palavras
                </span>
              </div>
              
              <QualityChecks message={message} />
            </CardContent>
          </Card>
        </div>
        
        {/* Right - Preview */}
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
                profileName={selectedChip?.profileName ?? undefined}
                profilePictureUrl={selectedChip?.profilePictureUrl ?? undefined}
              />
              <p className="text-[10px] text-muted-foreground text-center mt-2 px-2">
                As variáveis são substituídas por valores reais no envio
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="ghost" onClick={() => router.push('/wizard/groups')}>
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSkip}>
            <SkipForward className="h-4 w-4 mr-2" />
            Pular
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saving || !campaignName.trim()}
          >
            Salvar Rascunho
          </Button>
          <Button
            onClick={handleContinue}
            disabled={saving || !campaignName.trim() || !message.trim() || !segmentId}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Campanha
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}