'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search,
  Download,
  Filter,
  X,
  Calendar,
  Loader2,
  MessageSquare,
  Send,
  Inbox,
} from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';
import { MessageHistoryTable, type MessageHistoryRow } from '@/components/message-history-table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HistoryResponse {
  data: MessageHistoryRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FilterOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { id: '', name: 'Todos os status' },
  { id: 'queued', name: 'Na fila' },
  { id: 'assigned', name: 'Atribuído' },
  { id: 'sending', name: 'Enviando' },
  { id: 'sent', name: 'Enviado' },
  { id: 'delivered', name: 'Entregue' },
  { id: 'read', name: 'Lido' },
  { id: 'failed', name: 'Falhou' },
  { id: 'retry', name: 'Tentando' },
];

export default function HistoricoPage() {
  const router = useRouter();
  const [data, setData] = useState<MessageHistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [chipFilter, setChipFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [direction, setDirection] = useState<'all' | 'outbound' | 'inbound'>('all');

  // Filter options
  const [campaigns, setCampaigns] = useState<FilterOption[]>([]);
  const [chips, setChips] = useState<FilterOption[]>([]);

  // Load filter options
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [campaignsRes, chipsRes] = await Promise.all([
          fetch('/api/campaigns'),
          fetch('/api/chips'),
        ]);

        if (campaignsRes.ok) {
          const campaignsData = await campaignsRes.json();
          setCampaigns([
            { id: '', name: 'Todas as campanhas' },
            ...(Array.isArray(campaignsData) ? campaignsData : campaignsData.data || []).map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            })),
          ]);
        }

        if (chipsRes.ok) {
          const chipsData = await chipsRes.json();
          setChips([
            { id: '', name: 'Todos os chips' },
            ...(Array.isArray(chipsData) ? chipsData : []).map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            })),
          ]);
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };

    loadFilters();
  }, []);

  // Fetch history data
  const fetchHistory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      
      if (statusFilter) params.set('status', statusFilter);
      if (campaignFilter) params.set('campaignId', campaignFilter);
      if (chipFilter) params.set('chipId', chipFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (search) params.set('search', search);
      params.set('direction', direction);

      const res = await fetch(`/api/messages/history?${params.toString()}`);
      
      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load history');
      }

      const json: HistoryResponse = await res.json();
      setData(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, statusFilter, campaignFilter, chipFilter, startDate, endDate, search, direction, router]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchHistory();
    }, search ? 500 : 0);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Handle sort change
  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      if (statusFilter) params.set('status', statusFilter);
      if (campaignFilter) params.set('campaignId', campaignFilter);
      if (chipFilter) params.set('chipId', chipFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (search) params.set('search', search);

      const res = await fetch(`/api/messages/export?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mensagens-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Exportado para ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar mensagens');
    } finally {
      setExporting(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setStatusFilter('');
    setCampaignFilter('');
    setChipFilter('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter || campaignFilter || chipFilter || startDate || endDate || search;

  return (
    <SidebarLayout currentPage="history" pageTitle="Histórico">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Histórico de Mensagens</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Consulte e exporte todas as mensagens enviadas
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting || total === 0}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting || total === 0}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              PDF
            </button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search input */}
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por telefone, nome ou conteúdo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              showFilters || hasActiveFilters
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-accent'
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                {[statusFilter, campaignFilter, chipFilter, startDate, endDate, search].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </button>
          )}
        </div>

        {/* Direction toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit">
          {([
            { value: 'all', label: 'Todas', icon: MessageSquare },
            { value: 'outbound', label: 'Enviadas', icon: Send },
            { value: 'inbound', label: 'Recebidas', icon: Inbox },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => { setDirection(value); setPage(1); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                direction === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-border bg-card p-4 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>

              {/* Campaign filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Campanha</label>
                <select
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {campaigns.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>

              {/* Chip filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Chip</label>
                <select
                  value={chipFilter}
                  onChange={(e) => setChipFilter(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {chips.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Período
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex h-9 flex-1 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Início"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex h-9 flex-1 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Fim"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty state (when not loading, no data) */}
        {!loading && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {hasActiveFilters || direction !== 'all' ? (
              <>
                <Search className="h-10 w-10 text-muted-foreground/40 mb-4" />
                <h3 className="text-base font-semibold text-foreground mb-1">Nenhum resultado encontrado</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Tente ajustar os filtros ou a busca para encontrar o que procura.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpar filtros
                </button>
              </>
            ) : (
              <>
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-base font-semibold text-foreground mb-2">Nenhuma mensagem no histórico</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  O histórico é preenchido automaticamente quando campanhas são enviadas ou leads respondem às suas mensagens.
                </p>
                <a
                  href="/campanhas/nova"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  Criar primeira campanha
                </a>
                <p className="mt-3 text-xs text-muted-foreground">
                  Ou importe sua base de leads em{' '}
                  <a href="/segmentacao" className="text-primary hover:underline">Segmentação → Importar</a>
                </p>
              </>
            )}
          </div>
        )}

        {/* Table */}
        {(loading || data.length > 0) && (
          <MessageHistoryTable
            data={data}
            total={total}
            page={page}
            limit={limit}
            totalPages={totalPages}
            loading={loading}
            onPageChange={handlePageChange}
            onSortChange={handleSortChange}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        )}
      </div>
    </SidebarLayout>
  );
}