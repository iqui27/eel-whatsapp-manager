'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import useSWR from 'swr';
import { fetcher } from '@/lib/use-swr';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCountUp } from '@/lib/use-count-up';
import { cn } from '@/lib/utils';
import type { Campaign, Segment } from '@/db/schema';

const ChatQueuePanel = dynamic(
  () => import('@/components/ChatQueuePanel'),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Carregando painel...</div>
      </div>
    ),
  }
);
import {
  Send,
  MessageCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Plus,
  Upload,
  Flame,
  Users,
  Layers,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Smartphone,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemStatus {
  chips: number;
  voters: number;
  segments: number;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  subLabel,
  icon: Icon,
  iconBg,
  trend,
  note,
  delay = 0,
}: {
  label: string;
  value: number | string;
  subLabel: string;
  icon: React.ElementType;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
  note?: string;
  delay?: number;
}) {
  const animatedValue = useCountUp(typeof value === 'number' ? value : 0, 700, delay);
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Icon className={cn('h-4 w-4', iconBg.replace('bg-', 'text-'))} />
      </div>
      <div className="text-2xl font-semibold text-foreground tabular-nums">
        {typeof value === 'number' ? animatedValue.toLocaleString('pt-BR') : value}
      </div>
      <div className={cn(
        'flex items-center gap-1.5 text-xs font-medium',
        trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground',
      )}>
        {trend === 'up' && <span className="inline-block h-2 w-2 rounded-full bg-green-500 shrink-0" />}
        {trend === 'down' && <span className="inline-block h-2 w-2 rounded-full bg-red-500 shrink-0" />}
        {trend === 'neutral' && <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />}
        {subLabel}
        {note && <span className="ml-1 text-muted-foreground font-normal italic">{note}</span>}
      </div>
    </div>
  );
}

// ─── Status badge for campaigns ───────────────────────────────────────────────

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  sending: 'Enviando',
  sent: 'Concluído',
  paused: 'Pausado',
  cancelled: 'Cancelado',
};

const CAMPAIGN_STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  scheduled: 'bg-blue-500/10 text-blue-600 border-blue-200',
  sending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  sent: 'bg-green-500/10 text-green-600 border-green-200',
  paused: 'bg-orange-500/10 text-orange-600 border-orange-200',
  cancelled: 'bg-red-500/10 text-red-600 border-red-200',
};

// ─── Onboarding wizard ────────────────────────────────────────────────────────

const STORAGE_KEY = 'eel_onboarding_dismissed';

function OnboardingWizard({
  voterCount,
  segmentCount,
  campaignCount,
  onDismiss,
}: {
  voterCount: number;
  segmentCount: number;
  campaignCount: number;
  onDismiss: () => void;
}) {
  const steps = [
    {
      num: 1,
      title: 'Importar base eleitoral',
      desc: 'Faça upload de um CSV com nome, telefone e zona de cada eleitor.',
      href: '/segmentacao/importar',
      cta: 'Importar agora',
      icon: Upload,
      done: voterCount > 0,
    },
    {
      num: 2,
      title: 'Criar segmento',
      desc: 'Agrupe eleitores por região, engajamento ou tags para personalizar o envio.',
      href: '/segmentacao',
      cta: 'Criar segmento',
      icon: Layers,
      done: segmentCount > 0,
    },
    {
      num: 3,
      title: 'Lançar campanha',
      desc: 'Escreva uma mensagem com variáveis, escolha um segmento e agende o envio.',
      href: '/campanhas/nova',
      cta: 'Nova campanha',
      icon: Send,
      done: campaignCount > 0,
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === 3;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-foreground">Bem-vindo ao EEL Eleição</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Complete os 3 passos para lançar sua primeira campanha.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{completedCount}/3</span>
          {allDone && (
            <Button size="sm" variant="ghost" onClick={onDismiss} className="text-xs h-7">
              Fechar
            </Button>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0',
              s.done
                ? 'bg-green-500 text-white'
                : 'bg-border text-muted-foreground',
            )}>
              {s.done ? '✓' : s.num}
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-0.5 flex-1 rounded-full', s.done ? 'bg-green-500/50' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {/* Step cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {steps.map(step => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className={cn(
                'rounded-lg border p-4 space-y-3 transition-colors',
                step.done
                  ? 'border-green-200 bg-green-500/5 opacity-70'
                  : 'border-border bg-card',
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', step.done ? 'text-green-600' : 'text-primary')} />
                <span className="text-sm font-medium text-foreground">{step.title}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              {!step.done && (
                <Link href={step.href}>
                  <Button size="sm" variant="outline" className="w-full text-xs h-7">
                    {step.cta}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              )}
              {step.done && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Concluído
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Command Panel ────────────────────────────────────────────────────────────

function CommandPanel({
  status,
  onWarmAll,
  warmingAll,
}: {
  status: SystemStatus;
  onWarmAll: () => void;
  warmingAll: boolean;
}) {
  const actionClass = "flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-muted text-left";
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Ações rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <button
          onClick={onWarmAll}
          disabled={warmingAll}
          className={cn(actionClass, 'disabled:opacity-50')}
        >
          <Flame className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="font-medium">{warmingAll ? 'Aquecendo...' : 'Aquecer chips'}</span>
        </button>
        <Link href="/campanhas/nova" className={actionClass}>
          <Plus className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium">Nova campanha</span>
        </Link>
        <Link href="/segmentacao/importar" className={actionClass}>
          <Upload className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="font-medium">Importar eleitores</span>
        </Link>
        <Link href="/compliance" className={actionClass}>
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <span className="font-medium">Ver compliance</span>
        </Link>
        <Link href="/relatorios" className={actionClass}>
          <BarChart3 className="h-4 w-4 text-purple-500 shrink-0" />
          <span className="font-medium">Ver relatórios</span>
        </Link>
        <Link href="/mobile/captura" className={actionClass}>
          <Smartphone className="h-4 w-4 text-cyan-600 shrink-0" />
          <span className="font-medium">Captura mobile</span>
        </Link>
        <Link href="/mobile/inbox" className={actionClass}>
          <MessageCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="font-medium">Inbox prioritária</span>
        </Link>

        {/* System status */}
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status do sistema</p>
          {[
            { label: 'Chips ativos', value: status.chips, icon: Smartphone },
            { label: 'Eleitores', value: status.voters, icon: Users },
            { label: 'Segmentos', value: status.segments, icon: Layers },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
              <span className="font-semibold tabular-nums text-foreground">{value.toLocaleString('pt-BR')}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  // SWR-based data fetching with automatic caching and deduplication
  const { data: campaigns, error: campaignsError, isLoading: campaignsLoading, mutate: mutateCampaigns } = useSWR<Campaign[]>('/api/campaigns', fetcher);
  const { data: segments, error: segmentsError, isLoading: segmentsLoading } = useSWR<Segment[]>('/api/segments', fetcher);
  const { data: votersData, error: votersError } = useSWR<{ total: number }>('/api/voters?limit=1', fetcher);
  const { data: chipsData, error: chipsError } = useSWR<{ enabled?: boolean }[]>('/api/chips', fetcher);

  const [warmingAll, setWarmingAll] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Handle auth errors - redirect to login
  useEffect(() => {
    if (campaignsError || segmentsError || votersError || chipsError) {
      // Check for 401 in error message or response
      const errorMsg = (campaignsError as Error)?.message || (segmentsError as Error)?.message || (votersError as Error)?.message || (chipsError as Error)?.message;
      if (errorMsg?.includes('401') || errorMsg?.includes('Unauthorized')) {
        router.push('/login');
      } else {
        toast.error('Erro ao carregar dados');
      }
    }
  }, [campaignsError, segmentsError, votersError, chipsError, router]);

  // Show onboarding if no campaigns and not dismissed
  useEffect(() => {
    if (campaigns && campaigns.length === 0 && !localStorage.getItem(STORAGE_KEY)) {
      setShowOnboarding(true);
    }
  }, [campaigns]);

  // Derived system status from SWR data
  const systemStatus: SystemStatus = {
    chips: chipsData ? chipsData.filter((c) => c.enabled).length : 0,
    voters: votersData?.total ?? 0,
    segments: segments ? segments.length : 0,
  };

  // Combined loading state
  const isLoading = campaignsLoading || segmentsLoading;

  // Refresh function for manual refresh button
  const refreshAll = useCallback(() => {
    mutateCampaigns();
  }, [mutateCampaigns]);

  const handleWarmAll = async () => {
    setWarmingAll(true);
    try {
      const res = await fetch('/api/warming', { method: 'POST' });
      if (res.ok) toast.success('Aquecimento iniciado');
      else toast.error('Erro ao aquecer chips');
    } catch {
      toast.error('Erro ao aquecer chips');
    } finally {
      setWarmingAll(false);
    }
  };

  const dismissOnboarding = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setShowOnboarding(false);
  };

  // ── Derived KPIs ──
  const campaignList = campaigns ?? [];
  const totalSent      = campaignList.reduce((acc, c) => acc + (c.totalSent ?? 0), 0);
  const totalDelivered = campaignList.reduce((acc, c) => acc + (c.totalDelivered ?? 0), 0);
  const totalRead      = campaignList.reduce((acc, c) => acc + (c.totalRead ?? 0), 0);
  const totalReplied   = campaignList.reduce((acc, c) => acc + (c.totalReplied ?? 0), 0);
  const totalFailed    = campaignList.reduce((acc, c) => acc + (c.totalFailed ?? 0), 0);
  const deliveryRate   = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : null;
  const readRate       = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : null;
  const noCampaignData = campaignList.length === 0 || totalSent === 0;

  if (isLoading) {
    return (
      <SidebarLayout currentPage="dashboard" pageTitle="Dashboard">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-sm animate-pulse h-28" />
            ))}
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="dashboard" pageTitle="Dashboard">
      <div className="p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Visão geral das operações de campanha WhatsApp
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshAll} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
          </div>
        </div>
        
        {/* ── Onboarding wizard ── */}
        {showOnboarding && (
          <OnboardingWizard
            voterCount={systemStatus.voters}
            segmentCount={systemStatus.segments}
            campaignCount={campaignList.length}
            onDismiss={dismissOnboarding}
          />
        )}

        {/* ── Two-column layout: main + right panel ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">

          {/* ── Left: KPIs + Operations table + Chat Queue ── */}
          <div className="space-y-6">

            {/* KPI row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard
                label="Entregues"
                value={totalDelivered}
                subLabel={noCampaignData
                  ? 'Nenhuma campanha enviada'
                  : `${deliveryRate}% de entrega sobre ${totalSent.toLocaleString('pt-BR')} envios`}
                icon={Send}
                iconBg="bg-blue-500"
                trend={totalDelivered > 0 ? 'up' : 'neutral'}
                delay={0}
              />
              <KpiCard
                label="Leituras"
                value={totalRead}
                subLabel={noCampaignData
                  ? 'Sem confirmações de leitura ainda'
                  : readRate !== null
                    ? `${readRate}% sobre as mensagens entregues`
                    : 'Sem mensagens entregues para calcular leitura'}
                icon={BarChart3}
                iconBg="bg-green-500"
                trend={totalRead > 0 ? 'up' : 'neutral'}
                delay={50}
              />
              <KpiCard
                label="Respostas"
                value={totalReplied}
                subLabel={noCampaignData
                  ? 'Nenhuma resposta ainda'
                  : totalSent > 0 ? `${Math.round((totalReplied / totalSent) * 100)}% sobre as enviadas` : 'Nenhuma campanha enviada'}
                icon={MessageCircle}
                iconBg="bg-purple-500"
                trend={totalReplied > 0 ? 'up' : 'neutral'}
                delay={100}
              />
              <KpiCard
                label="Bloqueios"
                value={totalFailed}
                subLabel={noCampaignData
                  ? 'Nenhuma campanha enviada'
                  : totalSent > 0 ? `${Math.round((totalFailed / totalSent) * 100)}% com falha` : 'Nenhuma campanha enviada'}
                icon={XCircle}
                iconBg="bg-red-500"
                trend={totalFailed > 0 ? 'down' : 'neutral'}
                delay={150}
              />
            </div>

            {/* Operations table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Campanhas ativas
                    <Badge variant="secondary">{campaignList.length}</Badge>
                  </CardTitle>
                  <Link href="/campanhas">
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      Ver todas
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {campaignList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center px-6">
                    <Send className="h-8 w-8 text-muted-foreground/30" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Nenhuma campanha ainda</p>
                      <p className="text-xs text-muted-foreground">Crie sua primeira campanha para começar a operar.</p>
                    </div>
                    <Link href="/campanhas/nova">
                      <Button size="sm">
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Nova campanha
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="min-w-[160px]">Campanha</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Segmento</TableHead>
                          <TableHead>Entregues</TableHead>
                          <TableHead>Taxa</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaignList.slice(0, 8).map(campaign => {
                          const seg = (segments ?? []).find(s => s.id === campaign.segmentId);
                          const sent = campaign.totalSent ?? 0;
                          const delivered = campaign.totalDelivered ?? 0;
                          const rate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
                          return (
                            <TableRow key={campaign.id} className="hover:bg-muted/30">
                              <TableCell className="font-medium text-sm max-w-[180px] truncate">
                                {campaign.name}
                              </TableCell>
                              <TableCell>
                                <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', CAMPAIGN_STATUS_CLASSES[campaign.status ?? 'draft'])}>
                                  {CAMPAIGN_STATUS_LABELS[campaign.status ?? 'draft']}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {seg?.name ?? <span className="text-muted-foreground/40 italic text-xs">—</span>}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1 min-w-[80px]">
                                  <div className="text-sm tabular-nums">
                                    {delivered.toLocaleString('pt-BR')}
                                    {sent > 0 && <span className="text-muted-foreground text-xs"> / {sent}</span>}
                                  </div>
                                  {sent > 0 && (
                                    <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                                      <div
                                        className={cn('h-full rounded-full', rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                                        style={{ width: `${rate}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {sent > 0 ? (
                                  <span className={cn('text-sm font-medium tabular-nums', rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600')}>
                                    {rate}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/50 text-xs">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  {(campaign.status === 'scheduled' || campaign.status === 'sending' || campaign.status === 'sent') && (
                                    <Link href={`/campanhas/${campaign.id}/monitor`}>
                                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                                        <BarChart3 className="h-3 w-3" />
                                        Monitor
                                      </Button>
                                    </Link>
                                  )}
                                  {campaign.status === 'draft' && (
                                    <Link href={`/campanhas/${campaign.id}/editar`}>
                                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                        Editar
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat queue — full width, below campaigns */}
            <ChatQueuePanel />
          </div>

          {/* ── Right: Command panel only ── */}
          <div className="lg:sticky lg:top-24 self-start">
            <CommandPanel
              status={systemStatus}
              onWarmAll={handleWarmAll}
              warmingAll={warmingAll}
            />
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
