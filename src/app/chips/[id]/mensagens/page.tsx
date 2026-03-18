'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  Loader2,
  RefreshCw,
  Smartphone,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MessageRow {
  id: string;
  campaignId: string | null;
  campaignName: string | null;
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

interface ChipInfo {
  id: string;
  name: string;
  phone: string;
  healthStatus: string;
  messagesSentToday: number;
  dailyLimit: number;
  messagesSentThisHour: number;
  hourlyLimit: number;
}

interface HourlyUsage {
  hour: number;
  count: number;
}

interface ChipMessagesResponse {
  chip: ChipInfo;
  messages: MessageRow[];
  total: number;
  page: number;
  totalPages: number;
  hourlyUsage: HourlyUsage[];
  stats: {
    todaySent: number;
    todayDelivered: number;
    todayFailed: number;
    avgDeliveryRate: number;
  };
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

// Health status colors
const HEALTH_COLORS: Record<string, string> = {
  healthy: 'text-green-600',
  degraded: 'text-yellow-600',
  disconnected: 'text-gray-500',
  quarantined: 'text-red-600',
  banned: 'text-red-900',
  warming_up: 'text-blue-600',
  cooldown: 'text-orange-600',
  not_found: 'text-gray-600',
};

export default function ChipMessagesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  
  const [chip, setChip] = useState<ChipInfo | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [hourlyUsage, setHourlyUsage] = useState<HourlyUsage[]>([]);
  const [stats, setStats] = useState({ todaySent: 0, todayDelivered: 0, todayFailed: 0, avgDeliveryRate: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/chips/${id}/messages?${params.toString()}`);
      
      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load messages');
      }

      const data: ChipMessagesResponse = await res.json();
      setChip(data.chip);
      setMessages(data.messages);
      setHourlyUsage(data.hourlyUsage);
      setStats(data.stats);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  }, [id, page, startDate, endDate, router]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('format', 'csv');
      params.set('chipId', id);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/messages/export?${params.toString()}`);
      
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chip-${chip?.name || id}-mensagens.csv`;
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

  // Calculate max hourly usage for chart
  const maxHourlyUsage = Math.max(...hourlyUsage.map(h => h.count), 1);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/chips"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      </div>

      {/* Chip info */}
      {chip && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{chip.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm font-mono text-muted-foreground">{formatPhone(chip.phone)}</span>
                  <span className={cn(
                    'text-sm font-medium',
                    HEALTH_COLORS[chip.healthStatus] ?? 'text-gray-500'
                  )}>
                    {chip.healthStatus}
                  </span>
                </div>
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

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Enviadas hoje</p>
              <p className="text-lg font-semibold">{stats.todaySent}</p>
              <p className="text-xs text-muted-foreground">de {chip.dailyLimit} limite</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entregues hoje</p>
              <p className="text-lg font-semibold text-green-600">{stats.todayDelivered}</p>
              <p className="text-xs text-muted-foreground">
                {stats.avgDeliveryRate}% taxa
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Falharam hoje</p>
              <p className="text-lg font-semibold text-red-600">{stats.todayFailed}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Esta hora</p>
              <p className="text-lg font-semibold">{chip.messagesSentThisHour}</p>
              <p className="text-xs text-muted-foreground">de {chip.hourlyLimit} limite</p>
            </div>
          </div>
        </div>
      )}

      {/* Hourly usage chart */}
      {hourlyUsage.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Uso por Hora (Hoje)
          </h3>
          <div className="flex items-end gap-0.5 h-20">
            {hourlyUsage.map((h) => {
              const height = maxHourlyUsage > 0 ? (h.count / maxHourlyUsage) * 100 : 0;
              return (
                <motion.div
                  key={h.hour}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 2)}%` }}
                  transition={{ delay: h.hour * 0.02 }}
                  className={cn(
                    'flex-1 rounded-t transition-colors cursor-pointer',
                    h.count > 0 ? 'bg-indigo-400 hover:bg-indigo-500' : 'bg-muted'
                  )}
                  title={`${h.hour}:00 - ${h.count} mensagens`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
            <span>0h</span>
            <span>6h</span>
            <span>12h</span>
            <span>18h</span>
            <span>23h</span>
          </div>
        </div>
      )}

      {/* Date filter */}
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Período:</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          className="flex h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="text-muted-foreground">até</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          className="flex h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar
          </button>
        )}
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Campanha</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Enviado em</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entregue em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="bg-card">
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-28 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-20 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-24 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-24 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-24 bg-muted rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : messages.length === 0 ? (
                <tr className="bg-card">
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
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
                    <td className="px-4 py-3 max-w-[150px] truncate">{msg.campaignName ?? '-'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(msg.sentAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(msg.deliveredAt)}</td>
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