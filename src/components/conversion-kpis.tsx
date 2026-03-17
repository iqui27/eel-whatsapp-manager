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
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {trend !== undefined && (
        <div className="flex items-center justify-center gap-0.5 mt-1 text-xs">
          {trend > 0 ? (
            <>
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-600">+{trend}%</span>
            </>
          ) : trend < 0 ? (
            <>
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span className="text-red-600">{trend}%</span>
            </>
          ) : (
            <>
              <Minus className="h-3 w-3 text-gray-400" />
              <span className="text-gray-500">0%</span>
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {kpis.map((kpi) => (
        <KPICard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}