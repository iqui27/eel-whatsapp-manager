'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import type { Campaign, Chip, Segment } from '@/db/schema';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FlaskConical,
  MessageSquare,
  Save,
  Smartphone,
  X,
} from 'lucide-react';

const VARIABLES = [
  { key: '{nome}', label: 'Nome', preview: 'João' },
  { key: '{bairro}', label: 'Bairro', preview: 'Centro' },
  { key: '{interesse}', label: 'Interesse', preview: 'Saúde' },
  { key: '{data}', label: 'Data', preview: new Date().toLocaleDateString('pt-BR') },
  { key: '{candidato}', label: 'Candidato', preview: 'Dr. Silva' },
];

function WhatsAppPreview({ message }: { message: string }) {
  let preview = message;
  for (const variable of VARIABLES) {
    preview = preview.replaceAll(variable.key, variable.preview);
  }

  const now = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: '#128C7E' }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
          EE
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight text-white">EEL Eleição</div>
          <div className="text-xs text-white/70">online</div>
        </div>
        <Smartphone className="h-4 w-4 text-white/60" />
      </div>

      <div
        className="min-h-[200px] flex-1 space-y-2 overflow-y-auto p-4"
        style={{ backgroundColor: '#ECE5DD' }}
      >
        {preview.trim() ? (
          <div className="flex justify-start">
            <div className="relative max-w-[280px] rounded-bl-2xl rounded-br-2xl rounded-tr-2xl bg-white px-3.5 py-2.5 shadow-sm">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{preview}</p>
              <div className="mt-1.5 flex items-center justify-end gap-1">
                <span className="text-[10px] text-gray-400">{now}</span>
                <svg className="h-3 w-3 text-blue-500" viewBox="0 0 16 11" fill="currentColor">
                  <path d="M11.071.653a.75.75 0 0 1 .05 1.059L5.64 8.24a.75.75 0 0 1-1.089.03L1.43 5.15a.75.75 0 1 1 1.06-1.062l2.578 2.578L10.012.704a.75.75 0 0 1 1.059-.05z" />
                  <path d="M14.571.653a.75.75 0 0 1 .05 1.059L9.14 8.24a.75.75 0 0 1-1.058.05.75.75 0 0 0 1.03-.02l5.4-6.558a.75.75 0 0 1 1.059-.059z" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center pt-8 text-sm italic text-gray-400">
            Digite uma mensagem para ver a prévia
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 border-t border-gray-200 bg-white px-4 py-2">
        <svg className="h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
        </svg>
        <span className="text-[10px] text-gray-400">
          Mensagens protegidas com criptografia de ponta a ponta
        </span>
      </div>
    </div>
  );
}

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
  const [selectedChipId, setSelectedChipId] = useState('auto');
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isLocked = campaignStatus === 'sent' || campaignStatus === 'sending';

  const loadCampaign = useCallback(async () => {
    setIsLoading(true);
    setNotFound(false);

    try {
      const [campaignRes, segmentsRes, chipsRes] = await Promise.all([
        fetch(`/api/campaigns?id=${params.id}`),
        fetch('/api/segments'),
        fetch('/api/chips'),
      ]);

      if (campaignRes.status === 401 || segmentsRes.status === 401 || chipsRes.status === 401) {
        router.push('/login');
        return;
      }

      if (segmentsRes.ok) {
        setSegments(await segmentsRes.json());
      }

      if (chipsRes.ok) {
        const chips: Chip[] = await chipsRes.json();
        setConnectedChips(chips.filter((chip) => chip.status === 'connected'));
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
    } catch {
      toast.error('Erro ao carregar campanha');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  const handleMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    const element = event.target;
    element.style.height = 'auto';
    element.style.height = `${Math.max(160, element.scrollHeight)}px`;
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

  const handleSave = async () => {
    if (!campaignName.trim()) {
      toast.error('Dê um nome para a campanha');
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
        }),
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        toast.error('Erro ao salvar alterações');
        return;
      }

      toast.success('Campanha atualizada');
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
        <div className="border-b border-border bg-background px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/campanhas">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" />
                Campanhas
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <div className="min-w-[220px]">
              <p className="font-serif text-lg text-foreground">Editar campanha</p>
              <p className="text-xs text-muted-foreground">
                Ajuste a mensagem, segmento e teste A/B antes do disparo.
              </p>
            </div>
            <Input
              placeholder="Nome da campanha"
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
              className="min-w-[260px] max-w-[480px] flex-1 border-0 px-0 text-base font-medium shadow-none focus-visible:ring-0 placeholder:font-normal"
              disabled={isLocked}
            />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select
                className="min-w-[180px] rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={segmentId}
                onChange={(event) => setSegmentId(event.target.value)}
                disabled={isLocked}
              >
                <option value="">Nenhum segmento</option>
                {segments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name}
                  </option>
                ))}
              </select>
              {segmentId && (
                <Badge variant="secondary" className="text-xs">
                  {segments.find((segment) => segment.id === segmentId)?.audienceCount
                    ? `~${segments.find((segment) => segment.id === segmentId)?.audienceCount} eleitores`
                    : 'Segmento selecionado'}
                </Badge>
              )}
              <div className="min-w-[240px]">
                <Select value={selectedChipId} onValueChange={setSelectedChipId} disabled={isLocked}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chip de envio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (primeiro chip conectado)</SelectItem>
                    {connectedChips.map((chip) => (
                      <SelectItem key={chip.id} value={chip.id}>
                        {chip.name} ({chip.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
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

            <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
              <div className="space-y-4">
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Editor de Mensagem
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Inserir variável
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {VARIABLES.map((variable) => (
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
                    </div>

                    <div className="space-y-1.5">
                      <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleMessageChange}
                        placeholder="Olá {nome}! Aqui é a equipe do {candidato}. Gostaríamos de contar com o seu apoio em {bairro}..."
                        className="min-h-[160px] w-full resize-none rounded-lg border border-border bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground transition-colors placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
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

                    <Separator />
                    <QualityChecks message={message} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-primary" />
                        Teste A/B
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="ab-toggle" className="cursor-pointer text-sm font-normal text-muted-foreground">
                          {abEnabled ? 'Ativado' : 'Desativado'}
                        </Label>
                        <Switch
                          id="ab-toggle"
                          checked={abEnabled}
                          onCheckedChange={setAbEnabled}
                          disabled={isLocked}
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {abEnabled && (
                    <CardContent className="space-y-4">
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
                          {VARIABLES.map((variable) => (
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
                    </CardContent>
                  )}
                </Card>
              </div>

              <div className="h-fit lg:sticky lg:top-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Smartphone className="h-4 w-4 text-primary" />
                      Prévia WhatsApp
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    <WhatsAppPreview message={message} />
                    <p className="mt-2 px-2 text-center text-[10px] text-muted-foreground">
                      As variáveis são substituídas por valores reais no envio
                    </p>
                  </CardContent>
                </Card>
              </div>
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
                disabled={isSaving || !campaignName.trim() || !message.trim()}
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
