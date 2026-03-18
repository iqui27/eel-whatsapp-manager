'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MessageRow {
  id: string;
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
  conversationId?: string | null;
}

interface CampaignInfo {
  id: string;
  name: string;
  status: string;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  createdAt: string;
}

interface CampaignMessagesResponse {
  campaign: CampaignInfo;
  messages: MessageRow[];
  total: number;
  page: number;
  totalPages: number;
}

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

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'sent', label: 'Enviados' },
  { value: 'delivered', label: 'Entregues' },
  { value: 'read', label: 'Lidos' },
  { value: 'failed', label: 'Falharam' },
];

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.queued;
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

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    sending: 'bg-yellow-100 text-yellow-700',
    sent: 'bg-green-100 text-green-700',
    paused: 'bg-orange-100 text-orange-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export default function CampaignMessagesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/campaigns/${id}/messages?${params.toString()}`);
      
      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load messages');
      }

      const data: CampaignMessagesResponse = await res.json();
      setCampaign(data.campaign);
      setMessages(data.messages);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  }, [id, page, statusFilter, router]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('format', 'csv');
      params.set('campaignId', id);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/messages/export?${params.toString()}`);
      
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campanha-${campaign?.name || id}-mensagens.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Mensagens exportadas');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar');
    } finally {
      setExporting(false);
    }
  };

  // Calculate stats
  const stats = {
    sent: messages.filter(m => ['sent', 'delivered', 'read'].includes(m.status)).length,
    delivered: messages.filter(m => ['delivered', 'read'].includes(m.status)).length,
    failed: messages.filter(m => m.status === 'failed').length,
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href={`/campanhas/${id}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      </div>

      {/* Campaign info */}
      {campaign && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-foreground">{campaign.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={cn(
                  'px-2 py-1 rounded text-sm font-medium',
                  getStatusBadge(campaign.status)
                )}>
                  {campaign.status}
                </span>
                <span className="text-sm text-muted-foreground">
                  {total} mensagens
                </span>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting || total === 0}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Exportar CSV
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Enviadas</p>
              <p className="text-lg font-semibold">{campaign.totalSent}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entregues</p>
              <p className="text-lg font-semibold text-green-600">{campaign.totalDelivered}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Falharam</p>
              <p className="text-lg font-semibold text-red-600">{campaign.totalFailed}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filtrar:</span>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Chip</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Enviado em</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entregue em</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lido em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="bg-card">
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-28 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-20 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-24 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-24 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-24 bg-muted rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : messages.length === 0 ? (
                <tr className="bg-card">
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma mensagem encontrada
                  </td>
                </tr>
              ) : (
                messages.map((msg, index) => (
                  <motion.tr
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      'bg-card hover:bg-muted/30 cursor-pointer transition-colors',
                      expandedId === msg.id && 'bg-muted/50',
                    )}
                    onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                  >
                    <td className="px-4 py-3"><StatusBadge status={msg.status} /></td>
                    <td className="px-4 py-3 font-mono text-xs">{formatPhone(msg.voterPhone)}</td>
                    <td className="px-4 py-3">{msg.voterName ?? '-'}</td>
                    <td className="px-4 py-3">{msg.chipName ?? '-'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(msg.sentAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(msg.deliveredAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(msg.readAt)}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded message detail */}
      {expandedId && messages.find(m => m.id === expandedId) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-lg border border-border bg-card p-4 space-y-3"
        >
          {(() => {
            const msg = messages.find(m => m.id === expandedId)!;
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
                    <span className="text-muted-foreground">Mensagem enviada:</span>
                    <p className="mt-1 p-2 bg-green-50 dark:bg-green-950/30 rounded text-xs border border-green-200 dark:border-green-900">
                      {msg.resolvedMessage}
                    </p>
                  </div>
                  {msg.failReason && (
                    <div>
                      <span className="text-red-600 dark:text-red-400">Motivo da falha:</span>
                      <p className="mt-1 p-2 bg-red-50 dark:bg-red-950/30 rounded text-xs border border-red-200 dark:border-red-900">
                        {msg.failReason}
                      </p>
                    </div>
                  )}
                  {msg.conversationId && (
                    <div>
                      <Link
                        href={`/conversas?voterId=${msg.voterId}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Ver conversa →
                      </Link>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm border rounded hover:bg-accent disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm border rounded hover:bg-accent disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}