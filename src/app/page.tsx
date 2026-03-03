'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Smartphone,
  Wifi,
  Flame,
  Users,
  Layers,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import SidebarLayout from '@/components/SidebarLayout';
import { KpiCardSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Chip {
  id: string;
  name: string;
  phone: string;
  enabled: boolean | null;
  status: 'connected' | 'disconnected' | 'warming';
  warmCount: number | null;
  lastWarmed: string | null;
}
interface Contact { id: string }
interface Cluster { id: string }
interface LogEntry {
  id: string;
  createdAt: string;
  chipName: string;
  phone: string;
  status: 'success' | 'error';
  message: string | null;
}
interface DailyStats {
  date: string;
  total: number;
  success: number;
  error: number;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon: Icon,
  gradient,
  trend,
  trendLabel,
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', gradient)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
      {trendLabel && (
        <div className={cn(
          'flex items-center gap-1 text-xs font-medium',
          trend === 'up' ? 'text-[var(--success)]' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground',
        )}>
          {trend === 'up' && <TrendingUp className="h-3 w-3" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3" />}
          {trendLabel}
        </div>
      )}
    </motion.div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'connected' | 'disconnected' | 'warming' }) {
  const map = {
    connected:    { label: 'Conectado',     cls: 'badge-success' },
    warming:      { label: 'Aquecendo',     cls: 'badge-warning' },
    disconnected: { label: 'Desconectado',  cls: 'badge-muted' },
  };
  const { label, cls } = map[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ─── Custom tooltip for AreaChart ─────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.name === 'success' ? 'var(--success)' : p.name === 'error' ? 'var(--destructive)' : 'var(--primary)' }}>
          {p.name === 'success' ? 'Sucesso' : p.name === 'error' ? 'Erro' : 'Total'}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [chips, setChips] = useState<Chip[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warmingAll, setWarmingAll] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [chipsRes, logsRes, contactsRes, clustersRes] = await Promise.all([
        fetch('/api/chips'),
        fetch('/api/logs'),
        fetch('/api/contacts'),
        fetch('/api/clusters'),
      ]);
      if (chipsRes.status === 401) { router.push('/login'); return; }
      const [chipsData, logsData, contactsData, clustersData] = await Promise.all([
        chipsRes.json(),
        logsRes.json(),
        contactsRes.json(),
        clustersRes.json(),
      ]);
      setChips(chipsData);
      setLogs(logsData);
      setContacts(contactsData);
      setClusters(clustersData);
    } catch {
      toast.error('Falha ao carregar dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleWarmAll = async () => {
    setWarmingAll(true);
    try {
      const res = await fetch('/api/warming', { method: 'GET' });
      if (res.ok) toast.success('Aquecimento iniciado');
      else toast.error('Erro ao aquecer chips');
      fetchData(true);
    } catch {
      toast.error('Erro ao aquecer chips');
    } finally {
      setWarmingAll(false);
    }
  };

  // ── Derived stats ──
  const connectedChips = chips.filter(c => c.status === 'connected').length;
  const activeChips    = chips.filter(c => c.enabled).length;
  const totalWarming   = chips.reduce((acc, c) => acc + (c.warmCount ?? 0), 0);
  const successLogs    = logs.filter(l => l.status === 'success').length;
  const errorLogs      = logs.filter(l => l.status === 'error').length;
  const successRate    = logs.length > 0 ? Math.round((successLogs / logs.length) * 100) : 0;

  // ── Chart data: last 7 days from logs ──
  const dailyStats: DailyStats[] = (() => {
    const map = new Map<string, DailyStats>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
      map.set(key, { date: label, total: 0, success: 0, error: 0 });
    }
    for (const log of logs) {
      const key = new Date(log.createdAt).toISOString().slice(0, 10);
      const entry = map.get(key);
      if (entry) {
        entry.total++;
        if (log.status === 'success') entry.success++;
        else entry.error++;
      }
    }
    return Array.from(map.values());
  })();

  // ── Donut chart data ──
  const donutData = [
    { name: 'Sucesso', value: successLogs || 1, color: 'var(--success)' },
    { name: 'Erro',    value: errorLogs || 0,   color: 'var(--destructive)' },
  ];

  // ── Recent activity (last 8 logs) ──
  const recentLogs = logs.slice(0, 8);

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Agora';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  if (loading) {
    return (
      <SidebarLayout currentPage="dashboard">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <KpiCardSkeleton key={i} />)}
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="dashboard" pageTitle="Dashboard">
      <div className="p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Visão geral dos seus chips WhatsApp</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            </button>
            <button
              onClick={handleWarmAll}
              disabled={warmingAll}
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              <Flame className="h-3.5 w-3.5" />
              {warmingAll ? 'Aquecendo...' : 'Aquecer todos'}
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total de chips"
            value={chips.length}
            icon={Smartphone}
            gradient="kpi-gradient-blue"
            trend="neutral"
            trendLabel={`${activeChips} ativos`}
            delay={0}
          />
          <KpiCard
            label="Conectados"
            value={connectedChips}
            icon={Wifi}
            gradient="kpi-gradient-green"
            trend={connectedChips > 0 ? 'up' : 'neutral'}
            trendLabel={`de ${chips.length} chips`}
            delay={0.05}
          />
          <KpiCard
            label="Aquecimentos"
            value={totalWarming}
            icon={Flame}
            gradient="kpi-gradient-amber"
            trend="neutral"
            trendLabel="total acumulado"
            delay={0.1}
          />
          <KpiCard
            label="Taxa de sucesso"
            value={`${successRate}%`}
            icon={Zap}
            gradient="kpi-gradient-purple"
            trend={successRate >= 80 ? 'up' : successRate >= 50 ? 'neutral' : 'down'}
            trendLabel={`${successLogs} de ${logs.length} envios`}
            delay={0.15}
          />
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Line chart — 7 days */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-2 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Atividade (7 dias)</h2>
                <p className="text-xs text-muted-foreground">Envios por dia</p>
              </div>
            </div>
            {logs.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Nenhum envio registrado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={dailyStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradError" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--destructive)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--destructive)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="success" name="success" stroke="var(--success)" strokeWidth={2} fill="url(#gradSuccess)" />
                  <Area type="monotone" dataKey="error"   name="error"   stroke="var(--destructive)" strokeWidth={2} fill="url(#gradError)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Donut chart — success rate */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <h2 className="text-sm font-semibold text-foreground mb-1">Taxa de sucesso</h2>
            <p className="text-xs text-muted-foreground mb-3">Total de {logs.length} envios</p>
            <div className="flex flex-col items-center">
              <div className="relative">
                <PieChart width={140} height={140}>
                  <Pie
                    data={donutData}
                    cx={65} cy={65}
                    innerRadius={45} outerRadius={65}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{successRate}%</span>
                </div>
              </div>
              <div className="flex gap-4 mt-3">
                {donutData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    {d.name}: {d.value === 1 && !logs.length ? 0 : d.value}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Bottom row: chips overview + activity feed ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Chips status overview */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="lg:col-span-2 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Chips</h2>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--success)]" /> {connectedChips} conectados</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--warning)]" /> {chips.filter(c => c.status === 'warming').length} aquecendo</span>
              </div>
            </div>
            {chips.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                Nenhum chip cadastrado —{' '}
                <a href="/chips" className="ml-1 text-primary hover:underline">adicionar</a>
              </div>
            ) : (
              <div className="space-y-2">
                {chips.slice(0, 5).map((chip) => (
                  <div key={chip.id} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 border border-border', !chip.enabled && 'opacity-50')}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                      <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{chip.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{chip.phone}</p>
                    </div>
                    <StatusBadge status={chip.status} />
                    <span className="text-xs text-muted-foreground shrink-0">{chip.warmCount ?? 0}×</span>
                  </div>
                ))}
                {chips.length > 5 && (
                  <a href="/chips" className="block text-center text-xs text-primary hover:underline pt-1">
                    Ver todos ({chips.length})
                  </a>
                )}
              </div>
            )}
          </motion.div>

          {/* Activity feed */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Atividade recente</h2>
              <a href="/history" className="text-xs text-primary hover:underline">Ver tudo</a>
            </div>
            {recentLogs.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                Sem atividade recente
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5">
                    {log.status === 'success'
                      ? <CheckCircle className="h-4 w-4 shrink-0 text-[var(--success)] mt-0.5" />
                      : <XCircle    className="h-4 w-4 shrink-0 text-destructive mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{log.chipName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{log.phone}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Stats row ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            { label: 'Contatos',  value: contacts.length,  icon: Users,   href: '/contacts' },
            { label: 'Clusters',  value: clusters.length,  icon: Layers,  href: '/clusters' },
            { label: 'Envios OK', value: successLogs,      icon: CheckCircle, href: '/history' },
            { label: 'Erros',     value: errorLogs,        icon: XCircle, href: '/history' },
          ].map(({ label, value, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors"
            >
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </a>
          ))}
        </motion.div>

      </div>
    </SidebarLayout>
  );
}
