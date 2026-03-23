'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPIData {
  totalSent: number;
  deliveredRate: number;
  readRate: number;
  replyRate: number;
  groupJoinRate: number;
  trends?: {
    delivered: number;  // percentage change
    read: number;
    reply: number;
    groupJoin: number;
  };
}

interface ConversionKPIsProps {
  data: KPIData;
  loading?: boolean;
}

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: number;
  color: string;
}

function KPICard({ label, value, trend, color }: KPICardProps) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 min-w-0">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</span>
      <span className={`text-2xl font-semibold tabular-nums truncate ${color}`}>{value}</span>
      {trend !== undefined && (
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {trend > 0 ? (
            <>
              <TrendingUp className="h-3 w-3 text-green-500 shrink-0" />
              <span className="text-green-600">+{trend}%</span>
            </>
          ) : trend < 0 ? (
            <>
              <TrendingDown className="h-3 w-3 text-red-500 shrink-0" />
              <span className="text-red-600">{trend}%</span>
            </>
          ) : (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/30 shrink-0" />
              <span className="text-muted-foreground font-normal">sem variação</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ConversionKPIs({ data, loading }: ConversionKPIsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-lg border p-3 animate-pulse h-20 bg-muted" />
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Enviados',
      value: data.totalSent.toLocaleString('pt-BR'),
      color: 'text-blue-600',
      trend: undefined,
    },
    {
      label: 'Entrega',
      value: `${data.deliveredRate}%`,
      color: 'text-green-600',
      trend: data.trends?.delivered,
    },
    {
      label: 'Leitura',
      value: `${data.readRate}%`,
      color: 'text-purple-600',
      trend: data.trends?.read,
    },
    {
      label: 'Respostas',
      value: `${data.replyRate}%`,
      color: 'text-orange-600',
      trend: data.trends?.reply,
    },
    {
      label: 'Grupos',
      value: `${data.groupJoinRate}%`,
      color: 'text-emerald-600',
      trend: data.trends?.groupJoin,
    },
  ];

  // Show "no data" state when everything is zero
  const hasData = data.totalSent > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma campanha enviada ainda</p>
        <p className="text-xs text-muted-foreground mt-1">KPIs serão exibidos após o primeiro envio</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap divide-x divide-border">
      {kpis.map((kpi) => (
        <KPICard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}