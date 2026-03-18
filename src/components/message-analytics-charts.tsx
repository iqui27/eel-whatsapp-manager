'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Smartphone,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HourlyStats {
  hour: number;
  sent: number;
  delivered: number;
  failed: number;
}

interface DailyStats {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
  replies: number;
  groupJoins: number;
}

interface ChipPerformance {
  chipId: string;
  chipName: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
  failureRate: number;
}

interface BestSendTime {
  hour: number;
  deliveryRate: number;
  readRate: number;
  count: number;
}

interface AnalyticsData {
  hourlyStats: HourlyStats[];
  dailyStats: DailyStats[];
  chipPerformance: ChipPerformance[];
  bestSendTimes: BestSendTime[];
  summary: {
    totalMessages: number;
    delivered: number;
    read: number;
    failed: number;
    avgDeliveryTime: number | null;
    avgReadTime: number | null;
  };
}

interface MessageAnalyticsChartsProps {
  data: AnalyticsData;
  loading?: boolean;
}

// Color palette
const COLORS = {
  sent: '#6366f1',     // Indigo
  delivered: '#22c55e', // Green
  read: '#a855f7',      // Purple
  failed: '#ef4444',    // Red
  replies: '#3b82f6',   // Blue
  joins: '#f59e0b',     // Amber
};

// Format seconds to human readable
function formatDuration(seconds: number | null): string {
  if (seconds === null) return '-';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${Math.round(seconds / 3600)}h`;
}

// Simple SVG Bar Chart
function SimpleBarChart({ 
  data, 
  valueKey, 
  label, 
  color, 
  height = 100 
}: { 
  data: DailyStats[];
  valueKey: 'sent' | 'delivered' | 'failed' | 'replies' | 'groupJoins';
  label: string;
  color: string;
  height?: number;
}) {
  const values = data.map(d => d[valueKey]);
  const max = Math.max(...values, 1);
  const barWidth = Math.max(100 / data.length - 1, 4);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>Máx: {max}</span>
      </div>
      <svg width="100%" height={height} className="overflow-visible">
        {data.map((d, i) => {
          const value = d[valueKey] as number;
          const barHeight = (value / max) * (height - 20);
          const x = (i / data.length) * 100;
          
          return (
            <g key={d.date}>
              <rect
                x={`${x}%`}
                y={height - barHeight - 10}
                width={`${barWidth}%`}
                height={barHeight}
                fill={color}
                rx="2"
                className="transition-all duration-200 hover:opacity-80"
              />
              {i % Math.ceil(data.length / 7) === 0 && (
                <text
                  x={`${x + barWidth / 2}%`}
                  y={height}
                  fontSize="9"
                  fill="currentColor"
                  textAnchor="middle"
                  className="text-muted-foreground"
                >
                  {new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Hourly Distribution Chart
function HourlyDistributionChart({ data }: { data: HourlyStats[] }) {
  const maxSent = Math.max(...data.map(d => d.sent), 1);
  const activeHours = data.filter(h => h.sent > 0);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Distribuição por Hora</h3>
      <div className="flex items-end gap-0.5 h-24">
        {data.map((hour) => {
          const height = maxSent > 0 ? (hour.sent / maxSent) * 100 : 0;
          return (
            <motion.div
              key={hour.hour}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(height, 2)}%` }}
              transition={{ delay: hour.hour * 0.02 }}
              className={cn(
                'flex-1 rounded-t transition-colors cursor-pointer',
                hour.sent > 0 ? 'bg-indigo-400 hover:bg-indigo-500' : 'bg-muted'
              )}
              title={`${hour.hour}:00 - ${hour.sent} enviadas, ${hour.delivered} entregues`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Pico: {activeHours.sort((a, b) => b.sent - a.sent)[0]?.hour ?? 0}h
      </p>
    </div>
  );
}

// Chip Performance Table
function ChipPerformanceTable({ data }: { data: ChipPerformance[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhum dado de chip disponível
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Performance por Chip</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Chip</th>
              <th className="text-right py-2 font-medium">Enviados</th>
              <th className="text-right py-2 font-medium">Entregues</th>
              <th className="text-right py-2 font-medium">Taxa</th>
              <th className="text-right py-2 font-medium">Falhas</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.slice(0, 5).map((chip) => (
              <motion.tr
                key={chip.chipId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="hover:bg-muted/50"
              >
                <td className="py-2 flex items-center gap-2">
                  <Smartphone className="h-3 w-3 text-muted-foreground" />
                  {chip.chipName}
                </td>
                <td className="text-right py-2 font-mono">{chip.sent}</td>
                <td className="text-right py-2 font-mono">{chip.delivered}</td>
                <td className="text-right py-2">
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
                    chip.deliveryRate >= 90 ? 'bg-green-100 text-green-700' :
                    chip.deliveryRate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  )}>
                    {chip.deliveryRate}%
                    {chip.deliveryRate >= 90 ? <TrendingUp className="h-3 w-3" /> : null}
                    {chip.deliveryRate < 70 ? <TrendingDown className="h-3 w-3" /> : null}
                  </span>
                </td>
                <td className="text-right py-2">
                  {chip.failed > 0 ? (
                    <span className="text-red-600 font-mono">{chip.failed}</span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Best Send Times
function BestSendTimesCard({ data }: { data: BestSendTime[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        Dados insuficientes para análise
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Melhores Horários
      </h3>
      <div className="space-y-2">
        {data.slice(0, 5).map((time, i) => (
          <div key={time.hour} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium',
                i === 0 ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
              )}>
                {i + 1}
              </span>
              <span>{time.hour}:00 - {time.hour + 1}:00</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">{time.count} msgs</span>
              <span className={cn(
                'font-medium',
                time.deliveryRate >= 90 ? 'text-green-600' : 'text-foreground'
              )}>
                {time.deliveryRate}% entrega
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Summary Cards
function SummaryCards({ summary }: { summary: AnalyticsData['summary'] }) {
  const cards = [
    {
      label: 'Total Enviadas',
      value: summary.totalMessages,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Entregues',
      value: summary.delivered,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Lidas',
      value: summary.read,
      icon: Eye,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Falharam',
      value: summary.failed,
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-lg p-3', card.bg)}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{card.label}</span>
            <card.icon className={cn('h-4 w-4', card.color)} />
          </div>
          <p className={cn('text-lg font-semibold', card.color)}>
            {card.value.toLocaleString('pt-BR')}
          </p>
          {summary.totalMessages > 0 && card.label !== 'Total Enviadas' && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {Math.round((card.value / summary.totalMessages) * 100)}% do total
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export function MessageAnalyticsCharts({ data, loading = false }: MessageAnalyticsChartsProps) {
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg p-3 bg-muted h-20" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4 h-64 bg-muted" />
          <div className="rounded-lg border p-4 h-64 bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <SummaryCards summary={data.summary} />

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <div className="rounded-lg border border-border bg-card p-4">
          <SimpleBarChart
            data={data.dailyStats}
            valueKey="sent"
            label="Mensagens por Dia"
            color={COLORS.sent}
            height={120}
          />
          {data.summary.avgDeliveryTime && (
            <p className="text-xs text-muted-foreground mt-3">
              Tempo médio de entrega: {formatDuration(data.summary.avgDeliveryTime)}
            </p>
          )}
        </div>

        {/* Hourly Distribution */}
        <div className="rounded-lg border border-border bg-card p-4">
          <HourlyDistributionChart data={data.hourlyStats} />
        </div>

        {/* Chip Performance */}
        <div className="rounded-lg border border-border bg-card p-4">
          <ChipPerformanceTable data={data.chipPerformance} />
        </div>

        {/* Best Send Times */}
        <div className="rounded-lg border border-border bg-card p-4">
          <BestSendTimesCard data={data.bestSendTimes} />
        </div>
      </div>

      {/* Delivery vs Replies Chart */}
      {data.dailyStats.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="grid md:grid-cols-2 gap-6">
            <SimpleBarChart
              data={data.dailyStats}
              valueKey="delivered"
              label="Entregas por Dia"
              color={COLORS.delivered}
              height={100}
            />
            <SimpleBarChart
              data={data.dailyStats}
              valueKey="replies"
              label="Respostas por Dia"
              color={COLORS.replies}
              height={100}
            />
          </div>
        </div>
      )}
    </div>
  );
}