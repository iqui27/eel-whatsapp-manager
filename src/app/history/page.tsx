'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, History, CheckCircle2, XCircle, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/skeleton';
import SidebarLayout from '@/components/SidebarLayout';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string;
  createdAt: string;
  chipName: string;
  phone: string;
  status: 'success' | 'error';
  message: string | null;
}

type DateFilter = '24h' | '7days' | '30days' | 'all';
type StatusFilter = 'all' | 'success' | 'error';

const PAGE_SIZE = 20;

function StatusBadge({ status }: { status: 'success' | 'error' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        status === 'success' ? 'badge-success' : 'badge-destructive',
      )}
    >
      {status === 'success' ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {status === 'success' ? 'Sucesso' : 'Falha'}
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Hoje · ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Ontem · ${time}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' · ' + time;
}

export default function HistoryPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [chips, setChips] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('7days');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [chipFilter, setChipFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs');
      if (res.status === 401) { router.push('/login'); return; }
      if (!res.ok) throw new Error();
      setLogs(await res.json());
    } catch {
      // error handled by empty state
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchChips = useCallback(async () => {
    try {
      const res = await fetch('/api/chips');
      if (res.ok) {
        const data = await res.json();
        setChips(data.map((c: { name: string }) => c.name));
      }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchChips();
  }, [fetchLogs, fetchChips]);

  // reset page on filter change
  useEffect(() => { setPage(1); }, [search, dateFilter, statusFilter, chipFilter]);

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase();
    if (q && !log.chipName.toLowerCase().includes(q) && !log.phone.includes(q) && !(log.message ?? '').toLowerCase().includes(q)) return false;
    if (chipFilter !== 'all' && log.chipName !== chipFilter) return false;
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    const now = Date.now();
    const t = new Date(log.createdAt).getTime();
    if (dateFilter === '24h' && now - t > 86_400_000) return false;
    if (dateFilter === '7days' && now - t > 7 * 86_400_000) return false;
    if (dateFilter === '30days' && now - t > 30 * 86_400_000) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const successCount = filtered.filter(l => l.status === 'success').length;
  const errorCount = filtered.filter(l => l.status === 'error').length;

  const statusBtns: { label: string; value: StatusFilter }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Sucesso', value: 'success' },
    { label: 'Falha', value: 'error' },
  ];

  const dateBtns: { label: string; value: DateFilter }[] = [
    { label: '24h', value: '24h' },
    { label: '7d', value: '7days' },
    { label: '30d', value: '30days' },
    { label: 'Tudo', value: 'all' },
  ];

  return (
    <SidebarLayout currentPage="history" pageTitle="Histórico">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Histórico</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? 'Carregando...' : `${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {/* Quick stats */}
          {!loading && filtered.length > 0 && (
            <div className="flex gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />{successCount}
              </span>
              <span className="flex items-center gap-1.5 text-destructive">
                <XCircle className="h-3.5 w-3.5" />{errorCount}
              </span>
            </div>
          )}
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar chip, telefone, mensagem..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Date filter */}
          <div className="flex gap-1">
            {dateBtns.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setDateFilter(value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  dateFilter === value ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-accent',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-1">
            {statusBtns.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  statusFilter === value ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-accent',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Chip selector */}
          {chips.length > 0 && (
            <div className="relative flex items-center">
              <SlidersHorizontal className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={chipFilter}
                onChange={e => setChipFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
              >
                <option value="all">Todos os chips</option>
                {chips.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Data/Hora', 'Chip', 'Telefone', 'Status', 'Mensagem'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            {loading ? (
              <TableSkeleton rows={8} cols={5} />
            ) : paginated.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <History className="h-8 w-8 opacity-30" />
                      <p className="text-sm">
                        {search || statusFilter !== 'all' || chipFilter !== 'all'
                          ? 'Nenhum registro encontrado para os filtros aplicados'
                          : 'Nenhum log registrado ainda'}
                      </p>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                <AnimatePresence initial={false}>
                  {paginated.map((log, i) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                        {log.chipName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                        {log.phone}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                        {log.message ?? '—'}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            )}
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground text-xs">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return p <= totalPages ? (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium',
                      p === page ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {p}
                  </button>
                ) : null;
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
