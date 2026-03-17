'use client';

import { RefreshCw } from 'lucide-react';

interface ChipHealthData {
  id: string;
  name: string;
  phone: string;
  healthStatus: string;
  messagesSentToday: number;
  dailyLimit: number;
  lastWebhookEvent: Date | null;
  lastHealthCheck: Date | null;
}

interface ChipHealthGridProps {
  chips: ChipHealthData[];
  onRestart?: (chipId: string) => void;
  loading?: boolean;
}

function getStatusIndicator(status: string): { emoji: string; color: string; label: string } {
  switch (status) {
    case 'healthy':
      return { emoji: '🟢', color: 'text-green-600', label: 'Saudável' };
    case 'degraded':
      return { emoji: '🟡', color: 'text-yellow-600', label: 'Degradado' };
    case 'cooldown':
      return { emoji: '🟠', color: 'text-orange-600', label: 'Cooldown' };
    case 'quarantined':
      return { emoji: '🔴', color: 'text-red-600', label: 'Quarentena' };
    case 'banned':
      return { emoji: '💀', color: 'text-red-800', label: 'Banido' };
    case 'warming_up':
      return { emoji: '🔥', color: 'text-orange-500', label: 'Aquecendo' };
    case 'disconnected':
      return { emoji: '⚫', color: 'text-gray-500', label: 'Desconectado' };
    default:
      return { emoji: '❓', color: 'text-gray-400', label: 'Desconhecido' };
  }
}

function formatTime(date: Date | null): string {
  if (!date) return 'Nunca';
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes}m atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

export function ChipHealthGrid({ chips, onRestart, loading }: ChipHealthGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border p-3 animate-pulse h-28 bg-muted" />
        ))}
      </div>
    );
  }

  if (chips.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum chip configurado.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {chips.map((chip) => {
        const status = getStatusIndicator(chip.healthStatus);
        const usage = (chip.messagesSentToday / chip.dailyLimit) * 100;
        
        return (
          <div
            key={chip.id}
            className="rounded-lg border bg-card p-3 space-y-2"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm truncate max-w-[100px]">
                {chip.name}
              </span>
              <span title={status.label}>{status.emoji}</span>
            </div>
            
            {/* Phone */}
            <div className="text-xs text-muted-foreground">
              {chip.phone}
            </div>
            
            {/* Usage bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Hoje</span>
                <span className={usage > 80 ? 'text-red-600' : ''}>
                  {chip.messagesSentToday}/{chip.dailyLimit}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    usage >= 100 ? 'bg-red-500' :
                    usage >= 80 ? 'bg-orange-500' :
                    usage >= 50 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usage, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatTime(chip.lastWebhookEvent)}</span>
              {onRestart && chip.healthStatus !== 'healthy' && (
                <button
                  onClick={() => onRestart(chip.id)}
                  className="text-blue-600 hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}