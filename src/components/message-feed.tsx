'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Check, X, Clock } from 'lucide-react';

interface MessageData {
  id: string;
  direction: 'inbound' | 'outbound';
  chipName: string;
  leadName: string;
  leadPhone: string;
  preview: string;
  status: string;
  createdAt: Date;
}

interface MessageFeedProps {
  messages: MessageData[];
  loading?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'delivered':
      return <Check className="h-3 w-3 text-green-500" />;
    case 'read':
      return <Check className="h-3 w-3 text-blue-500" />;
    case 'failed':
      return <X className="h-3 w-3 text-red-500" />;
    case 'received':
      return <ArrowDownLeft className="h-3 w-3 text-green-600" />;
    default:
      return <Clock className="h-3 w-3 text-gray-400" />;
  }
}

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessageFeed({ 
  messages: initialMessages, 
  loading,
  autoRefresh = false,
  refreshInterval = 10000 
}: MessageFeedProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Real auto-refresh: poll /api/operations/messages when enabled and not paused
  useEffect(() => {
    if (!autoRefresh || isPaused) return;
    const fetchMessages = async () => {
      try {
        if (!autoRefresh || isPaused || document.hidden) return; // skip when tab is hidden
        const res = await fetch('/api/dashboard/messages');
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || data);
        }
      } catch { /* silent — non-critical refresh */ }
    };

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => void fetchMessages(), refreshInterval);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        void fetchMessages(); // immediate refresh when tab becomes visible
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPolling();
    };
  }, [autoRefresh, isPaused, refreshInterval]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-lg border p-2 animate-pulse h-12 bg-muted" />
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhuma mensagem recente.
      </div>
    );
  }

  return (
    <div 
      className="space-y-1 max-h-64 overflow-y-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {messages.slice(0, 20).map((msg) => (
        <div
          key={msg.id}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 text-sm"
        >
          {/* Direction badge */}
          <div className="shrink-0">
            {msg.direction === 'outbound' ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <ArrowUpRight className="h-3 w-3" />
                Env
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                <ArrowDownLeft className="h-3 w-3" />
                Rec
              </span>
            )}
          </div>
          
          {/* Chip */}
          <div className="shrink-0 text-xs text-muted-foreground w-[5rem] truncate" title={msg.chipName}>
            {msg.chipName}
          </div>

          {/* Lead */}
          <div className="shrink-0 font-medium w-[6rem] truncate" title={msg.leadName || msg.leadPhone}>
            {msg.leadName || msg.leadPhone}
          </div>
          
          {/* Preview */}
          <div className="flex-1 text-xs text-muted-foreground truncate">
            {msg.preview}
          </div>
          
          {/* Status */}
          <div className="shrink-0">
            {getStatusIcon(msg.status)}
          </div>
          
          {/* Time */}
          <div className="shrink-0 text-xs text-muted-foreground">
            {formatTime(msg.createdAt)}
          </div>
        </div>
      ))}
      
      {messages.length > 20 && (
        <div className="text-center text-xs text-muted-foreground py-2">
          Mostrando 20 de {messages.length} mensagens
        </div>
      )}
    </div>
  );
}