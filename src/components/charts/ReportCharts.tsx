'use client';

import { useMemo } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { Campaign } from '@/db/schema';

export interface DailyBar {
  date: string;
  value: number;
}

export function DailyBarChart({ bars }: { bars: DailyBar[] }) {
  if (bars.length === 0) return <p className="text-xs text-muted-foreground text-center py-8">Sem dados no período</p>;
  return (
    <ResponsiveContainer width="100%" height={180} minWidth={300}>
      <RechartsBarChart data={bars} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} width={32} />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
          labelStyle={{ fontWeight: 600 }}
          formatter={(value) => [typeof value === 'number' ? value.toLocaleString('pt-BR') : value, 'Enviados']}
        />
        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ campaigns }: { campaigns: Campaign[] }) {
  const data = useMemo(() => {
    const byDay = new Map<string, { date: string; sent: number; delivered: number; read: number }>();
    for (const c of campaigns) {
      const source = c.updatedAt ?? c.createdAt;
      if (!source) continue;
      const d = new Date(source);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const existing = byDay.get(key) ?? { date: key, sent: 0, delivered: 0, read: 0 };
      existing.sent += c.totalSent ?? 0;
      existing.delivered += c.totalDelivered ?? 0;
      existing.read += c.totalRead ?? 0;
      byDay.set(key, existing);
    }
    return Array.from(byDay.values());
  }, [campaigns]);

  if (data.length === 0) return <p className="text-xs text-muted-foreground text-center py-8">Sem dados no período</p>;

  return (
    <ResponsiveContainer width="100%" height={180} minWidth={300}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} width={32} />
        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
        <Legend wrapperStyle={{ fontSize: '11px' }} />
        <Line type="monotone" dataKey="sent" stroke="hsl(var(--primary))" strokeWidth={2} name="Enviados" dot={false} />
        <Line type="monotone" dataKey="delivered" stroke="#22c55e" strokeWidth={2} name="Entregues" dot={false} />
        <Line type="monotone" dataKey="read" stroke="#3b82f6" strokeWidth={2} name="Lidos" dot={false} />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

export function ConversionFunnel({ campaigns }: { campaigns: Campaign[] }) {
  const funnel = useMemo(() => {
    const totals = { sent: 0, delivered: 0, read: 0, replied: 0 };
    for (const c of campaigns) {
      totals.sent += c.totalSent ?? 0;
      totals.delivered += c.totalDelivered ?? 0;
      totals.read += c.totalRead ?? 0;
      totals.replied += c.totalReplied ?? 0;
    }
    return totals;
  }, [campaigns]);

  if (funnel.sent === 0) return <p className="text-xs text-muted-foreground text-center py-8">Sem dados de envio</p>;

  const steps = [
    { label: 'Enviados', value: funnel.sent, color: 'bg-primary' },
    { label: 'Entregues', value: funnel.delivered, color: 'bg-green-500' },
    { label: 'Lidos', value: funnel.read, color: 'bg-blue-500' },
    { label: 'Respondidos', value: funnel.replied, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const pct = funnel.sent > 0 ? (step.value / funnel.sent) * 100 : 0;
        const dropOff = i > 0 ? ((steps[i - 1].value - step.value) / Math.max(steps[i - 1].value, 1) * 100).toFixed(0) : null;
        return (
          <div key={step.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{step.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{step.value.toLocaleString('pt-BR')}</span>
                <span className="text-muted-foreground font-mono">({pct.toFixed(1)}%)</span>
                {dropOff && <span className="text-[10px] text-red-500">-{dropOff}%</span>}
              </div>
            </div>
            <div className="h-6 rounded-md bg-muted overflow-hidden">
              <div className={cn('h-full rounded-md transition-all', step.color)} style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
