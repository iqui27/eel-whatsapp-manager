'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ConversionFunnel } from '@/components/conversion-funnel';
import { DeliveryTimeline } from '@/components/delivery-timeline';
import { ChipBreakdown } from '@/components/chip-breakdown';
import type { FunnelData } from '@/app/api/campaigns/[id]/funnel/route';
import SidebarLayout from '@/components/SidebarLayout';
import { cn } from '@/lib/utils';
import type { CampaignPerformanceAnalysis } from '@/lib/gemini';
import type { Campaign } from '@/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Chip {
  id: string;
  name: string;
  instanceName?: string;
  profilePicture?: string | null;
}

interface Segment {
  id: string;
  name: string;
  audienceCount?: number;
}

interface ChipBreakdownItem {
  chipId: string | null;
  chipName: string;
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  failureRate: number;
}

interface Alert {
  type: 'warning' | 'error';
  message: string;
  chipId?: string;
}

interface AnalyticsData {
  campaign: Campaign;
  funnel: FunnelData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timeline: any[];
  chipBreakdown: ChipBreakdownItem[];
  alerts: Alert[];
  ai?: CampaignPerformanceAnalysis;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  sending: 'Enviando',
  sent: 'Enviada',
  paused: 'Pausada',
  cancelled: 'Cancelada',
};

function getStatusBadge(status: string) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
    sending: 'bg-amber-100 text-amber-700 border-amber-200',
    sent: 'bg-green-100 text-green-700 border-green-200',
    paused: 'bg-orange-100 text-orange-700 border-orange-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

// ─── Score color helper ───────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-700';
  if (score >= 40) return 'text-amber-700';
  return 'text-red-700';
}

function getScoreBg(score: number): string {
  if (score >= 70) return 'bg-green-50 border-green-200';
  if (score >= 40) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

function getScoreBarColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function getScoreLabel(score: number): string {
  if (score >= 70) return 'Bom desempenho';
  if (score >= 40) return 'Desempenho moderado';
  return 'Requer atenção';
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  colorClass,
}: {
  label: string;
  value: string | number;
  sub?: string;
  colorClass?: string;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={cn('text-2xl font-semibold tabular-nums', colorClass)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── AI Insights Panel ────────────────────────────────────────────────────────

function AIInsightsPanel({
  analysis,
  loading,
  onRefresh,
}: {
  analysis: CampaignPerformanceAnalysis | null | undefined;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="border rounded-lg p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-base select-none" aria-hidden>&#10024;</span>
          Analise IA
        </h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-sm border rounded px-3 py-1.5 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Atualizando...' : 'Atualizar analise'}
        </button>
      </div>

      {loading && !analysis && (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 rounded-lg bg-muted" />
          <div className="h-4 rounded bg-muted w-3/4" />
          <div className="h-4 rounded bg-muted w-1/2" />
          <div className="h-4 rounded bg-muted w-2/3" />
        </div>
      )}

      {!loading && !analysis && (
        <div className="text-center py-8 space-y-2">
          <p className="text-sm text-muted-foreground">
            Clique em "Atualizar analise" para gerar insights com IA.
          </p>
        </div>
      )}

      {analysis && (
        <div className="space-y-5">
          {/* Score gauge */}
          <div className={cn('rounded-lg border p-4 space-y-2', getScoreBg(analysis.overallScore))}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Score Geral</p>
              <span className="text-xs text-muted-foreground">{getScoreLabel(analysis.overallScore)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn('text-4xl font-bold tabular-nums', getScoreColor(analysis.overallScore))}>
                {analysis.overallScore}
              </span>
              <div className="flex-1 space-y-1">
                <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className={cn('h-2 rounded-full transition-all duration-500', getScoreBarColor(analysis.overallScore))}
                    style={{ width: `${analysis.overallScore}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">de 100</p>
              </div>
            </div>
            {analysis.summary && (
              <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
            )}
          </div>

          {/* Insights */}
          {analysis.insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Insights</p>
              <ul className="space-y-1.5">
                {analysis.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recomendacoes</p>
              <ul className="space-y-1.5">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk factors */}
          {analysis.riskFactors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fatores de Risco</p>
              <ul className="space-y-1.5">
                {analysis.riskFactors.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                    <span className="text-red-700">{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Anti-ban stats types ─────────────────────────────────────────────────────

interface ChipStat {
  chipId: string;
  chipName: string;
  healthStatus: string;
  warmupStage: string;
  recommendedDailyMax: number;
  messagesSentToday: number;
  messagesSentThisHour: number;
  dailyLimit: number;
  hourlyLimit: number;
  errorRate: number;
  hasProxy: boolean;
  sentForCampaign: number;
}

interface AntiBanStats {
  chipStats: ChipStat[];
  circuitBreakerStatus: 'active' | 'tripped' | 'disabled';
}

const HEALTH_LABELS: Record<string, { label: string; dotColor: string }> = {
  healthy:      { label: 'Saudavel',      dotColor: 'bg-green-500' },
  degraded:     { label: 'Degradado',     dotColor: 'bg-yellow-500' },
  cooldown:     { label: 'Descanso',      dotColor: 'bg-orange-500' },
  quarantined:  { label: 'Quarentena',    dotColor: 'bg-red-500' },
  banned:       { label: 'Banido',        dotColor: 'bg-red-900' },
  warming_up:   { label: 'Aquecendo',     dotColor: 'bg-blue-500' },
  disconnected: { label: 'Desconectado',  dotColor: 'bg-slate-400' },
  not_found:    { label: 'Nao encontrado', dotColor: 'bg-gray-500' },
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<CampaignPerformanceAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chips, setChips] = useState<Chip[]>([]);
  const [segment, setSegment] = useState<Segment | null>(null);
  const [antiBanStats, setAntiBanStats] = useState<AntiBanStats | null>(null);
  const [messageExpanded, setMessageExpanded] = useState(false);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  // ─── Fetch analytics ───────────────────────────────────────────────────────

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/analytics`, { cache: 'no-store' });
      if (res.status === 404) {
        setNotFoundFlag(true);
        return;
      }
      if (!res.ok) return;
      const data: AnalyticsData = await res.json();
      setAnalytics(data);
      lastStatusRef.current = data.campaign.status ?? null;
    } catch {
      // silently ignore — show stale data
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [id]);

  // ─── Fetch supporting data ─────────────────────────────────────────────────

  const fetchSupporting = useCallback(async () => {
    try {
      const [chipsRes, campaignRes] = await Promise.all([
        fetch('/api/chips'),
        fetch(`/api/campaigns?id=${id}`),
      ]);

      if (chipsRes.ok) {
        const chipsData = await chipsRes.json();
        setChips(Array.isArray(chipsData) ? chipsData : (chipsData.chips ?? []));
      }

      if (campaignRes.ok) {
        const campaignData = await campaignRes.json();
        const campArr = Array.isArray(campaignData) ? campaignData : [];
        const found = campArr.find((c: Campaign & { chipStats?: ChipStat[]; circuitBreakerStatus?: string }) => c.id === id);
        if (found) {
          setAntiBanStats({
            chipStats: found.chipStats ?? [],
            circuitBreakerStatus: found.circuitBreakerStatus ?? 'disabled',
          });
          // Fetch segment info
          if (found.segmentId) {
            try {
              const segRes = await fetch('/api/segments');
              if (segRes.ok) {
                const segs = await segRes.json();
                const segsArr = Array.isArray(segs) ? segs : (segs.segments ?? []);
                const s = segsArr.find((sg: Segment) => sg.id === found.segmentId);
                if (s) setSegment(s);
              }
            } catch {
              // no segment
            }
          }
        }
      }
    } catch {
      // silently ignore
    }
  }, [id]);

  // ─── AI analysis fetch ─────────────────────────────────────────────────────

  const fetchAiAnalysis = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/analytics?ai=true`, { cache: 'no-store' });
      if (!res.ok) return;
      const data: AnalyticsData = await res.json();
      if (data.ai) setAiAnalysis(data.ai);
    } catch {
      // silently ignore
    } finally {
      setAiLoading(false);
    }
  }, [id]);

  // ─── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAnalytics();
    fetchSupporting();
  }, [fetchAnalytics, fetchSupporting]);

  // ─── Auto-refresh for sending campaigns (every 30s) ────────────────────────

  useEffect(() => {
    const campaign = analytics?.campaign;
    if (!campaign) return;

    const isSending = campaign.status === 'sending';

    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    if (isSending) {
      refreshIntervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchAnalytics(true);
        }
      }, 30_000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [analytics?.campaign?.status, fetchAnalytics]);

  // ─── Not found ─────────────────────────────────────────────────────────────

  if (notFoundFlag) {
    notFound();
  }

  // ─── Derive display data ───────────────────────────────────────────────────

  const campaign = analytics?.campaign;
  const funnel: FunnelData = analytics?.funnel ?? {
    campaignId: id,
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    replied: 0,
    clicked: 0,
    joinedGroup: 0,
    failed: 0,
    percentages: { sent: 0, delivered: 0, read: 0, replied: 0, clicked: 0, joinedGroup: 0 },
  };
  const timeline = analytics?.timeline ?? [];
  const chipBreakdown: ChipBreakdownItem[] = analytics?.chipBreakdown ?? [];
  const alerts = analytics?.alerts ?? [];

  // Assigned chips from selectedChipIds
  const assignedChips = campaign?.selectedChipIds?.length
    ? chips.filter((c) => campaign.selectedChipIds!.includes(c.id))
    : campaign?.chipId
      ? chips.filter((c) => c.id === campaign.chipId)
      : [];

  // KPIs
  const totalSent = funnel.sent;
  const deliveryRate = funnel.percentages.delivered;
  const readRate = funnel.percentages.read;
  const replyRate = funnel.percentages.replied;
  const failureRate = totalSent > 0 ? Math.round((funnel.failed / totalSent) * 100) : 0;

  // Message preview
  const template = campaign?.template ?? '';
  const templateShort = template.slice(0, 200);
  const templateTruncated = template.length > 200;

  // Date range
  const startDate = campaign?.startDate;
  const endDate = campaign?.endDate;
  const dateRange = startDate
    ? endDate
      ? `${formatDateShort(startDate)} – ${formatDateShort(endDate)}`
      : formatDateShort(startDate)
    : null;

  // Send config labels
  const sendRateLabel: Record<string, string> = { slow: 'Lento', normal: 'Normal', fast: 'Rapido' };

  return (
    <SidebarLayout currentPage="campanhas" pageTitle="Campanha">
      <div className="p-6 space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/campanhas" className="hover:text-foreground transition-colors">
            Campanhas
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[280px]">
            {campaign?.name ?? '...'}
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {campaign?.name ?? <span className="animate-pulse bg-muted rounded h-7 w-48 inline-block" />}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              {campaign && (
                <span className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                  getStatusBadge(campaign.status ?? 'draft')
                )}>
                  {STATUS_LABELS[campaign.status ?? 'draft'] ?? campaign.status}
                </span>
              )}
              {dateRange && (
                <span className="text-sm text-muted-foreground">{dateRange}</span>
              )}
              {campaign?.createdAt && (
                <span className="text-sm text-muted-foreground">
                  Criada em {formatDate(campaign.createdAt)}
                </span>
              )}
              {refreshing && (
                <span className="text-xs text-muted-foreground">Atualizando...</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/campanhas/${id}/editar`}
              className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
            >
              Editar
            </Link>
            <Link
              href={`/campanhas/${id}/mensagens`}
              className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
            >
              Mensagens
            </Link>
            <Link
              href="/campanhas"
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Lista
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={cn(
                  'p-3 rounded border text-sm',
                  alert.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                )}
              >
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Campaign info cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Segment */}
          <div className="border rounded-lg p-4 space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Segmento</p>
            {segment ? (
              <div className="space-y-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
                  {segment.name}
                </span>
                {segment.audienceCount !== undefined && segment.audienceCount > 0 && (
                  <p className="text-xs text-muted-foreground">{segment.audienceCount.toLocaleString('pt-BR')} contatos</p>
                )}
              </div>
            ) : campaign?.segmentId ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <p className="text-sm text-muted-foreground">Sem segmento</p>
            )}
          </div>

          {/* Assigned chips */}
          <div className="border rounded-lg p-4 space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Chips</p>
            {assignedChips.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {assignedChips.slice(0, 3).map((chip) => (
                  <span
                    key={chip.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs bg-muted"
                  >
                    {chip.profilePicture ? (
                      <img
                        src={chip.profilePicture}
                        alt={chip.name}
                        className="h-3.5 w-3.5 rounded-full object-cover"
                      />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                        {chip.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="max-w-[80px] truncate">{chip.name}</span>
                  </span>
                ))}
                {assignedChips.length > 3 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs bg-muted text-muted-foreground">
                    +{assignedChips.length - 3}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem chips atribuidos</p>
            )}
          </div>

          {/* Send config */}
          <div className="border rounded-lg p-4 space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Configuracao</p>
            {campaign ? (
              <div className="text-xs space-y-0.5 text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">
                    {sendRateLabel[campaign.sendRate ?? 'normal'] ?? campaign.sendRate}
                  </span>
                  {' '}— {(campaign.minDelayMs ?? 15000) / 1000}s – {(campaign.maxDelayMs ?? 60000) / 1000}s
                </p>
                <p>Janela: {campaign.windowStart ?? '08:00'} – {campaign.windowEnd ?? '22:00'}</p>
                <p>Lote: {campaign.batchSize ?? 10} msgs/rodada</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            )}
          </div>

          {/* Message preview */}
          <div className="border rounded-lg p-4 space-y-1.5 sm:col-span-2 lg:col-span-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Mensagem</p>
            {campaign ? (
              <div className="space-y-1">
                <p className="text-sm leading-relaxed line-clamp-3">
                  {messageExpanded ? template : templateShort}
                  {!messageExpanded && templateTruncated && '...'}
                </p>
                {templateTruncated && (
                  <button
                    onClick={() => setMessageExpanded((v) => !v)}
                    className="text-xs text-primary hover:underline"
                  >
                    {messageExpanded ? 'Mostrar menos' : 'Ver completa'}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            )}
          </div>
        </div>

        {/* KPI row */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard
              label="Total Enviados"
              value={totalSent.toLocaleString('pt-BR')}
              sub={`de ${funnel.total.toLocaleString('pt-BR')} na fila`}
            />
            <KpiCard
              label="Taxa Entrega"
              value={`${deliveryRate}%`}
              sub={`${funnel.delivered.toLocaleString('pt-BR')} entregues`}
              colorClass={deliveryRate >= 95 ? 'text-green-700' : deliveryRate >= 90 ? '' : 'text-red-700'}
            />
            <KpiCard
              label="Taxa Leitura"
              value={`${readRate}%`}
              sub={`${funnel.read.toLocaleString('pt-BR')} lidas`}
              colorClass={readRate >= 70 ? 'text-green-700' : readRate >= 50 ? '' : 'text-amber-700'}
            />
            <KpiCard
              label="Taxa Resposta"
              value={`${replyRate}%`}
              sub={`${funnel.replied.toLocaleString('pt-BR')} respostas`}
              colorClass={replyRate >= 20 ? 'text-green-700' : replyRate >= 10 ? '' : undefined}
            />
            <KpiCard
              label="Taxa Falha"
              value={`${failureRate}%`}
              sub={`${funnel.failed.toLocaleString('pt-BR')} falhas`}
              colorClass={failureRate > 10 ? 'text-red-700' : failureRate > 5 ? 'text-amber-700' : 'text-muted-foreground'}
            />
          </div>
        )}

        {/* Conversion Funnel */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Funil de Conversao</h2>
          <ConversionFunnel data={funnel} />
        </div>

        {/* Two columns: Timeline + Chip Breakdown */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Timeline de Entregas</h2>
            <DeliveryTimeline events={timeline} />
          </div>
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Performance por Chip</h2>
            <ChipBreakdown breakdown={chipBreakdown} />
          </div>
        </div>

        {/* AI Insights panel */}
        <AIInsightsPanel
          analysis={aiAnalysis}
          loading={aiLoading}
          onRefresh={fetchAiAnalysis}
        />

        {/* Anti-ban Dashboard */}
        {antiBanStats && campaign && (
          <div className="border rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold">Protecao Anti-Ban</h2>
              {antiBanStats.circuitBreakerStatus === 'tripped' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 border border-red-300 px-3 py-0.5 text-xs font-semibold text-red-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                  Circuit Breaker Ativado
                </span>
              )}
            </div>

            <div className="rounded-md border bg-muted/30 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className={cn(
                  'h-2 w-2 rounded-full',
                  antiBanStats.circuitBreakerStatus === 'tripped' ? 'bg-red-500' :
                  antiBanStats.circuitBreakerStatus === 'disabled' ? 'bg-slate-400' :
                  'bg-green-500',
                )} />
                <span className="font-medium">
                  {antiBanStats.circuitBreakerStatus === 'tripped' ? 'Disparado — Envio Pausado' :
                   antiBanStats.circuitBreakerStatus === 'disabled' ? 'Circuit Breaker Desativado' :
                   'Circuit Breaker Ativo'}
                </span>
              </div>
              {campaign.circuitBreakerThreshold ? (
                <span className="text-xs text-muted-foreground">
                  Limite: {campaign.circuitBreakerThreshold}% de erro
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Limiar nao configurado</span>
              )}
            </div>

            {antiBanStats.chipStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Chip</th>
                      <th className="pb-2 pr-3 font-medium">Status</th>
                      <th className="pb-2 pr-3 font-medium">Fase</th>
                      <th className="pb-2 pr-3 font-medium">Enviadas Hoje</th>
                      <th className="pb-2 pr-3 font-medium">Erro</th>
                      <th className="pb-2 font-medium">Proxy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {antiBanStats.chipStats.map((chip) => {
                      const dailyPct = chip.dailyLimit > 0 ? chip.messagesSentToday / chip.dailyLimit : 0;
                      const health = HEALTH_LABELS[chip.healthStatus] ?? { label: chip.healthStatus, dotColor: 'bg-gray-400' };
                      return (
                        <tr key={chip.chipId} className="text-xs">
                          <td className="py-2 pr-3 font-medium text-foreground">{chip.chipName}</td>
                          <td className="py-2 pr-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', health.dotColor)} />
                              {health.label}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">{chip.warmupStage}</td>
                          <td className="py-2 pr-3">
                            <div className="space-y-1 min-w-[100px]">
                              <div className="flex items-center justify-between text-xs gap-2">
                                <span>{chip.messagesSentToday}/{chip.dailyLimit}</span>
                                <span className={cn(
                                  'text-[10px] font-medium',
                                  dailyPct >= 0.9 ? 'text-red-600' :
                                  dailyPct >= 0.7 ? 'text-yellow-600' :
                                  'text-muted-foreground',
                                )}>
                                  {Math.round(dailyPct * 100)}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted">
                                <div
                                  className={cn(
                                    'h-1.5 rounded-full transition-all',
                                    dailyPct >= 0.9 ? 'bg-red-500' :
                                    dailyPct >= 0.7 ? 'bg-yellow-500' :
                                    'bg-green-500',
                                  )}
                                  style={{ width: `${Math.min(dailyPct * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-2 pr-3">
                            <span className={cn(
                              'font-mono font-medium',
                              chip.errorRate > 3 ? 'text-red-600' :
                              chip.errorRate > 1 ? 'text-yellow-600' :
                              'text-muted-foreground',
                            )}>
                              {chip.errorRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2">
                            {chip.hasProxy ? (
                              <span className="text-blue-600 font-medium">Sim</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum chip atribuido a esta campanha.</p>
            )}

            {/* Send config */}
            <div className="rounded-md border bg-muted/20 p-4 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Configuracao de Envio</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Velocidade:</span>
                  <span className="font-medium">{sendRateLabel[campaign.sendRate ?? 'normal'] ?? campaign.sendRate}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Intervalo:</span>
                  <span className="font-medium">{(campaign.minDelayMs ?? 15000) / 1000}s – {(campaign.maxDelayMs ?? 60000) / 1000}s</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Janela:</span>
                  <span className="font-medium">{campaign.windowStart ?? '08:00'} – {campaign.windowEnd ?? '22:00'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Pausa:</span>
                  <span className="font-medium">A cada {campaign.restPauseEvery ?? 20} msgs · {((campaign.restPauseDurationMs ?? 180000) / 60000).toFixed(0)} min</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Lote:</span>
                  <span className="font-medium">{campaign.batchSize ?? 10} msgs/rodada</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaign details */}
        {campaign && (
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Detalhes da Campanha</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Template</span>
                <p className="mt-2 p-3 bg-muted rounded text-sm leading-relaxed">{campaign.template}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agendado para:</span>
                  <span>{formatDate(campaign.scheduledAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criada em:</span>
                  <span>{formatDate(campaign.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Atualizada em:</span>
                  <span>{formatDate(campaign.updatedAt)}</span>
                </div>
                {campaign.abEnabled && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teste A/B:</span>
                    <span>Ativo ({campaign.abSplitPercent}% / {100 - (campaign.abSplitPercent || 50)}%)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </SidebarLayout>
  );
}
