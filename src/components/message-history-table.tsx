'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MessageHistoryRow {
  id: string;
  campaignId: string | null;
  campaignName: string | null;
  chipId: string | null;
  chipName: string | null;
  voterId: string | null;
  voterName: string | null;
  voterPhone: string;
  message: string;
  resolvedMessage: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  failReason: string | null;
  createdAt: string;
}

interface MessageHistoryTableProps {
  data: MessageHistoryRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  queued: { label: 'Na fila', color: 'bg-gray-100 text-gray-700', icon: Clock },
  assigned: { label: 'Atribuído', color: 'bg-blue-100 text-blue-700', icon: Send },
  sending: { label: 'Enviando', color: 'bg-yellow-100 text-yellow-700', icon: Loader2 },
  sent: { label: 'Enviado', color: 'bg-indigo-100 text-indigo-700', icon: Send },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  read: { label: 'Lido', color: 'bg-purple-100 text-purple-700', icon: Eye },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-700', icon: XCircle },
  retry: { label: 'Tentando', color: 'bg-orange-100 text-orange-700', icon: RefreshCw },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock };
  const Icon = config.icon;
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
      config.color,
    )}>
      <Icon className={cn('h-3 w-3', status === 'sending' && 'animate-spin')} />
      {config.label}
    </span>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPhone(phone: string): string {
  // Format as (XX) XXXXX-XXXX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function MessageHistoryTable({
  data,
  total,
  page,
  limit,
  totalPages,
  loading = false,
  onPageChange,
  onSortChange,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}: MessageHistoryTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSort = (column: string) => {
    if (!onSortChange) return;
    const newOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
    onSortChange(column, newOrder);
  };

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Campanha</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Chip</th>
                <th 
                  className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    Criado em
                    <ArrowUpDown className={cn('h-3 w-3', sortBy === 'createdAt' ? 'text-primary' : 'opacity-50')} />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('sentAt')}
                >
                  <div className="flex items-center gap-1">
                    Enviado em
                    <ArrowUpDown className={cn('h-3 w-3', sortBy === 'sentAt' ? 'text-primary' : 'opacity-50')} />
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entregue em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="bg-card">
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-28 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-20 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-24 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-32 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-32 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-32 bg-muted rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr className="bg-card">
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma mensagem encontrada
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      'bg-card hover:bg-muted/30 cursor-pointer transition-colors',
                      expandedId === row.id && 'bg-muted/50',
                    )}
                    onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                  >
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 font-mono text-xs">{formatPhone(row.voterPhone)}</td>
                    <td className="px-4 py-3">{row.voterName ?? '-'}</td>
                    <td className="px-4 py-3 max-w-[150px] truncate">{row.campaignName ?? '-'}</td>
                    <td className="px-4 py-3">{row.chipName ?? '-'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(row.sentAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(row.deliveredAt)}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded message detail */}
      {expandedId && data.find(r => r.id === expandedId) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-lg border border-border bg-card p-4 space-y-3"
        >
          {(() => {
            const row = data.find(r => r.id === expandedId)!;
            return (
              <>
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-sm">Detalhes da mensagem</h4>
                  <button
                    onClick={() => setExpandedId(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Fechar
                  </button>
                </div>
                <div className="grid gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Template original:</span>
                    <p className="mt-1 p-2 bg-muted rounded text-xs">{row.message}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mensagem enviada:</span>
                    <p className="mt-1 p-2 bg-green-50 dark:bg-green-950/30 rounded text-xs border border-green-200 dark:border-green-900">
                      {row.resolvedMessage}
                    </p>
                  </div>
                  {row.failReason && (
                    <div>
                      <span className="text-red-600 dark:text-red-400">Motivo da falha:</span>
                      <p className="mt-1 p-2 bg-red-50 dark:bg-red-950/30 rounded text-xs border border-red-200 dark:border-red-900">
                        {row.failReason}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {row.readAt && <span>Lido em: {formatDate(row.readAt)}</span>}
                    {row.failedAt && <span>Falhou em: {formatDate(row.failedAt)}</span>}
                  </div>
                </div>
              </>
            );
          })()}
        </motion.div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} mensagem{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages || 1}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}