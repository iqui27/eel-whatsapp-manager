'use client';

import { useCallback, useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, TrendingUp, TrendingDown, Send, CheckCheck, MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Campaign } from '@/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = '7' | '14';

interface DayBar {
  date: string;
  value: number;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  sending: 'Enviando',
  sent: 'Enviada',
  paused: 'Pausada',
  cancelled: 'Cancelada',
};

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  scheduled: 'bg-blue-500/10 text-blue-600 border-blue-200',
  sending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  sent: 'bg-green-500/10 text-green-600 border-green-200',
  paused: 'bg-orange-500/10 text-orange-600 border-orange-200',
  cancelled: 'bg-red-500/10 text-red-600 border-red-200',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(numerator: number, denominator: number): string {
  if (!denominator) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function getCampaignDate(campaign: Campaign): Date | null {
  const source = campaign.updatedAt ?? campaign.createdAt;
  if (!source) return null;
  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPeriodDays(period: Period): number {
  return period === '7' ? 7 : 14;
}

function filterCampaignsByPeriod(campaigns: Campaign[], period: Period, referenceDate: Date | null) {
  if (!referenceDate) return [];
  const windowDays = getPeriodDays(period);
  const now = new Date(referenceDate);
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (windowDays - 1));

  return campaigns.filter((campaign) => {
    const campaignDate = getCampaignDate(campaign);
    return campaignDate ? campaignDate >= start && campaignDate <= now : false;
  });
}

function buildDailyBars(campaigns: Campaign[], period: Period, referenceDate: Date | null): DayBar[] {
  if (!referenceDate) return [];
  const windowDays = getPeriodDays(period);
  const now = new Date(referenceDate);
  now.setHours(0, 0, 0, 0);

  const totalsByDay = new Map<string, number>();
  for (const campaign of campaigns) {
    const campaignDate = getCampaignDate(campaign);
    if (!campaignDate) continue;
    const dayKey = campaignDate.toISOString().slice(0, 10);
    totalsByDay.set(dayKey, (totalsByDay.get(dayKey) ?? 0) + (campaign.totalSent ?? 0));
  }

  return Array.from({ length: windowDays }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (windowDays - index - 1));
    const key = date.toISOString().slice(0, 10);
    return {
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: totalsByDay.get(key) ?? 0,
    };
  });
}

function exportCsv(
  campaigns: Campaign[],
  summary: {
    periodLabel: string;
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    totalReplied: number;
  },
) {
  const header = 'Campanha,Status,Enviadas,Entregues (%),Lidas (%),Respondidas (%),Data';
  const rows = campaigns.map(c => {
    const sent = c.totalSent ?? 0;
    const delivered = c.totalDelivered ?? 0;
    const read = c.totalRead ?? 0;
    const replied = c.totalReplied ?? 0;
    return [
      c.name,
      STATUS_LABELS[c.status ?? 'draft'] ?? c.status,
      sent,
      pct(delivered, sent),
      pct(read, sent),
      pct(replied, sent),
      c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : '—',
    ].map(v => `"${v}"`).join(',');
  });
  const summaryRows = [
    'Período,Enviadas,Entregues,Respostas,Bloqueios',
    [
      summary.periodLabel,
      summary.totalSent,
      summary.totalDelivered,
      summary.totalReplied,
      summary.totalFailed,
    ].map((value) => `"${value}"`).join(','),
    '',
  ];
  const csv = [...summaryRows, header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-campanhas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Inline SVG bar chart ─────────────────────────────────────────────────────

function BarChart({ bars }: { bars: DayBar[] }) {
  const max = Math.max(...bars.map(b => b.value), 1);
  const chartH = 120;
  const barW = Math.min(48, Math.floor(480 / bars.length) - 8);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${bars.length * (barW + 12)} ${chartH + 32}`}
        className="w-full"
        style={{ minWidth: bars.length * (barW + 12) }}
        aria-label="Gráfico de envios"
      >
        {bars.map((bar, i) => {
          const barH = Math.max(4, (bar.value / max) * chartH);
          const x = i * (barW + 12);
          const y = chartH - barH;
          return (
            <g key={bar.date}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                className="fill-primary opacity-80 hover:opacity-100 transition-opacity"
              />
              <text
                x={x + barW / 2}
                y={chartH + 16}
                textAnchor="middle"
                fontSize={10}
                className="fill-muted-foreground"
              >
                {bar.date}
              </text>
              <title>{`${bar.date}: ${bar.value.toLocaleString('pt-BR')}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Trend indicator ──────────────────────────────────────────────────────────

function Trend({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const positive = value > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', positive ? 'text-green-600' : 'text-red-600')}>
      <Icon className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  trend: number;
  icon: React.ComponentType<{ className?: string }>;
  suffix?: string;
}

function KpiCard({ label, value, trend, icon: Icon, suffix }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold tabular-nums">
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          {suffix && <span className="text-base text-muted-foreground ml-0.5">{suffix}</span>}
        </span>
        <div className="mb-0.5">
          <Trend value={trend} />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const [period, setPeriod] = useState<Period>('7');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [referenceDate, setReferenceDate] = useState<Date | null>(null);

  useEffect(() => {
    setReferenceDate(new Date());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) setCampaigns(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredCampaigns = filterCampaignsByPeriod(campaigns, period, referenceDate);
  const totalSent = filteredCampaigns.reduce((sum, campaign) => sum + (campaign.totalSent ?? 0), 0);
  const totalDelivered = filteredCampaigns.reduce((sum, campaign) => sum + (campaign.totalDelivered ?? 0), 0);
  const totalFailed = filteredCampaigns.reduce((sum, campaign) => sum + (campaign.totalFailed ?? 0), 0);
  const totalReplied = filteredCampaigns.reduce((sum, campaign) => sum + (campaign.totalReplied ?? 0), 0);
  const bars = buildDailyBars(filteredCampaigns, period, referenceDate);
  const periodLabel = period === '7' ? 'Últimos 7 dias' : 'Últimos 14 dias';

  return (
    <SidebarLayout currentPage="relatorios">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-foreground">Relatórios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Desempenho das campanhas e alcance eleitoral</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={v => setPeriod(v as Period)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="14">Últimos 14 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(filteredCampaigns, {
                periodLabel,
                totalSent,
                totalDelivered,
                totalFailed,
                totalReplied,
              })}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Mensagens enviadas" value={totalSent} trend={0} icon={Send} />
          <KpiCard label="Entregues" value={totalDelivered} trend={0} icon={CheckCheck} />
          <KpiCard label="Respostas" value={totalReplied} trend={0} icon={MessageSquare} />
          <KpiCard label="Bloqueios" value={totalFailed} trend={0} icon={Users} />
        </div>

        {/* Bar Chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4 text-foreground">Volume de envios — {periodLabel.toLowerCase()}</h2>
          <BarChart bars={bars} />
        </div>

        {/* Campaign performance table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Desempenho por campanha</h2>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Campanha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Enviadas</TableHead>
                  <TableHead className="text-right">Entregues</TableHead>
                  <TableHead className="text-right">Lidas</TableHead>
                  <TableHead className="text-right">Respondidas</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Nenhuma campanha enviada neste período. Crie campanhas em{' '}
                      <a href="/campanhas" className="underline text-primary">Campanhas</a>.
                    </TableCell>
                  </TableRow>
                ) : filteredCampaigns.map(c => {
                  const sent = c.totalSent ?? 0;
                  const delivered = c.totalDelivered ?? 0;
                  const read = c.totalRead ?? 0;
                  const replied = c.totalReplied ?? 0;
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', STATUS_CLASSES[c.status ?? 'draft'])}>
                          {STATUS_LABELS[c.status ?? 'draft']}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{sent.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{pct(delivered, sent)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{pct(read, sent)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{pct(replied, sent)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
