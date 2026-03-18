'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Smartphone, 
  Users, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Activity,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SystemStatus {
  chips: {
    total: number;
    healthy: number;
    warning: number;
    error: number;
    offline: number;
  };
  groups: {
    total: number;
    active: number;
    nearCapacity: number;
    full: number;
  };
  campaigns: {
    active: number;
    scheduled: number;
    completed: number;
    failed: number;
  };
  lastUpdated: Date | null;
  isRefreshing?: boolean;
}

interface SystemStatusCardProps {
  status: SystemStatus;
  onRefresh?: () => void;
  onNavigateToChips?: () => void;
  onNavigateToGroups?: () => void;
  onNavigateToCampaigns?: () => void;
}

type HealthLevel = 'healthy' | 'warning' | 'error' | 'unknown';

function getOverallHealth(status: SystemStatus): HealthLevel {
  if (status.chips.error > 0 || status.chips.offline > 0) {
    return 'error';
  }
  if (status.chips.warning > 0 || status.groups.nearCapacity > 0) {
    return 'warning';
  }
  if (status.chips.total === 0) {
    return 'unknown';
  }
  return 'healthy';
}

function getHealthColor(health: HealthLevel): string {
  switch (health) {
    case 'healthy':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

function getHealthTextColor(health: HealthLevel): string {
  switch (health) {
    case 'healthy':
      return 'text-green-600';
    case 'warning':
      return 'text-yellow-600';
    case 'error':
      return 'text-red-600';
    default:
      return 'text-gray-500';
  }
}

function getHealthIcon(health: HealthLevel) {
  switch (health) {
    case 'healthy':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Activity className="h-5 w-5 text-gray-400" />;
  }
}

function getHealthLabel(health: HealthLevel): string {
  switch (health) {
    case 'healthy':
      return 'Sistema Saudavel';
    case 'warning':
      return 'Atencao Necessaria';
    case 'error':
      return 'Problemas Detectados';
    default:
      return 'Estado Desconhecido';
  }
}

function TrafficLightIndicator({ status }: { status: SystemStatus['chips'] }) {
  const total = status.total || 1; // Avoid division by zero
  
  return (
    <div className="flex items-center gap-3">
      {/* Green light */}
      <div className="flex items-center gap-1.5">
        <div className={cn(
          'w-4 h-4 rounded-full border-2',
          status.healthy > 0 ? 'bg-green-500 border-green-600' : 'bg-gray-200 border-gray-300'
        )} />
        <span className="text-sm text-muted-foreground">{status.healthy}</span>
      </div>
      
      {/* Yellow light */}
      <div className="flex items-center gap-1.5">
        <div className={cn(
          'w-4 h-4 rounded-full border-2',
          status.warning > 0 ? 'bg-yellow-500 border-yellow-600' : 'bg-gray-200 border-gray-300'
        )} />
        <span className="text-sm text-muted-foreground">{status.warning}</span>
      </div>
      
      {/* Red light */}
      <div className="flex items-center gap-1.5">
        <div className={cn(
          'w-4 h-4 rounded-full border-2',
          status.error > 0 || status.offline > 0 ? 'bg-red-500 border-red-600' : 'bg-gray-200 border-gray-300'
        )} />
        <span className="text-sm text-muted-foreground">{status.error + status.offline}</span>
      </div>
      
      {/* Progress bar */}
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-green-500"
          style={{ width: `${(status.healthy / total) * 100}%` }}
        />
        <div 
          className="h-full bg-yellow-500 float-left"
          style={{ width: `${(status.warning / total) * 100}%`, marginLeft: `-${((status.healthy + status.warning) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function SystemStatusCard({
  status,
  onRefresh,
  onNavigateToChips,
  onNavigateToGroups,
  onNavigateToCampaigns,
}: SystemStatusCardProps) {
  const overallHealth = getOverallHealth(status);
  const healthIcon = getHealthIcon(overallHealth);
  const healthColor = getHealthColor(overallHealth);
  const healthTextColor = getHealthTextColor(overallHealth);
  const healthLabel = getHealthLabel(overallHealth);

  const formatLastUpdated = (date: Date | null): string => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 10) return 'Agora';
    if (diffSec < 60) return `${diffSec}s atras`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m atras`;
    return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card data-tooltip="system-status-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {healthIcon}
            Status do Sistema
          </CardTitle>
          <div className="flex items-center gap-2">
            {status.isRefreshing && (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatLastUpdated(status.lastUpdated)}
            </div>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={status.isRefreshing}
                className="h-7 px-2"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', status.isRefreshing && 'animate-spin')} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Health Banner */}
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-lg border',
          overallHealth === 'healthy' && 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
          overallHealth === 'warning' && 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800',
          overallHealth === 'error' && 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
          overallHealth === 'unknown' && 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800'
        )}>
          <div className={cn('w-3 h-3 rounded-full', healthColor)} />
          <span className={cn('text-sm font-medium', healthTextColor)}>
            {healthLabel}
          </span>
        </div>

        {/* Section Status Cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Chips */}
          <button
            onClick={onNavigateToChips}
            className="flex flex-col items-start p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Chips</span>
            </div>
            <TrafficLightIndicator status={status.chips} />
          </button>

          {/* Groups */}
          <button
            onClick={onNavigateToGroups}
            className="flex flex-col items-start p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Grupos</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">
                {status.groups.active} ativos
              </Badge>
              {status.groups.nearCapacity > 0 && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                  {status.groups.nearCapacity} lotados
                </Badge>
              )}
            </div>
          </button>

          {/* Campaigns */}
          <button
            onClick={onNavigateToCampaigns}
            className="flex flex-col items-start p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Campanhas</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">
                {status.campaigns.active} ativas
              </Badge>
              {status.campaigns.scheduled > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {status.campaigns.scheduled} agendadas
                </Badge>
              )}
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export type { SystemStatus as SystemStatusData };