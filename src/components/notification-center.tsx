'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  BellOff,
  X,
  Check,
  CheckCheck,
  Smartphone,
  Users,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Info,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Notification {
  id: string;
  type: 'failover' | 'no_fallback' | 'chip_failure' | 'chip_recovery' | 'group_overflow' | 'group_capacity' | 'info' | 'warning' | 'error';
  title?: string;
  message: string;
  severity?: 'info' | 'warning' | 'error';
  chipId?: string;
  chipName?: string;
  createdAt: Date;
  read?: boolean;
  data?: Record<string, unknown>;
}

interface NotificationCenterProps {
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (id: string) => void;
  loading?: boolean;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  failover: RefreshCw,
  no_fallback: AlertCircle,
  chip_failure: AlertTriangle,
  chip_recovery: Check,
  group_overflow: Users,
  group_capacity: Users,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
};

const typeColors: Record<string, string> = {
  failover: 'text-orange-500 bg-orange-50 dark:bg-orange-950/20',
  no_fallback: 'text-red-500 bg-red-50 dark:bg-red-950/20',
  chip_failure: 'text-red-500 bg-red-50 dark:bg-red-950/20',
  chip_recovery: 'text-green-500 bg-green-50 dark:bg-green-950/20',
  group_overflow: 'text-green-500 bg-green-50 dark:bg-green-950/20',
  group_capacity: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
  info: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20',
  warning: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
  error: 'text-red-500 bg-red-50 dark:bg-red-950/20',
};

export function NotificationCenter({
  notifications: externalNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  loading,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use internal state if external notifications not provided
  const [internalNotifications, setInternalNotifications] = useState<Notification[]>([]);
  const notifications = externalNotifications ?? internalNotifications;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter((n) => n.type === filter);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `${diffMin}m atras`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h atras`;
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const handleMarkAsRead = (id: string) => {
    if (onMarkAsRead) {
      onMarkAsRead(id);
    } else {
      setInternalNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const handleMarkAllAsRead = () => {
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    } else {
      setInternalNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    }
  };

  const handleDismiss = (id: string) => {
    if (onDismiss) {
      onDismiss(id);
    } else {
      setInternalNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        aria-label="Notificacoes"
      >
        {unreadCount > 0 ? (
          <Bell className="h-5 w-5" />
        ) : (
          <BellOff className="h-5 w-5 text-muted-foreground" />
        )}
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-lg border bg-background shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Notificacoes</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="h-7 text-xs"
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Marcar todas lidas
                </Button>
              )}
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1 px-4 py-2 border-b overflow-x-auto">
            <Button
              variant={filter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
              className="h-7 text-xs shrink-0"
            >
              Todas
            </Button>
            <Button
              variant={filter === 'failover' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('failover')}
              className="h-7 text-xs shrink-0"
            >
              Failover
            </Button>
            <Button
              variant={filter === 'chip_failure' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('chip_failure')}
              className="h-7 text-xs shrink-0"
            >
              Chips
            </Button>
            <Button
              variant={filter === 'group_overflow' || filter === 'group_capacity' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('group_overflow')}
              className="h-7 text-xs shrink-0"
            >
              Grupos
            </Button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <BellOff className="h-8 w-8 mb-2" />
                <p className="text-sm">Sem notificacoes</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Info;
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors',
                      !notification.read && 'bg-muted/30'
                    )}
                  >
                    <div className={cn('p-1.5 rounded-lg shrink-0', typeColors[notification.type] || typeColors.info)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {notification.title && (
                        <p className="text-sm font-medium">{notification.title}</p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="h-6 w-6"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDismiss(notification.id)}
                        className="h-6 w-6"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export type { Notification as NotificationType };