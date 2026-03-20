'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
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
  Trash2,
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

interface AppliedFilters {
  levels:     Set<LogLevel>;
  categories: Set<LogCategory>;
  search:     string;
  fromDate:   string;
  toDate:     string;
  limit:      string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVELS:     LogLevel[]    = ['debug', 'info', 'warn', 'error'];
const CATEGORIES: LogCategory[] = ['gemini', 'webhook', 'campaign', 'crm', 'grupos', 'auth', 'cron', 'system'];
const SEARCH_DEBOUNCE_MS = 400;

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

function buildParams(f: AppliedFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.levels.size > 0)     p.set('level',    [...f.levels].join(','));
  if (f.categories.size > 0) p.set('category', [...f.categories].join(','));
  if (f.search.trim())       p.set('search',   f.search.trim());
  if (f.fromDate)            p.set('from',     f.fromDate);
  if (f.toDate)              p.set('to',       f.toDate);
  p.set('limit', f.limit);
  return p;
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

// ─── Message Cell (truncate long messages) ────────────────────────────────────

const MSG_TRUNCATE = 200;

function MessageCell({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = message.length > MSG_TRUNCATE;
  return (
    <div>
      <p className="text-sm text-foreground leading-snug break-words">
        {isLong && !expanded ? message.slice(0, MSG_TRUNCATE) + '…' : message}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {expanded ? 'mostrar menos' : 'mensagem completa'}
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const [logs, setLogs]               = useState<SystemLog[]>([]);
  const [loading, setLoading]         = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // ── Editing filter state (UI controls, not yet applied) ──────────────────────
  const [editLevels, setEditLevels]         = useState<Set<LogLevel>>(new Set());
  const [editCategories, setEditCategories] = useState<Set<LogCategory>>(new Set());
  const [editSearch, setEditSearch]         = useState('');
  const [editFrom, setEditFrom]             = useState('');
  const [editTo, setEditTo]                 = useState('');
  const [editLimit, setEditLimit]           = useState('100');

  // ── Applied filter state (what the last/current fetch uses) ─────────────────
  // Stored in a ref so the auto-refresh interval always reads the latest values
  // without needing to be recreated when filters change.
  const appliedRef = useRef<AppliedFilters>({
    levels:     new Set(),
    categories: new Set(),
    search:     '',
    fromDate:   '',
    toDate:     '',
    limit:      '100',
  });

  // ── Debounce timer for search ─────────────────────────────────────────────────
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-refresh interval ─────────────────────────────────────────────────────
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Core fetch (reads from appliedRef — stable identity) ────────────────────
  const doFetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams(appliedRef.current);
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
  }, []); // stable — never changes

  // ── Apply filters and fetch ───────────────────────────────────────────────────
  const applyAndFetch = useCallback(() => {
    appliedRef.current = {
      levels:     editLevels,
      categories: editCategories,
      search:     editSearch,
      fromDate:   editFrom,
      toDate:     editTo,
      limit:      editLimit,
    };
    void doFetch();
  }, [editLevels, editCategories, editSearch, editFrom, editTo, editLimit, doFetch]);

  // ── Initial load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    void doFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // ── Auto-refresh — stable interval, reads appliedRef directly ────────────────
  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (!autoRefresh) return;

    autoRefreshRef.current = setInterval(() => {
      if (document.hidden) return; // skip when tab is hidden
      void doFetch();
    }, 10_000);

    const handleVisibilityChange = () => {
      if (!document.hidden && autoRefresh) {
        void doFetch(); // immediate refresh when tab becomes visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh, doFetch]); // doFetch is stable, so this only runs when autoRefresh toggles

  // ─── Filter toggles (pills apply immediately) ─────────────────────────────────
  function toggleLevel(level: LogLevel) {
    setEditLevels((prev) => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      // Apply immediately for pill toggles — fast, user expects instant feedback
      appliedRef.current = { ...appliedRef.current, levels: next };
      return next;
    });
    // Schedule fetch after state update settles
    setTimeout(() => void doFetch(), 0);
  }

  function toggleCategory(cat: LogCategory) {
    setEditCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      appliedRef.current = { ...appliedRef.current, categories: next };
      return next;
    });
    setTimeout(() => void doFetch(), 0);
  }

  // ── Search: debounced 400ms ───────────────────────────────────────────────────
  function handleSearchChange(value: string) {
    setEditSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      appliedRef.current = { ...appliedRef.current, search: value };
      void doFetch();
    }, SEARCH_DEBOUNCE_MS);
  }

  // ── Date/limit change: debounced ─────────────────────────────────────────────
  function handleFromChange(value: string) {
    setEditFrom(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      appliedRef.current = { ...appliedRef.current, fromDate: value };
      void doFetch();
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleToChange(value: string) {
    setEditTo(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      appliedRef.current = { ...appliedRef.current, toDate: value };
      void doFetch();
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleLimitChange(value: string) {
    setEditLimit(value);
    appliedRef.current = { ...appliedRef.current, limit: value };
    void doFetch();
  }

  // ── Clear all filters ────────────────────────────────────────────────────────
  function clearFilters() {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const cleared: AppliedFilters = { levels: new Set(), categories: new Set(), search: '', fromDate: '', toDate: '', limit: editLimit };
    setEditLevels(new Set());
    setEditCategories(new Set());
    setEditSearch('');
    setEditFrom('');
    setEditTo('');
    appliedRef.current = cleared;
    void doFetch();
  }

  // ── Delete a single log entry ─────────────────────────────────────────────────
  async function deleteLog(id: string) {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    try {
      await fetch(`/api/system-logs?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      // Optimistic removal already done; silently ignore network errors
    }
  }

  const hasFilters = editLevels.size > 0 || editCategories.size > 0 || editSearch || editFrom || editTo;

  // ─── Counts for header badges ─────────────────────────────────────────────────
  const levelCounts = logs.reduce<Record<LogLevel, number>>((acc, l) => {
    acc[l.level] = (acc[l.level] ?? 0) + 1;
    return acc;
  }, { debug: 0, info: 0, warn: 0, error: 0 });

  // ─── Render ──────────────────────────────────────────────────────────────────

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
            <Button variant="outline" size="sm" onClick={() => void applyAndFetch()} disabled={loading} className="gap-1.5">
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

          {/* Level pills — apply immediately on click */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs font-medium text-muted-foreground self-center mr-1">Nível:</span>
            {LEVELS.map((level) => {
              const cfg = LEVEL_CONFIG[level];
              const active = editLevels.has(level);
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

          {/* Category chips — apply immediately on click */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs font-medium text-muted-foreground self-center mr-1">Categoria:</span>
            {CATEGORIES.map((cat) => {
              const active = editCategories.has(cat);
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

          {/* Search + date range + limit — debounced */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar na mensagem… (400ms debounce)"
                value={editSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                    appliedRef.current = { ...appliedRef.current, search: editSearch };
                    void doFetch();
                  }
                }}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Input
              type="date"
              value={editFrom}
              onChange={(e) => handleFromChange(e.target.value)}
              className="h-8 text-sm w-36"
              title="Data inicial"
            />
            <Input
              type="date"
              value={editTo}
              onChange={(e) => handleToChange(e.target.value)}
              className="h-8 text-sm w-36"
              title="Data final"
            />
            <Select value={editLimit} onValueChange={handleLimitChange}>
              <SelectTrigger className="h-8 w-28 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 linhas</SelectItem>
                <SelectItem value="100">100 linhas</SelectItem>
                <SelectItem value="200">200 linhas</SelectItem>
                <SelectItem value="500">500 linhas</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={clearFilters}
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
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><div className="h-5 w-14 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-5 w-20 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-5 w-full animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-5 w-12 animate-pulse rounded bg-muted ml-auto" /></TableCell>
                    <TableCell><div className="h-5 w-24 animate-pulse rounded bg-muted ml-auto" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <ScrollText className="h-10 w-10 opacity-30" />
                      <div>
                        <p className="font-medium text-sm">Nenhum log encontrado</p>
                        <p className="text-xs mt-1">
                          Por padrão apenas alertas e erros são registrados.
                          Para ver mais eventos, defina{' '}
                          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">SYSLOG_MIN_LEVEL=info</code>
                          {' '}no servidor.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const lvl = LEVEL_CONFIG[log.level];
                  const LevelIcon = lvl.icon;
                  return (
                    <TableRow key={log.id} className="group border-border align-top hover:bg-muted/30">

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
                        <MessageCell message={log.message} />
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

                      {/* Delete */}
                      <TableCell className="pt-2.5 text-right">
                        <button
                          onClick={() => void deleteLog(log.id)}
                          title="Apagar log"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 hover:text-red-500 text-muted-foreground/50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
            {logs.length >= parseInt(editLimit) && ' Refine os filtros ou reduza o limite para melhor performance.'}
          </p>
        )}
      </div>
    </SidebarLayout>
  );
}
