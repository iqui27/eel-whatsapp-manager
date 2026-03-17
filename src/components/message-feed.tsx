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

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
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

  // Note: Auto-refresh would need to fetch from API
  // For now, we just update the local state when props change

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
          {/* Direction */}
          <div className="shrink-0">
            {msg.direction === 'outbound' ? (
              <ArrowUpRight className="h-4 w-4 text-blue-500" />
            ) : (
              <ArrowDownLeft className="h-4 w-4 text-green-500" />
            )}
          </div>
          
          {/* Chip */}
          <div className="shrink-0 text-xs text-muted-foreground w-16 truncate">
            {msg.chipName}
          </div>
          
          {/* Lead */}
          <div className="shrink-0 font-medium w-24 truncate">
            {msg.leadName || msg.leadPhone}
          </div>
          
          {/* Preview */}
          <div className="flex-1 text-xs text-muted-foreground truncate">
            {truncate(msg.preview, 40)}
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