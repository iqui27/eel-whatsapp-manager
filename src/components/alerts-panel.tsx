'use client';

import { useState } from 'react';
import { X, AlertTriangle, AlertCircle, Info, RefreshCw, Zap, Users } from 'lucide-react';

export interface AlertData {
  id: string;
  type: 'error' | 'warning' | 'info' | 'failover' | 'group_overflow' | 'group_capacity';
  message: string;
  chipId?: string;
  chipName?: string;
  createdAt: Date;
  // Failover-specific data
  fallbackChipId?: string;
  fallbackChipName?: string;
  messagesReassigned?: number;
  // Group-specific data
  groupName?: string;
  segmentTag?: string;
}

interface AlertsPanelProps {
  alerts: AlertData[];
  onDismiss?: (alertId: string) => void;
  loading?: boolean;
}

function getAlertIcon(type: string) {
  switch (type) {
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'failover':
      return <RefreshCw className="h-4 w-4 text-orange-500" />;
    case 'group_overflow':
      return <Users className="h-4 w-4 text-green-500" />;
    case 'group_capacity':
      return <Users className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function getAlertBg(type: string): string {
  switch (type) {
    case 'error':
      return 'bg-red-50 border-red-200';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200';
    case 'failover':
      return 'bg-orange-50 border-orange-200';
    case 'group_overflow':
      return 'bg-green-50 border-green-200';
    case 'group_capacity':
      return 'bg-yellow-50 border-yellow-200';
    default:
      return 'bg-blue-50 border-blue-200';
  }
}

export function AlertsPanel({ alerts, onDismiss, loading }: AlertsPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
    onDismiss?.(id);
  };

  if (loading) {
    return (
      <div className="rounded-lg border p-4 animate-pulse h-20 bg-muted" />
    );
  }

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          Alertas
          {visibleAlerts.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
              {visibleAlerts.length}
            </span>
          )}
        </h3>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {visibleAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertBg(alert.type)}`}
          >
            {getAlertIcon(alert.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm">{alert.message}</p>
              {alert.type === 'failover' && alert.fallbackChipName && (
                <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                  <p className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Fallback: {alert.fallbackChipName}
                  </p>
                  {alert.messagesReassigned !== undefined && (
                    <p>{alert.messagesReassigned} mensagens realocadas</p>
                  )}
                </div>
              )}
              {(alert.type === 'group_overflow' || alert.type === 'group_capacity') && alert.groupName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Grupo: {alert.groupName}
                  {alert.segmentTag && ` • Segmento: ${alert.segmentTag}`}
                </p>
              )}
              {alert.type !== 'failover' && alert.type !== 'group_overflow' && alert.type !== 'group_capacity' && alert.chipName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Chip: {alert.chipName}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDismiss(alert.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}