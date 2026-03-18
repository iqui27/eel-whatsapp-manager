'use client';

import { RefreshCw, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChipHealthData {
  id: string;
  name: string;
  phone: string;
  healthStatus: string;
  messagesSentToday: number;
  dailyLimit: number;
  lastWebhookEvent: Date | null;
  lastHealthCheck: Date | null;
  // Failover state
  isFallbackFor?: string[];
  failedOverAt?: Date;
}

interface ChipHealthGridProps {
  chips: ChipHealthData[];
  onRestart?: (chipId: string) => void;
  loading?: boolean;
}

function getStatusConfig(status: string): { dotColor: string; label: string; rowBg: string } {
  switch (status) {
    case 'healthy':
    case 'connected':
      return { dotColor: 'bg-green-500', label: 'Saudavel', rowBg: 'bg-green-50/60 dark:bg-green-950/10' };
    case 'degraded':
      return { dotColor: 'bg-yellow-500', label: 'Degradado', rowBg: 'bg-yellow-50/60 dark:bg-yellow-950/10' };
    case 'cooldown':
      return { dotColor: 'bg-orange-500', label: 'Cooldown', rowBg: 'bg-orange-50/60 dark:bg-orange-950/10' };
    case 'quarantined':
      return { dotColor: 'bg-red-500', label: 'Quarentena', rowBg: 'bg-red-50/60 dark:bg-red-950/10' };
    case 'banned':
      return { dotColor: 'bg-red-800', label: 'Banido', rowBg: 'bg-red-50/60 dark:bg-red-950/10' };
    case 'warming_up':
      return { dotColor: 'bg-orange-400', label: 'Aquecendo', rowBg: 'bg-orange-50/40 dark:bg-orange-950/10' };
    case 'disconnected':
    case 'offline':
      return { dotColor: 'bg-gray-400', label: 'Desconectado', rowBg: 'bg-gray-50/60 dark:bg-gray-950/10' };
    case 'stale':
    case 'warning':
      return { dotColor: 'bg-yellow-500', label: 'Atencao', rowBg: 'bg-yellow-50/60 dark:bg-yellow-950/10' };
    case 'error':
      return { dotColor: 'bg-red-500', label: 'Erro', rowBg: 'bg-red-50/60 dark:bg-red-950/10' };
    default:
      return { dotColor: 'bg-gray-300', label: 'Desconhecido', rowBg: '' };
  }
}

function formatTime(date: Date | null): string {
  if (!date) return 'Nunca';
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes}m atras`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atras`;
  return `${Math.floor(hours / 24)}d atras`;
}

export function ChipHealthGrid({ chips, onRestart, loading }: ChipHealthGridProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-md h-10 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (chips.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhum chip configurado.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Table Header */}
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 px-3 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
        <span>Nome</span>
        <span>Status</span>
        <span>Enviadas/Limite</span>
        <span>Ultimo Check</span>
        <span className="w-7" />
      </div>

      {/* Rows */}
      <div className="divide-y">
        {chips.map((chip) => {
          const config = getStatusConfig(chip.healthStatus);
          const usage = chip.dailyLimit > 0
            ? (chip.messagesSentToday / chip.dailyLimit) * 100
            : 0;
          
          return (
            <div
              key={chip.id}
              className={cn(
                'grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 px-3 py-2.5 items-center text-sm transition-colors',
                config.rowBg
              )}
            >
              {/* Name + Fallback badge */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate" title={chip.name}>
                  {chip.name}
                </span>
                {chip.isFallbackFor && chip.isFallbackFor.length > 0 && (
                  <span 
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 whitespace-nowrap shrink-0"
                    title={`Fallback para ${chip.isFallbackFor.length} chip(s)`}
                  >
                    <ArrowRightLeft className="h-3 w-3" />
                    {chip.isFallbackFor.length}
                  </span>
                )}
              </div>

              {/* Status with dot */}
              <div className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full shrink-0', config.dotColor)} />
                <span className="text-xs text-foreground/80">{config.label}</span>
              </div>

              {/* Sent/Limit with inline bar */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className={cn(
                    'text-xs tabular-nums',
                    usage > 80 ? 'text-red-600 font-medium' : 'text-foreground/70'
                  )}>
                    {chip.messagesSentToday}
                  </span>
                  <span className="text-xs text-muted-foreground">/</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {chip.dailyLimit}
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      usage >= 100 ? 'bg-red-500' :
                      usage >= 80 ? 'bg-orange-500' :
                      usage >= 50 ? 'bg-yellow-500' :
                      'bg-green-500'
                    )}
                    style={{ width: `${Math.min(usage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Last Check */}
              <span className="text-xs text-muted-foreground">
                {formatTime(chip.lastWebhookEvent)}
              </span>

              {/* Action */}
              <div className="w-7 flex justify-center">
                {onRestart && chip.healthStatus !== 'healthy' && chip.healthStatus !== 'connected' ? (
                  <button
                    onClick={() => onRestart(chip.id)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title="Reiniciar chip"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
