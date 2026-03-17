'use client';

import { useState } from 'react';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface AlertData {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  chipId?: string;
  chipName?: string;
  createdAt: Date;
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
              {alert.chipName && (
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