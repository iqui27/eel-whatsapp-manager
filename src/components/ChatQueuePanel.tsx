'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MessageSquare, ArrowRight } from 'lucide-react';
import type { Conversation } from '@/db/schema';

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  open:     'bg-red-500',
  assigned: 'bg-amber-500',
  waiting:  'bg-yellow-400',
  resolved: 'bg-green-500',
  bot:      'bg-blue-400',
};

const STATUS_LABEL: Record<string, string> = {
  open:     'Aberta',
  assigned: 'Atribuída',
  waiting:  'Aguardando',
  resolved: 'Resolvida',
  bot:      'Bot',
};

function timeAgo(date: Date | string | null): string {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 py-3 border-t border-border animate-pulse">
      <div className="h-2 w-2 rounded-full bg-muted mt-1.5 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="h-2.5 bg-muted rounded w-full" />
      </div>
      <div className="h-2.5 bg-muted rounded w-8 shrink-0" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatQueuePanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations?status=open');
      if (res.ok) {
        const data: Conversation[] = await res.json();
        setConversations(data);
      }
    } catch {
      /* silently fail — non-critical panel */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-primary" />
            Fila de conversas
            {conversations.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {conversations.length}
              </span>
            )}
          </CardTitle>
          <Link
            href="/conversas"
            className="flex items-center gap-0.5 text-xs text-primary hover:underline"
          >
            Ver todas
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <MessageSquare className="h-7 w-7 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">Nenhuma conversa ativa</p>
          </div>
        ) : (
          <div>
            {conversations.slice(0, 6).map((conv, i) => (
              <div
                key={conv.id}
                className={cn(
                  'flex items-start gap-3 py-3',
                  i > 0 && 'border-t border-border',
                )}
              >
                {/* Priority dot */}
                <div className={cn(
                  'h-2 w-2 rounded-full mt-1.5 shrink-0',
                  STATUS_DOT[conv.status ?? 'bot'],
                )} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-foreground truncate">
                      {conv.voterName || 'Eleitor desconhecido'}
                    </p>
                    <span className={cn(
                      'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium border',
                      conv.status === 'open'
                        ? 'bg-red-500/10 text-red-600 border-red-200'
                        : 'bg-muted text-muted-foreground border-border',
                    )}>
                      {STATUS_LABEL[conv.status ?? 'bot']}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {conv.voterPhone}
                    {conv.handoffReason && ` · ${conv.handoffReason}`}
                  </p>
                </div>

                {/* Time */}
                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                  {timeAgo(conv.lastMessageAt)}
                </span>
              </div>
            ))}
            {conversations.length > 6 && (
              <div className="pt-2 text-center">
                <Link href="/conversas" className="text-xs text-primary hover:underline">
                  +{conversations.length - 6} conversas
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
