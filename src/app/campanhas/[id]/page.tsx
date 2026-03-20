import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ConversionFunnel } from '@/components/conversion-funnel';
import { DeliveryTimeline } from '@/components/delivery-timeline';
import { ChipBreakdown } from '@/components/chip-breakdown';
import type { FunnelData } from '@/app/api/campaigns/[id]/funnel/route';
import SidebarLayout from '@/components/SidebarLayout';
import { cn } from '@/lib/utils';

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

function getStatusBadge(status: string) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    sending: 'bg-yellow-100 text-yellow-700',
    sent: 'bg-green-100 text-green-700',
    paused: 'bg-orange-100 text-orange-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function getCampaignAnalytics(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/campaigns/${id}/analytics`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

// ─── Anti-ban stats fetcher ───────────────────────────────────────────────────

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

async function getAntiBanStats(id: string): Promise<AntiBanStats | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/campaigns?id=${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const campaign = Array.isArray(data) ? data[0] : null;
    if (!campaign) return null;
    return {
      chipStats: campaign.chipStats ?? [],
      circuitBreakerStatus: campaign.circuitBreakerStatus ?? 'disabled',
    };
  } catch {
    return null;
  }
}

// ─── Health status labels ─────────────────────────────────────────────────────

const HEALTH_LABELS: Record<string, { label: string; dotColor: string }> = {
  healthy:      { label: 'Saudável',     dotColor: 'bg-green-500' },
  degraded:     { label: 'Degradado',    dotColor: 'bg-yellow-500' },
  cooldown:     { label: 'Descanso',     dotColor: 'bg-orange-500' },
  quarantined:  { label: 'Quarentena',   dotColor: 'bg-red-500' },
  banned:       { label: 'Banido',       dotColor: 'bg-red-900' },
  warming_up:   { label: 'Aquecendo',    dotColor: 'bg-blue-500' },
  disconnected: { label: 'Desconectado', dotColor: 'bg-slate-400' },
  not_found:    { label: 'Não encontrado', dotColor: 'bg-gray-500' },
};

// ─── Anti-ban panel component ─────────────────────────────────────────────────

function AntiBanPanel({
  stats,
  campaign,
}: {
  stats: AntiBanStats;
  campaign: {
    circuitBreakerThreshold: number | null | undefined;
    sendRate: string | null | undefined;
    minDelayMs: number | null | undefined;
    maxDelayMs: number | null | undefined;
    windowStart: string | null | undefined;
    windowEnd: string | null | undefined;
    restPauseEvery: number | null | undefined;
    restPauseDurationMs: number | null | undefined;
    batchSize: number | null | undefined;
  };
}) {
  const { chipStats, circuitBreakerStatus } = stats;

  // Build smart recommendations
  const recommendations: string[] = [];
  const highErrorChips = chipStats.filter((c) => c.errorRate > 3);
  const nearLimitChips = chipStats.filter((c) => c.dailyLimit > 0 && c.messagesSentToday / c.dailyLimit > 0.9);
  const hasAnyProxy = chipStats.some((c) => c.hasProxy);
  const allHealthy = chipStats.every((c) => c.healthStatus === 'healthy') && chipStats.every((c) => c.errorRate < 1);

  for (const c of highErrorChips) {
    recommendations.push(`⚠️ Chip ${c.chipName} com taxa de erro alta (${c.errorRate}%). Considere reduzir a velocidade.`);
  }
  for (const c of nearLimitChips) {
    recommendations.push(`⚠️ Chip ${c.chipName} próximo do limite diário. Adicione mais chips.`);
  }
  if (chipStats.length > 0 && !hasAnyProxy) {
    recommendations.push('💡 Configure proxies nos chips para reduzir risco de bloqueio.');
  }
  if (allHealthy && chipStats.length > 0) {
    recommendations.push('✅ Todos os chips operando normalmente.');
  }

  const sendRateLabel: Record<string, string> = { slow: 'Lento', normal: 'Normal', fast: 'Rápido' };

  return (
    <div className="border rounded-lg p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          🛡️ Proteção Anti-Ban
        </h2>
        {circuitBreakerStatus === 'tripped' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 border border-red-300 px-3 py-0.5 text-xs font-semibold text-red-700">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            Circuit Breaker Ativado
          </span>
        )}
      </div>

      {/* Circuit Breaker Status */}
      <div className="rounded-md border bg-muted/30 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className={cn(
            'h-2 w-2 rounded-full',
            circuitBreakerStatus === 'tripped'  ? 'bg-red-500' :
            circuitBreakerStatus === 'disabled' ? 'bg-slate-400' :
            'bg-green-500',
          )} />
          <span className="font-medium">
            {circuitBreakerStatus === 'tripped'  ? 'Disparado — Envio Pausado' :
             circuitBreakerStatus === 'disabled' ? 'Circuit Breaker Desativado' :
             'Circuit Breaker Ativo'}
          </span>
        </div>
        {campaign.circuitBreakerThreshold ? (
          <span className="text-xs text-muted-foreground">
            Limite: {campaign.circuitBreakerThreshold}% de erro
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Limiar não configurado</span>
        )}
      </div>

      {/* Per-chip status table */}
      {chipStats.length > 0 ? (
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
              {chipStats.map((chip) => {
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
                        <span className="text-blue-600 font-medium">✓</span>
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
        <p className="text-sm text-muted-foreground">Nenhum chip atribuído a esta campanha.</p>
      )}

      {/* Smart recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recomendações</p>
          {recommendations.map((rec, i) => (
            <p key={i} className="text-sm text-muted-foreground">{rec}</p>
          ))}
        </div>
      )}

      {/* Send config summary */}
      <div className="rounded-md border bg-muted/20 p-4 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Configuração de Envio</p>
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
  );
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Get campaign
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);

  if (!campaign) {
    notFound();
  }

  // Get analytics
  const analytics = await getCampaignAnalytics(id);

  // Get anti-ban stats
  const antiBanStats = await getAntiBanStats(id);

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
  const chipBreakdown = analytics?.chipBreakdown ?? [];
  const alerts = analytics?.alerts ?? [];

  return (
    <SidebarLayout currentPage="campanhas" pageTitle="Campanha">
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusBadge(campaign.status ?? 'draft')}`}>
              {campaign.status ?? 'draft'}
            </span>
            <span className="text-sm text-muted-foreground">
              Criada em {formatDate(campaign.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/campanhas/${id}/mensagens`}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Ver mensagens
          </Link>
          <Link
            href="/campanhas"
            className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert: { type: string; message: string }, index: number) => (
            <div
              key={index}
              className={`p-3 rounded text-sm ${
                alert.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
              }`}
            >
              {alert.type === 'error' ? '⚠️' : '⚡'} {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Conversion Funnel */}
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Funil de Conversão</h2>
        <ConversionFunnel data={funnel} />
      </div>

      {/* Two columns: Timeline + Chip Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Delivery Timeline */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Timeline de Entregas</h2>
          <DeliveryTimeline events={timeline} />
        </div>

        {/* Chip Breakdown */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Performance por Chip</h2>
          <ChipBreakdown breakdown={chipBreakdown} />
        </div>
      </div>

      {/* Anti-ban Dashboard */}
      {antiBanStats && (
        <AntiBanPanel stats={antiBanStats} campaign={campaign} />
      )}

      {/* Campaign Details */}
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Detalhes da Campanha</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Template:</span>
            <p className="mt-1 p-3 bg-muted rounded">{campaign.template}</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agendado para:</span>
              <span>{formatDate(campaign.scheduledAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Janela de envio:</span>
              <span>{campaign.windowStart} - {campaign.windowEnd}</span>
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
    </div>
    </SidebarLayout>
  );
}