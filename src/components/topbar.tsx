'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, BellOff, Calendar, CheckCircle2, Search, Shield } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { NotificationCenter, type Notification } from './notification-center';
import { getRecentNotifications, type StoredNotification } from '@/lib/notifications';
import { cn } from '@/lib/utils';

interface TopbarProps {
  pageTitle: string;
  searchLabel?: string;
  periodLabel?: string;
  alertLabel?: string;
  alertTone?: 'warning' | 'success' | 'neutral';
  sessionLabel?: string;
  notifications?: Notification[];
}

const alertToneStyles = {
  warning: {
    container: 'border-warning/20 bg-warning/10 text-warning',
    icon: AlertTriangle,
  },
  success: {
    container: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
    icon: CheckCircle2,
  },
  neutral: {
    container: 'border-border bg-muted/40 text-muted-foreground',
    icon: BellOff,
  },
} as const;

export function Topbar({
  pageTitle,
  searchLabel = 'Buscar páginas e atalhos',
  periodLabel = 'Período definido por página',
  alertLabel = 'Sem alertas operacionais',
  alertTone = 'neutral',
  sessionLabel = 'Sessão ativa',
  notifications: externalNotifications,
}: TopbarProps) {
  const alertStyle = alertToneStyles[alertTone];
  const AlertIcon = alertStyle.icon;

  // Internal notifications state if not provided externally
  const [internalNotifications, setInternalNotifications] = useState<Notification[]>([]);
  
  // Use external notifications if provided, otherwise use internal state
  const notifications = externalNotifications ?? internalNotifications;

  // Load notifications on mount
  useEffect(() => {
    if (!externalNotifications) {
      const stored = getRecentNotifications(20);
      setInternalNotifications(stored.map((n: StoredNotification) => ({
        id: n.id,
        type: n.type as Notification['type'],
        title: n.title,
        message: n.message,
        severity: n.severity,
        chipId: n.chipId,
        chipName: n.chipName,
        createdAt: n.createdAt,
        data: n.data,
      })));
    }
  }, [externalNotifications]);

  // Format current date in Portuguese
  const todayLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

  const openCommandPalette = () => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      }),
    );
  };

  const handleMarkAsRead = (id: string) => {
    setInternalNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setInternalNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  };

  const handleDismiss = (id: string) => {
    setInternalNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="flex h-[74px] items-center gap-4 border-b border-border bg-background px-6">

      {/* Section 1 — Global search routed to the command palette */}
      <div className="flex flex-1 items-center max-w-[420px]">
        <button
          type="button"
          onClick={openCommandPalette}
          className={cn(
            'flex h-[42px] w-full items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors',
            'hover:bg-muted/70',
          )}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-left">{searchLabel}</span>
          <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Section 2 — Current date */}
      <div className="flex h-[42px] w-[220px] items-center gap-2 rounded-lg border border-border bg-transparent px-3 text-sm text-foreground shrink-0">
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate text-muted-foreground capitalize">
          {todayLabel}
        </span>
      </div>

      {/* Section 3 — Operational status */}
      <div
        className={cn(
          'flex h-[42px] w-[240px] items-center gap-2 rounded-lg border px-3 text-sm font-medium shrink-0',
          alertStyle.container,
        )}
      >
        <AlertIcon className="h-4 w-4 shrink-0" />
        <span className="truncate">{alertLabel}</span>
      </div>

      {/* Section 4 — Session context */}
      <div className="flex min-w-0 w-[180px] items-center gap-2 shrink-0">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <Shield className="h-4 w-4" />
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{pageTitle}</p>
          <p className="truncate text-sm font-medium text-foreground">
            {sessionLabel === 'Sessão ativa' ? 'Operador Ativo' : sessionLabel}
          </p>
        </div>
      </div>

      {/* Section 5 — Notification Center */}
      <div className="shrink-0">
        <NotificationCenter
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onDismiss={handleDismiss}
        />
      </div>

      {/* Section 6 — Theme Toggle */}
      <div className="shrink-0">
        <ThemeToggle />
      </div>

    </div>
  );
}