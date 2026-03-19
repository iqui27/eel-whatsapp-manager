'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  ScrollText,
  RefreshCw,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type LogLevel    = 'debug' | 'info' | 'warn' | 'error';
type LogCategory = 'gemini' | 'webhook' | 'campaign' | 'crm' | 'grupos' | 'auth' | 'cron' | 'system';

interface SystemLog {
  id:         string;
  level:      LogLevel;
  category:   LogCategory;
  message:    string;
  details:    Record<string, unknown> | null;
  durationMs: number | null;
  createdAt:  string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];
const CATEGORIES: LogCategory[] = ['gemini', 'webhook', 'campaign', 'crm', 'grupos', 'auth', 'cron', 'system'];

const LEVEL_CONFIG: Record<LogLevel, { label: string; icon: React.FC<{ className?: string }>; classes: string; dotClass: string }> = {
  debug: { label: 'Debug',  icon: Bug,           classes: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',  dotClass: 'bg-slate-400' },
  info:  { label: 'Info',   icon: Info,          classes: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',         dotClass: 'bg-blue-500' },
  warn:  { label: 'Aviso',  icon: AlertTriangle, classes: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',   dotClass: 'bg-amber-500' },
  error: { label: 'Erro',   icon: AlertCircle,   classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',               dotClass: 'bg-red-500' },
};

const CATEGORY_LABELS: Record<LogCategory, string> = {
  gemini:   'Gemini AI',
  webhook:  'Webhook',
  campaign: 'Campanha',
  crm:      'CRM',
  grupos:   'Grupos',
  auth:     'Autenticação',
  cron:     'Cron',
  system:   'Sistema',
};

const CATEGORY_CLASSES: Record<LogCategory, string> = {
  gemini:   'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800',
  webhook:  'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800',
  campaign: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
  crm:      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800',
  grupos:   'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800',
  auth:     'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800',
  cron:     'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800',
  system:   'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function absoluteTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function exportCsv(logs: SystemLog[]) {
  const header = 'ID,Nível,Categoria,Mensagem,DuraçãoMs,CriadoEm\n';
  const rows = logs.map((l) =>
    [l.id, l.level, l.category, `"${l.message.replace(/"/g, '""')}"`, l.durationMs ?? '', l.createdAt].join(',')
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Details Expander ─────────────────────────────────────────────────────────

function DetailsCell({ details }: { details: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false);
  if (!details || Object.keys(details).length === 0) return null;
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        detalhes
      </button>
      {open && (
        <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground font-mono">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const [logs, setLogs]             = useState<SystemLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filters
  const [selectedLevels, setSelectedLevels]         = useState<Set<LogLevel>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<LogCategory>>(new Set());
  const [search, setSearch]                         = useState('');
  const [fromDate, setFromDate]                     = useState('');
  const [toDate, setToDate]                         = useState('');
  const [limit, setLimit]                           = useState('200');

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLevels.size > 0)     params.set('level',    [...selectedLevels].join(','));
      if (selectedCategories.size > 0) params.set('category', [...selectedCategories].join(','));
      if (search.trim())               params.set('search',   search.trim());
      if (fromDate)                    params.set('from',     fromDate);
      if (toDate)                      params.set('to',       toDate);
      params.set('limit', limit);

      const res = await fetch(`/api/system-logs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json() as { logs: SystemLog[] };
      setLogs(data.logs ?? []);
      setLastRefresh(new Date());
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [selectedLevels, selectedCategories, search, fromDate, toDate, limit]);

  // Initial load
  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefresh) {
      timerRef.current = setInterval(() => void fetchLogs(), 10_000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, fetchLogs]);

  // ─── Filter toggles ─────────────────────────────────────────────────────────

  function toggleLevel(level: LogLevel) {
    setSelectedLevels((prev) => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  }

  function toggleCategory(cat: LogCategory) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  // ─── Counts for header badges ────────────────────────────────────────────────

  const levelCounts = logs.reduce<Record<LogLevel, number>>((acc, l) => {
    acc[l.level] = (acc[l.level] ?? 0) + 1;
    return acc;
  }, { debug: 0, info: 0, warn: 0, error: 0 });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SidebarLayout currentPage="logs" pageTitle="Logs do Sistema">
      <div className="flex flex-col gap-6 p-4 md:p-6">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ScrollText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Logs do Sistema</h1>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Carregando…' : `${logs.length} registros`}
                {lastRefresh && !loading && (
                  <span className="ml-2 text-xs">· atualizado {relativeTime(lastRefresh.toISOString())}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Level summary badges */}
            {LEVELS.filter((l) => levelCounts[l] > 0).map((level) => {
              const cfg = LEVEL_CONFIG[level];
              return (
                <span key={level} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', cfg.classes)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dotClass)} />
                  {levelCounts[level]} {cfg.label.toLowerCase()}
                </span>
              );
            })}

            {/* Auto-refresh toggle */}
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
              className="gap-1.5"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', autoRefresh && 'animate-spin')} />
              {autoRefresh ? 'Auto (10s)' : 'Auto-refresh'}
            </Button>

            {/* Manual refresh */}
            <Button variant="outline" size="sm" onClick={() => void fetchLogs()} disabled={loading} className="gap-1.5">
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Atualizar
            </Button>

            {/* Export CSV */}
            <Button variant="outline" size="sm" onClick={() => exportCsv(logs)} disabled={logs.length === 0} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">

          {/* Level pills */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs font-medium text-muted-foreground self-center mr-1">Nível:</span>
            {LEVELS.map((level) => {
              const cfg = LEVEL_CONFIG[level];
              const active = selectedLevels.has(level);
              return (
                <button
                  key={level}
                  onClick={() => toggleLevel(level)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                    active ? cfg.classes : 'bg-background text-muted-foreground border-border hover:bg-muted',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', active ? cfg.dotClass : 'bg-muted-foreground/40')} />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs font-medium text-muted-foreground self-center mr-1">Categoria:</span>
            {CATEGORIES.map((cat) => {
              const active = selectedCategories.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                    active ? CATEGORY_CLASSES[cat] : 'bg-background text-muted-foreground border-border hover:bg-muted',
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>

          {/* Search + date range + limit */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar na mensagem…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void fetchLogs()}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 text-sm w-36"
              title="Data inicial"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 text-sm w-36"
              title="Data final"
            />
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="h-8 w-28 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 linhas</SelectItem>
                <SelectItem value="100">100 linhas</SelectItem>
                <SelectItem value="200">200 linhas</SelectItem>
                <SelectItem value="500">500 linhas</SelectItem>
                <SelectItem value="1000">1000 linhas</SelectItem>
              </SelectContent>
            </Select>
            {(selectedLevels.size > 0 || selectedCategories.size > 0 || search || fromDate || toDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => {
                  setSelectedLevels(new Set());
                  setSelectedCategories(new Set());
                  setSearch('');
                  setFromDate('');
                  setToDate('');
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {/* ── Logs Table ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-20 text-xs">Nível</TableHead>
                <TableHead className="w-28 text-xs">Categoria</TableHead>
                <TableHead className="text-xs">Mensagem</TableHead>
                <TableHead className="w-24 text-right text-xs">Duração</TableHead>
                <TableHead className="w-32 text-right text-xs">Quando</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                /* Skeleton rows */
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><div className="h-5 w-14 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-5 w-20 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-5 w-full animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-5 w-12 animate-pulse rounded bg-muted ml-auto" /></TableCell>
                    <TableCell><div className="h-5 w-24 animate-pulse rounded bg-muted ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <ScrollText className="h-10 w-10 opacity-30" />
                      <div>
                        <p className="font-medium text-sm">Nenhum log encontrado</p>
                        <p className="text-xs mt-1">Ajuste os filtros ou aguarde novos eventos do sistema.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const lvl = LEVEL_CONFIG[log.level];
                  const LevelIcon = lvl.icon;
                  return (
                    <TableRow key={log.id} className="border-border align-top group hover:bg-muted/30">

                      {/* Level */}
                      <TableCell className="pt-3">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium', lvl.classes)}>
                          <LevelIcon className="h-3 w-3 shrink-0" />
                          {lvl.label}
                        </span>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="pt-3">
                        <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', CATEGORY_CLASSES[log.category])}>
                          {CATEGORY_LABELS[log.category]}
                        </span>
                      </TableCell>

                      {/* Message + details */}
                      <TableCell className="py-2.5 max-w-0">
                        <p className="text-sm text-foreground leading-snug break-words">{log.message}</p>
                        <DetailsCell details={log.details} />
                      </TableCell>

                      {/* Duration */}
                      <TableCell className="pt-3 text-right">
                        {log.durationMs != null ? (
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-mono font-medium',
                            log.durationMs > 5000 ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' :
                            log.durationMs > 2000 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
                            'bg-muted text-muted-foreground',
                          )}>
                            <Clock className="h-2.5 w-2.5" />
                            {log.durationMs >= 1000 ? `${(log.durationMs / 1000).toFixed(1)}s` : `${log.durationMs}ms`}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell className="pt-3 text-right">
                        <span
                          title={absoluteTime(log.createdAt)}
                          className="text-xs text-muted-foreground cursor-default tabular-nums"
                        >
                          {relativeTime(log.createdAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Footer ── */}
        {!loading && logs.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Mostrando {logs.length} registro{logs.length !== 1 ? 's' : ''} mais recentes.
            {logs.length >= parseInt(limit) && ' Refine os filtros para ver mais resultados.'}
          </p>
        )}
      </div>
    </SidebarLayout>
  );
}
