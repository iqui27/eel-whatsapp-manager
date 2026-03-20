'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Flame, Trash2, Smartphone, Loader2, X, RefreshCw,
  RotateCcw, AlertTriangle, Wifi, WifiOff, Clock, ChevronDown, Layers,
  Pencil, Check, Shield, ChevronRight,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import SidebarLayout from '@/components/SidebarLayout';
import { EmptyState } from '@/components/empty-state';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChipHealthStatus =
  | 'healthy' | 'degraded' | 'cooldown' | 'quarantined'
  | 'banned' | 'warming_up' | 'disconnected' | 'not_found';

interface SegmentOption {
  id: string;
  name: string;
  segmentTag: string | null;
}

interface Chip {
  id: string;
  name: string;
  phone: string;
  instanceName: string | null;
  groupId: string | null;
  enabled: boolean | null;
  lastWarmed: string | null;
  status: 'connected' | 'disconnected' | 'warming';
  warmCount: number | null;
  // Health monitoring fields (Phase 14)
  healthStatus: ChipHealthStatus;
  messagesSentToday: number;
  messagesSentThisHour: number;
  dailyLimit: number;
  hourlyLimit: number;
  lastHealthCheck: string | null;
  lastWebhookEvent: string | null;
  cooldownUntil: string | null;
  bannedAt: string | null;
  errorCount: number;
  blockRate: number | null;
  // Segment assignment (Phase 21)
  assignedSegments: string[] | null;
  // Proxy config (Phase 35-05)
  proxyHost: string | null;
  proxyPort: number | null;
  proxyProtocol: 'http' | 'https' | 'socks4' | 'socks5' | null;
  proxyUsername: string | null;
  proxyPassword: string | null;
}

// ─── Health status config ─────────────────────────────────────────────────────

const HEALTH_CONFIG: Record<ChipHealthStatus, {
  label: string;
  description: string;
  dotColor: string;
  badgeClass: string;
  canRestart: boolean;
}> = {
  healthy:      { 
    label: 'Saudável', 
    description: 'Conectado ao WhatsApp e recebendo eventos normalmente',
    dotColor: 'bg-green-500',  
    badgeClass: 'bg-green-50 text-green-700 border-green-200',    
    canRestart: false 
  },
  degraded:     { 
    label: 'Degradado', 
    description: 'Conectado mas sem eventos recentes — webhook pode estar com problema',
    dotColor: 'bg-yellow-500', 
    badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200',  
    canRestart: true  
  },
  cooldown:     { 
    label: 'Descanso', 
    description: 'Em pausa preventiva para evitar banimento',
    dotColor: 'bg-orange-500', 
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',  
    canRestart: false 
  },
  quarantined:  { 
    label: 'Quarentena', 
    description: 'Múltiplas falhas consecutivas — verifique manualmente',
    dotColor: 'bg-red-500',    
    badgeClass: 'bg-red-50 text-red-700 border-red-200',          
    canRestart: true  
  },
  banned:       { 
    label: 'Banido', 
    description: 'Número bloqueado pelo WhatsApp — não pode ser usado',
    dotColor: 'bg-red-900',    
    badgeClass: 'bg-red-100 text-red-900 border-red-300',         
    canRestart: false 
  },
  warming_up:   { 
    label: 'Aquecendo', 
    description: 'Número novo em fase de aquecimento gradual',
    dotColor: 'bg-blue-500',   
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',       
    canRestart: false 
  },
  disconnected: { 
    label: 'Desconectado', 
    description: 'Sem conexão com WhatsApp — escanear QR code pode ser necessário',
    dotColor: 'bg-slate-400',  
    badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',    
    canRestart: true  
  },
  not_found: { 
    label: 'Não encontrado', 
    description: 'Instância não existe na Evolution API — verifique o nome ou crie a instância',
    dotColor: 'bg-gray-500',  
    badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',    
    canRestart: false  
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAgo(iso: string | null): string {
  if (!iso) return 'Nunca';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function isWebhookStale(iso: string | null): boolean {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() > 2 * 60 * 1000;
}

function progressColor(pct: number): string {
  if (pct >= 0.9) return 'bg-red-500';
  if (pct >= 0.7) return 'bg-yellow-500';
  return 'bg-green-500';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HealthBadge({ status }: { status: ChipHealthStatus }) {
  const cfg = HEALTH_CONFIG[status];
  return (
    <span 
      title={cfg.description}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium cursor-help',
        cfg.badgeClass,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dotColor)} />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono">{value}/{max}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn('h-1.5 rounded-full transition-all', progressColor(pct))}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

function ProxyBadge({ chip }: { chip: Chip }) {
  if (!chip.proxyHost) return null;
  const tooltip = `${chip.proxyProtocol ?? 'http'}://${chip.proxyHost}:${chip.proxyPort ?? 80}`;
  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 cursor-help"
    >
      <Shield className="h-2.5 w-2.5" />
      Proxy
    </span>
  );
}

// ─── Filter types ─────────────────────────────────────────────────────────────

type HealthFilter = 'all' | ChipHealthStatus;

const FILTER_BTNS: { label: string; value: HealthFilter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Saudável', value: 'healthy' },
  { label: 'Degradado', value: 'degraded' },
  { label: 'Desconectado', value: 'disconnected' },
  { label: 'Não encontrado', value: 'not_found' },
  { label: 'Quarentena', value: 'quarantined' },
  { label: 'Banido', value: 'banned' },
  { label: 'Aquecendo', value: 'warming_up' },
  { label: 'Descanso', value: 'cooldown' },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ChipsPage() {
  const router = useRouter();
  const [chips, setChips] = useState<Chip[]>([]);
  const [segments, setSegments] = useState<SegmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [restartingId, setRestartingId] = useState<string | null>(null);
  const [warmingId, setWarmingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<HealthFilter>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', instanceName: '', groupId: '',
    dailyLimit: '200', hourlyLimit: '25',
    assignedSegments: [] as string[],
    proxyHost: '', proxyPort: '80', proxyProtocol: 'http' as 'http' | 'https' | 'socks4' | 'socks5',
    proxyUsername: '', proxyPassword: '',
  });
  const [showProxySection, setShowProxySection] = useState(false);
  // Segment editing state for existing chips
  const [editingSegmentsId, setEditingSegmentsId] = useState<string | null>(null);
  const [editingSegments, setEditingSegments] = useState<string[]>([]);
  const [savingSegments, setSavingSegments] = useState(false);
  // Proxy editing state for existing chips
  const [editingProxyId, setEditingProxyId] = useState<string | null>(null);
  const [editingProxy, setEditingProxy] = useState({
    proxyHost: '', proxyPort: '80', proxyProtocol: 'http' as 'http' | 'https' | 'socks4' | 'socks5',
    proxyUsername: '', proxyPassword: '',
  });
  const [savingProxy, setSavingProxy] = useState(false);

  // ─── Data loading ──────────────────────────────────────────────────────────

  const fetchSegments = useCallback(async () => {
    try {
      const res = await fetch('/api/segments');
      if (res.ok) {
        const data = await res.json();
        setSegments(data.map((s: SegmentOption) => ({
          id: s.id,
          name: s.name,
          segmentTag: s.segmentTag,
        })));
      }
    } catch {
      // Silent fail - segments are optional
    }
  }, []);

  const fetchChips = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/chips');
      if (res.status === 401) { router.push('/login'); return; }
      setChips(await res.json());
    } catch {
      toast.error('Erro ao carregar chips');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Auto-refresh every 15 seconds — pauses when tab is backgrounded
  useEffect(() => {
    fetchChips();
    fetchSegments();

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (document.hidden) return;
        fetchChips(true);
      }, 15000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchChips(true); // immediate refresh when tab becomes visible
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPolling();
    };
  }, [fetchChips, fetchSegments]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/chips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          dailyLimit: parseInt(form.dailyLimit) || 200,
          hourlyLimit: parseInt(form.hourlyLimit) || 25,
          assignedSegments: form.assignedSegments.length > 0 ? form.assignedSegments : null,
          proxyHost: form.proxyHost || null,
          proxyPort: form.proxyHost ? (parseInt(form.proxyPort) || 80) : null,
          proxyProtocol: form.proxyHost ? form.proxyProtocol : null,
          proxyUsername: form.proxyHost ? (form.proxyUsername || null) : null,
          proxyPassword: form.proxyHost ? (form.proxyPassword || null) : null,
        }),
      });
      if (res.ok) {
        toast.success('Chip adicionado');
        setForm({ name: '', phone: '', instanceName: '', groupId: '', dailyLimit: '200', hourlyLimit: '25', assignedSegments: [], proxyHost: '', proxyPort: '80', proxyProtocol: 'http', proxyUsername: '', proxyPassword: '' });
        setShowForm(false);
        setShowProxySection(false);
        fetchChips(true);
      } else {
        const d = await res.json();
        toast.error(d.error || 'Erro ao adicionar chip');
      }
    } catch {
      toast.error('Erro ao adicionar chip');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (chip: Chip) => {
    try {
      await fetch('/api/chips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chip.id, updates: { enabled: !chip.enabled } }),
      });
      fetchChips(true);
    } catch {
      toast.error('Erro ao atualizar chip');
    }
  };

  const handleDelete = async (chip: Chip) => {
    if (!confirm(`Excluir "${chip.name}"?`)) return;
    try {
      await fetch(`/api/chips?id=${chip.id}`, { method: 'DELETE' });
      toast.success('Chip removido');
      fetchChips(true);
    } catch {
      toast.error('Erro ao deletar chip');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/chips/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const parts = [];
        if (data.healthy) parts.push(`${data.healthy} saudável`);
        if (data.degraded) parts.push(`${data.degraded} degradado`);
        if (data.disconnected) parts.push(`${data.disconnected} desconectado`);
        if (data.notFound) parts.push(`${data.notFound} não encontrado`);
        
        if (data.notFound > 0) {
          toast.warning(`Verificação: ${parts.join(', ')} — instâncias não encontradas precisam ser criadas na Evolution API`, { duration: 6000 });
        } else {
          toast.success(`Saúde verificada! ${parts.join(', ')}`);
        }
        fetchChips(true);
      } else {
        toast.error(data.error || 'Erro ao sincronizar');
      }
    } catch {
      toast.error('Erro ao sincronizar com a Evolution API');
    } finally {
      setSyncing(false);
    }
  };

  const handleRestart = async (chip: Chip) => {
    setRestartingId(chip.id);
    try {
      const res = await fetch('/api/chips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chip.id, action: 'restart' }),
      });
      const data = await res.json();
      if (res.ok) {
        if (!data.restartAvailable) {
          toast.warning(`Reiniciar não disponível: ${data.restartMessage}`, { duration: 5000 });
        } else {
          toast.success(`Chip ${chip.name} reiniciado — ${data.healthStatus === 'healthy' ? 'saudável' : 'verificando...'}`);
        }
        fetchChips(true);
      } else {
        // Show detailed error message
        const errorMsg = data.details || data.error || 'Erro ao reiniciar chip';
        toast.error(errorMsg, { duration: 6000 });
      }
    } catch (err) {
      toast.error(`Erro ao reiniciar chip: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setRestartingId(null);
    }
  };

  const handleWarm = async (chip: Chip) => {
    setWarmingId(chip.id);
    try {
      const res = await fetch('/api/warming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chip.id }),
      });
      if (res.ok) {
        toast.success(`Aquecendo ${chip.name}`);
      } else {
        toast.error('Erro ao aquecer');
      }
      fetchChips(true);
    } catch {
      toast.error('Erro ao aquecer chip');
    } finally {
      setWarmingId(null);
    }
  };

  const handleOpenSegmentEdit = (chip: Chip) => {
    setEditingSegmentsId(chip.id);
    setEditingSegments(chip.assignedSegments ?? []);
  };

  const handleSaveSegments = async (chipId: string) => {
    setSavingSegments(true);
    try {
      const res = await fetch('/api/chips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: chipId,
          updates: {
            assignedSegments: editingSegments.length > 0 ? editingSegments : null,
          },
        }),
      });
      if (res.ok) {
        toast.success('Segmentos atualizados');
        setEditingSegmentsId(null);
        fetchChips(true);
      } else {
        toast.error('Erro ao salvar segmentos');
      }
    } catch {
      toast.error('Erro ao salvar segmentos');
    } finally {
      setSavingSegments(false);
    }
  };

  const handleOpenProxyEdit = (chip: Chip) => {
    setEditingProxyId(chip.id);
    setEditingProxy({
      proxyHost: chip.proxyHost ?? '',
      proxyPort: String(chip.proxyPort ?? 80),
      proxyProtocol: chip.proxyProtocol ?? 'http',
      proxyUsername: chip.proxyUsername ?? '',
      proxyPassword: chip.proxyPassword ?? '',
    });
  };

  const handleSaveProxy = async (chipId: string) => {
    setSavingProxy(true);
    try {
      const hasProxy = editingProxy.proxyHost.trim().length > 0;
      const res = await fetch('/api/chips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: chipId,
          updates: {
            proxyHost: hasProxy ? editingProxy.proxyHost.trim() : null,
            proxyPort: hasProxy ? (parseInt(editingProxy.proxyPort) || 80) : null,
            proxyProtocol: hasProxy ? editingProxy.proxyProtocol : null,
            proxyUsername: hasProxy ? (editingProxy.proxyUsername || null) : null,
            proxyPassword: hasProxy ? (editingProxy.proxyPassword || null) : null,
          },
        }),
      });
      if (res.ok) {
        toast.success(hasProxy ? 'Proxy configurado' : 'Proxy removido');
        setEditingProxyId(null);
        fetchChips(true);
      } else {
        toast.error('Erro ao salvar proxy');
      }
    } catch {
      toast.error('Erro ao salvar proxy');
    } finally {
      setSavingProxy(false);
    }
  };

  // ─── Computed values ───────────────────────────────────────────────────────

  const filtered = chips.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
    const matchFilter = filter === 'all' || c.healthStatus === filter;
    return matchSearch && matchFilter;
  });

  const summary = {
    healthy: chips.filter((c) => c.healthStatus === 'healthy').length,
    degraded: chips.filter((c) => c.healthStatus === 'degraded').length,
    disconnected: chips.filter((c) => c.healthStatus === 'disconnected').length,
    quarantined: chips.filter((c) => c.healthStatus === 'quarantined' || c.healthStatus === 'banned').length,
    notFound: chips.filter((c) => c.healthStatus === 'not_found').length,
  };

  const currentFilterLabel = FILTER_BTNS.find((b) => b.value === filter)?.label ?? 'Todos';

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SidebarLayout currentPage="chips" pageTitle="Chips">
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Chips</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {chips.length} chip{chips.length !== 1 ? 's' : ''} cadastrado{chips.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
              {syncing ? 'Verificando...' : 'Sincronizar Saúde'}
            </button>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Novo chip
            </button>
          </div>
        </div>

        {/* Health Summary Bar */}
        {!loading && chips.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">{summary.healthy} saudável</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">{summary.degraded} degradado</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-muted-foreground">{summary.disconnected} desconectado</span>
            </div>
            {summary.notFound > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="h-2 w-2 rounded-full bg-gray-500" />
                <span className="text-gray-600 font-medium">{summary.notFound} não encontrado</span>
              </div>
            )}
            {summary.quarantined > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-red-600 font-medium">{summary.quarantined} em quarentena/banido</span>
              </div>
            )}
          </div>
        )}

        {/* Add chip form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleAdd} className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Novo chip</h2>
                  <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {([
                    ['Nome', 'name', 'Chip 1', 'text', true],
                    ['Telefone', 'phone', '5511999999999', 'text', true],
                    ['Instância API', 'instanceName', 'Marcela1', 'text', false],
                    ['Grupo (opcional)', 'groupId', 'ID do grupo', 'text', false],
                    ['Limite diário', 'dailyLimit', '200', 'number', false],
                    ['Limite por hora', 'hourlyLimit', '25', 'number', false],
                  ] as const).map(([label, key, ph, type, req]) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{label}</label>
                      <input
                        type={type}
                        placeholder={String(ph)}
                        required={req}
                        value={form[key as keyof typeof form] as string}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  ))}
                </div>
                
                {/* Segment selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Layers className="h-3 w-3" />
                    Segmentos atribuídos
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-md border border-input bg-background min-h-[60px]">
                    {segments.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Nenhum segmento disponível</span>
                    ) : (
                      segments.map((segment) => {
                        const isSelected = form.assignedSegments.includes(segment.id);
                        return (
                          <button
                            key={segment.id}
                            type="button"
                            onClick={() => {
                              setForm((f) => ({
                                ...f,
                                assignedSegments: isSelected
                                  ? f.assignedSegments.filter((id) => id !== segment.id)
                                  : [...f.assignedSegments, segment.id],
                              }));
                            }}
                            className={cn(
                              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                            )}
                          >
                            {segment.name}
                            {segment.segmentTag && (
                              <code className="ml-1 opacity-60">({segment.segmentTag})</code>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione os segmentos que este chip irá atender
                  </p>
                </div>

                {/* Proxy section — collapsible */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowProxySection((v) => !v)}
                    className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Shield className="h-3 w-3" />
                    Proxy (opcional)
                    <ChevronRight className={cn('h-3 w-3 transition-transform', showProxySection && 'rotate-90')} />
                  </button>
                  <AnimatePresence>
                    {showProxySection && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border border-blue-200 bg-blue-50/40 p-3">
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-medium text-muted-foreground">Host / IP</label>
                            <input
                              type="text"
                              placeholder="192.168.1.1 ou proxy.exemplo.com"
                              value={form.proxyHost}
                              onChange={(e) => setForm((f) => ({ ...f, proxyHost: e.target.value }))}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Protocolo</label>
                            <select
                              value={form.proxyProtocol}
                              onChange={(e) => setForm((f) => ({ ...f, proxyProtocol: e.target.value as typeof form.proxyProtocol }))}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="http">HTTP</option>
                              <option value="https">HTTPS</option>
                              <option value="socks4">SOCKS4</option>
                              <option value="socks5">SOCKS5</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Porta</label>
                            <input
                              type="number"
                              placeholder="80"
                              value={form.proxyPort}
                              onChange={(e) => setForm((f) => ({ ...f, proxyPort: e.target.value }))}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Usuário (opcional)</label>
                            <input
                              type="text"
                              placeholder="usuario"
                              value={form.proxyUsername}
                              onChange={(e) => setForm((f) => ({ ...f, proxyUsername: e.target.value }))}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Senha (opcional)</label>
                            <input
                              type="password"
                              placeholder="••••••••"
                              value={form.proxyPassword}
                              onChange={(e) => setForm((f) => ({ ...f, proxyPassword: e.target.value }))}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground sm:col-span-2">
                            Deixe o host em branco para não usar proxy. O proxy é aplicado na criação da instância.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar chips..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Filter dropdown for mobile, buttons for desktop */}
          <div className="hidden sm:flex gap-1 flex-wrap">
            {FILTER_BTNS.slice(0, 5).map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === value
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-muted-foreground hover:bg-accent',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Mobile filter dropdown */}
          <div className="sm:hidden relative">
            <button
              onClick={() => setShowFilterDropdown((v) => !v)}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent w-full justify-between"
            >
              {currentFilterLabel}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showFilterDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-md shadow-md z-10 w-full">
                {FILTER_BTNS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => { setFilter(value); setShowFilterDropdown(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-accent',
                      filter === value && 'font-medium text-primary',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chips grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-32" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <Skeleton className="h-5 w-9 rounded-full" />
                  <Skeleton className="h-3 w-12" />
                  <div className="ml-auto flex gap-1.5">
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-7 w-7 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            illustration="smartphone"
            title={search || filter !== 'all' ? 'Nenhum resultado' : 'Nenhum chip cadastrado'}
            description={
              search || filter !== 'all'
                ? 'Tente ajustar os filtros ou a busca'
                : 'Adicione um chip para começar'
            }
            action={
              !search && filter === 'all' ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Adicionar chip
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((chip, i) => {
              const health = HEALTH_CONFIG[chip.healthStatus ?? 'disconnected'];
              const dailyPct = (chip.dailyLimit ?? 200) > 0
                ? (chip.messagesSentToday ?? 0) / (chip.dailyLimit ?? 200)
                : 0;
              const hourlyPct = (chip.hourlyLimit ?? 25) > 0
                ? (chip.messagesSentThisHour ?? 0) / (chip.hourlyLimit ?? 25)
                : 0;
              const webhookStale = isWebhookStale(chip.lastWebhookEvent);

              return (
                <motion.div
                  key={chip.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    'rounded-xl border border-border bg-card p-4 space-y-3 transition-opacity',
                    !chip.enabled && 'opacity-50',
                  )}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                          <Smartphone className="h-4 w-4 text-primary" />
                        </div>
                        {/* Live status dot */}
                        <span className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
                          health.dotColor,
                        )} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{chip.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{chip.phone}</p>
                      </div>
                    </div>
                    <HealthBadge status={chip.healthStatus ?? 'disconnected'} />
                  </div>

                  {/* Instance name */}
                  {chip.instanceName && (
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {chip.instanceName}
                    </p>
                  )}

                  {/* Assigned segments — display or edit mode */}
                  {editingSegmentsId === chip.id ? (
                    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Layers className="h-3 w-3" />
                          Segmentos atribuídos
                        </span>
                        <button
                          onClick={() => setEditingSegmentsId(null)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {segments.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            Nenhum segmento criado ainda
                          </span>
                        ) : (
                          segments.map((seg) => {
                            const isSelected = editingSegments.includes(seg.id);
                            return (
                              <button
                                key={seg.id}
                                type="button"
                                onClick={() => {
                                  setEditingSegments((prev) =>
                                    isSelected
                                      ? prev.filter((id) => id !== seg.id)
                                      : [...prev, seg.id],
                                  );
                                }}
                                className={cn(
                                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                                  isSelected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                                )}
                              >
                                {seg.name}
                              </button>
                            );
                          })
                        )}
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingSegmentsId(null)}
                          className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => void handleSaveSegments(chip.id)}
                          disabled={savingSegments}
                          className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          {savingSegments
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Check className="h-3 w-3" />
                          }
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap group/seg">
                      <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                      {chip.assignedSegments && chip.assignedSegments.length > 0 ? (
                        <>
                          {chip.assignedSegments.map((segId) => {
                            const seg = segments.find((s) => s.id === segId);
                            return (
                              <span
                                key={segId}
                                className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                              >
                                {seg?.name ?? segId}
                              </span>
                            );
                          })}
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">
                          Sem segmento — atende todos
                        </span>
                      )}
                      <button
                        onClick={() => handleOpenSegmentEdit(chip)}
                        title="Editar segmentos"
                        className="ml-auto opacity-0 group-hover/seg:opacity-100 flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                        Editar
                      </button>
                    </div>
                  )}

                  {/* Proxy — display or edit mode */}
                  {editingProxyId === chip.id ? (
                    <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Shield className="h-3 w-3" />
                          Configurar proxy
                        </span>
                        <button
                          onClick={() => setEditingProxyId(null)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] font-medium text-muted-foreground">Host / IP</label>
                          <input
                            type="text"
                            placeholder="192.168.1.1 ou proxy.exemplo.com"
                            value={editingProxy.proxyHost}
                            onChange={(e) => setEditingProxy((p) => ({ ...p, proxyHost: e.target.value }))}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Protocolo</label>
                          <select
                            value={editingProxy.proxyProtocol}
                            onChange={(e) => setEditingProxy((p) => ({ ...p, proxyProtocol: e.target.value as typeof editingProxy.proxyProtocol }))}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="http">HTTP</option>
                            <option value="https">HTTPS</option>
                            <option value="socks4">SOCKS4</option>
                            <option value="socks5">SOCKS5</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Porta</label>
                          <input
                            type="number"
                            placeholder="80"
                            value={editingProxy.proxyPort}
                            onChange={(e) => setEditingProxy((p) => ({ ...p, proxyPort: e.target.value }))}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Usuário</label>
                          <input
                            type="text"
                            placeholder="usuario"
                            value={editingProxy.proxyUsername}
                            onChange={(e) => setEditingProxy((p) => ({ ...p, proxyUsername: e.target.value }))}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Senha</label>
                          <input
                            type="password"
                            placeholder="••••••"
                            value={editingProxy.proxyPassword}
                            onChange={(e) => setEditingProxy((p) => ({ ...p, proxyPassword: e.target.value }))}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Deixe o host em branco para remover o proxy.
                      </p>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingProxyId(null)}
                          className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => void handleSaveProxy(chip.id)}
                          disabled={savingProxy}
                          className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          {savingProxy
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Check className="h-3 w-3" />
                          }
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap group/proxy">
                      <ProxyBadge chip={chip} />
                      {!chip.proxyHost && (
                        <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                          <Shield className="h-2.5 w-2.5" />
                          Sem proxy
                        </span>
                      )}
                      <button
                        onClick={() => handleOpenProxyEdit(chip)}
                        title="Configurar proxy"
                        className="ml-auto opacity-0 group-hover/proxy:opacity-100 flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                        {chip.proxyHost ? 'Editar' : 'Adicionar'}
                      </button>
                    </div>
                  )}

                  {/* Status explanation for non-healthy chips */}
                  {chip.healthStatus !== 'healthy' && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                      {health.description}
                    </p>
                  )}

                  {/* Progress bars */}
                  <div className="space-y-2">
                    <ProgressBar
                      value={chip.messagesSentToday ?? 0}
                      max={chip.dailyLimit ?? 200}
                      label="Enviados hoje"
                    />
                    <ProgressBar
                      value={chip.messagesSentThisHour ?? 0}
                      max={chip.hourlyLimit ?? 25}
                      label="Esta hora"
                    />
                  </div>

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className="truncate">Check: {fmtAgo(chip.lastHealthCheck)}</span>
                    </div>
                    <div className={cn(
                      'flex items-center gap-1',
                      webhookStale && chip.healthStatus !== 'disconnected'
                        ? 'text-yellow-600'
                        : 'text-muted-foreground',
                    )}>
                      {webhookStale && chip.healthStatus !== 'disconnected'
                        ? <AlertTriangle className="h-3 w-3 shrink-0" />
                        : chip.healthStatus !== 'disconnected'
                          ? <Wifi className="h-3 w-3 shrink-0" />
                          : <WifiOff className="h-3 w-3 shrink-0" />
                      }
                      <span className="truncate">Evento: {fmtAgo(chip.lastWebhookEvent)}</span>
                    </div>
                  </div>

                  {/* Error badge */}
                  {(chip.errorCount ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{chip.errorCount} erro{(chip.errorCount ?? 0) !== 1 ? 's' : ''} consecutivo{(chip.errorCount ?? 0) !== 1 ? 's' : ''}</span>
                    </div>
                  )}

                  {/* Cooldown info */}
                  {chip.healthStatus === 'cooldown' && chip.cooldownUntil && (
                    <p className="text-xs text-orange-600">
                      Descanso até {new Date(chip.cooldownUntil).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-border flex-wrap">
                    <Switch
                      checked={chip.enabled ?? false}
                      onCheckedChange={() => handleToggle(chip)}
                    />
                    <span className="text-xs text-muted-foreground mr-auto">
                      {chip.enabled ? 'Ativo' : 'Inativo'}
                    </span>

                    {/* Restart button — only for chips that can be restarted */}
                    {health.canRestart && chip.instanceName && (
                      <button
                        onClick={() => handleRestart(chip)}
                        disabled={restartingId === chip.id}
                        title="Reiniciar instância"
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 transition-colors"
                      >
                        {restartingId === chip.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <RotateCcw className="h-3 w-3" />
                        }
                        Reiniciar
                      </button>
                    )}

                    {/* Warm button */}
                    <button
                      onClick={() => handleWarm(chip)}
                      disabled={!chip.enabled || warmingId === chip.id}
                      title="Aquecer"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 disabled:opacity-30 transition-colors"
                    >
                      {warmingId === chip.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Flame className="h-3.5 w-3.5" />
                      }
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(chip)}
                      title="Excluir"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} de {chips.length} chip{chips.length !== 1 ? 's' : ''} · Auto-atualiza a cada 15s
          </p>
        )}
      </div>
    </SidebarLayout>
  );
}
