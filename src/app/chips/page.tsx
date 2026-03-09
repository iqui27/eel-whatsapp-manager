'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Flame, Trash2, Smartphone, Loader2, X, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { TableSkeleton } from '@/components/ui/skeleton';
import SidebarLayout from '@/components/SidebarLayout';
import { EmptyState } from '@/components/empty-state';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Chip {
  id: string; name: string; phone: string;
  instanceName: string | null; groupId: string | null;
  enabled: boolean | null; lastWarmed: string | null;
  status: 'connected' | 'disconnected' | 'warming';
  warmCount: number | null;
}

const STATUS_MAP = {
  connected:    { label: 'Conectado',    cls: 'badge-success' },
  warming:      { label: 'Aquecendo',    cls: 'badge-warning' },
  disconnected: { label: 'Desconectado', cls: 'badge-muted'   },
};

function StatusBadge({ status }: { status: Chip['status'] }) {
  const { label, cls } = STATUS_MAP[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />{label}
    </span>
  );
}

function fmt(iso: string | null) {
  if (!iso) return 'Nunca';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'Agora';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

type Filter = 'all' | 'connected' | 'warming' | 'disconnected';

export default function ChipsPage() {
  const router = useRouter();
  const [chips, setChips] = useState<Chip[]>([]);
  const [loading, setLoading] = useState(true);
  const [warmingId, setWarmingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [form, setForm] = useState({ name: '', phone: '', instanceName: '', groupId: '' });

  const fetchChips = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/chips');
      if (res.status === 401) { router.push('/login'); return; }
      setChips(await res.json());
    } catch { toast.error('Erro ao carregar chips'); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchChips(); }, [fetchChips]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('/api/chips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { toast.success('Chip adicionado'); setForm({ name: '', phone: '', instanceName: '', groupId: '' }); setShowForm(false); fetchChips(true); }
      else { const d = await res.json(); toast.error(d.error || 'Erro ao adicionar chip'); }
    } catch { toast.error('Erro ao adicionar chip'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (chip: Chip) => {
    try {
      await fetch('/api/chips', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: chip.id, updates: { enabled: !chip.enabled } }) });
      fetchChips(true);
    } catch { toast.error('Erro ao atualizar chip'); }
  };

  const handleDelete = async (chip: Chip) => {
    if (!confirm(`Excluir "${chip.name}"?`)) return;
    try { await fetch(`/api/chips?id=${chip.id}`, { method: 'DELETE' }); toast.success('Chip removido'); fetchChips(true); }
    catch { toast.error('Erro ao deletar chip'); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/chips/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Sincronizado! ${data.updated} chip(s) atualizado(s)`);
        fetchChips(true);
      } else {
        toast.error(data.error || 'Erro ao sincronizar');
      }
    } catch { toast.error('Erro ao sincronizar com a Evolution API'); }
    finally { setSyncing(false); }
  };

  const handleWarm = async (chip: Chip) => {
    setWarmingId(chip.id);
    try {
      const res = await fetch('/api/warming', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: chip.id }) });
      if (res.ok) toast.success(`Aquecendo ${chip.name}`); else toast.error('Erro ao aquecer');
      fetchChips(true);
    } catch { toast.error('Erro ao aquecer chip'); }
    finally { setWarmingId(null); }
  };

  const filtered = chips.filter(c => {
    const q = search.toLowerCase();
    return (!q || c.name.toLowerCase().includes(q) || c.phone.includes(q)) && (filter === 'all' || c.status === filter);
  });

  const filterBtns: { label: string; value: Filter }[] = [
    { label: 'Todos', value: 'all' }, { label: 'Conectados', value: 'connected' },
    { label: 'Aquecendo', value: 'warming' }, { label: 'Desconectados', value: 'disconnected' },
  ];

  return (
    <SidebarLayout currentPage="chips" pageTitle="Chips">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Chips</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{chips.length} chip{chips.length !== 1 ? 's' : ''} cadastrado{chips.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 transition-colors">
              <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
            <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Novo chip
            </button>
          </div>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <form onSubmit={handleAdd} className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Novo chip</h2>
                  <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {([['Nome', 'name', 'Chip 1', true], ['Telefone', 'phone', '5511999999999', true], ['Instância API', 'instanceName', 'Marcela1', false], ['Grupo (opcional)', 'groupId', 'ID do grupo', false]] as const).map(([label, key, ph, req]) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{label}</label>
                      <input type="text" placeholder={ph} required={req} value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{saving ? 'Salvando...' : 'Salvar'}
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
            <input type="text" placeholder="Buscar chips..." value={search} onChange={e => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {filterBtns.map(({ label, value }) => (
              <button key={value} onClick={() => setFilter(value)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', filter === value ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-accent')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Nome', 'Telefone', 'Instância', 'Status', 'Último', 'Total', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            {loading ? <TableSkeleton rows={5} cols={7} /> : filtered.length === 0 ? (
              <tbody><tr><td colSpan={7}>
                {search || filter !== 'all'
                  ? <EmptyState illustration="smartphone" title="Nenhum resultado" description="Tente ajustar os filtros ou a busca" />
                  : <EmptyState illustration="smartphone" title="Nenhum chip cadastrado" description="Adicione seu primeiro chip WhatsApp para começar" action={<button onClick={() => setShowForm(true)} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Adicionar chip</button>} />
                }
              </td></tr></tbody>
            ) : (
              <tbody>
                {filtered.map((chip, i) => (
                  <motion.tr key={chip.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className={cn('border-b border-border last:border-0 hover:bg-muted/30 transition-colors', !chip.enabled && 'opacity-50')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Smartphone className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{chip.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{chip.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{chip.instanceName || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={chip.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{fmt(chip.lastWarmed)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{chip.warmCount ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Switch checked={chip.enabled ?? false} onCheckedChange={() => handleToggle(chip)} />
                        <button onClick={() => handleWarm(chip)} disabled={!chip.enabled || warmingId === chip.id} title="Aquecer"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 disabled:opacity-30">
                          {warmingId === chip.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flame className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => handleDelete(chip)} title="Excluir"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {!loading && filtered.length > 0 && <p className="text-xs text-muted-foreground">{filtered.length} de {chips.length} chip{chips.length !== 1 ? 's' : ''}</p>}
      </div>
    </SidebarLayout>
  );
}
