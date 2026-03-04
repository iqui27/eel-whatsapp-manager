'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Layers, Loader2, X, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import SidebarLayout from '@/components/SidebarLayout';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Cluster {
  id: string; name: string; messages: string[] | null;
  maxMessagesPerDay: number | null; priority: number | null;
  windowStart: string | null; windowEnd: string | null; enabled: boolean | null;
}

export default function ClustersPage() {
  const router = useRouter();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', messagesText: '', maxMessagesPerDay: 10, priority: 1, windowStart: '08:00', windowEnd: '22:00' });

  const fetchClusters = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/clusters');
      if (res.status === 401) { router.push('/login'); return; }
      setClusters(await res.json());
    } catch { toast.error('Erro ao carregar clusters'); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchClusters(); }, [fetchClusters]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const messages = form.messagesText.split('\n').map(m => m.trim()).filter(Boolean);
    if (messages.length === 0) { toast.error('Adicione pelo menos uma mensagem'); setSaving(false); return; }
    try {
      const res = await fetch('/api/clusters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, messages }) });
      if (res.ok) { toast.success('Cluster criado'); setForm({ name: '', messagesText: '', maxMessagesPerDay: 10, priority: 1, windowStart: '08:00', windowEnd: '22:00' }); setShowForm(false); fetchClusters(true); }
      else { const d = await res.json(); toast.error(d.error || 'Erro ao criar cluster'); }
    } catch { toast.error('Erro ao criar cluster'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (c: Cluster) => {
    try {
      await fetch('/api/clusters', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, updates: { enabled: !c.enabled } }) });
      fetchClusters(true);
    } catch { toast.error('Erro ao atualizar cluster'); }
  };

  const handleDelete = async (c: Cluster) => {
    if (!confirm(`Excluir cluster "${c.name}"?`)) return;
    try { await fetch(`/api/clusters?id=${c.id}`, { method: 'DELETE' }); toast.success('Cluster removido'); fetchClusters(true); }
    catch { toast.error('Erro ao deletar cluster'); }
  };

  return (
    <SidebarLayout currentPage="clusters" pageTitle="Clusters">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Clusters</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{clusters.length} cluster{clusters.length !== 1 ? 's' : ''} de mensagens</p>
          </div>
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Novo cluster
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <form onSubmit={handleAdd} className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Novo cluster</h2>
                  <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Nome</label>
                    <input type="text" placeholder="Ex: Boas-vindas" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Máx. por dia</label>
                    <input type="number" min={1} value={form.maxMessagesPerDay} onChange={e => setForm(f => ({ ...f, maxMessagesPerDay: +e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
                    <input type="number" min={1} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: +e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Janela início</label>
                    <input type="time" value={form.windowStart} onChange={e => setForm(f => ({ ...f, windowStart: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Janela fim</label>
                    <input type="time" value={form.windowEnd} onChange={e => setForm(f => ({ ...f, windowEnd: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Mensagens <span className="text-muted-foreground/60">(uma por linha)</span></label>
                  <textarea rows={5} placeholder={"Olá! Como posso ajudar?\nBem-vindo ao nosso serviço!\n{Opção A|Opção B} — use spintax com { | }"} value={form.messagesText}
                    onChange={e => setForm(f => ({ ...f, messagesText: e.target.value }))}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                  <p className="text-xs text-muted-foreground">{form.messagesText.split('\n').filter(m => m.trim()).length} mensagem{form.messagesText.split('\n').filter(m => m.trim()).length !== 1 ? 's' : ''}</p>
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

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl border border-border bg-card shimmer" />)}</div>
        ) : clusters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-border text-muted-foreground gap-3">
            <Layers className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhum cluster criado.</p>
            <button onClick={() => setShowForm(true)} className="text-sm text-primary hover:underline">Criar primeiro cluster</button>
          </div>
        ) : (
          <div className="space-y-3">
            {clusters.sort((a, b) => (a.priority ?? 1) - (b.priority ?? 1)).map((cluster, i) => {
              const isOpen = expanded === cluster.id;
              const msgs = cluster.messages ?? [];
              return (
                <motion.div key={cluster.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={cn('rounded-xl border border-border bg-card overflow-hidden', !cluster.enabled && 'opacity-60')}>
                  <div className="flex items-center gap-4 px-4 py-3.5">
                    {/* Priority badge */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {cluster.priority ?? 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{cluster.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>{msgs.length} mensagem{msgs.length !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>Máx. {cluster.maxMessagesPerDay ?? 10}/dia</span>
                        <span>·</span>
                        <span>{cluster.windowStart ?? '08:00'} – {cluster.windowEnd ?? '22:00'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={cluster.enabled ?? false} onCheckedChange={() => handleToggle(cluster)} />
                      <button onClick={() => handleDelete(cluster)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setExpanded(isOpen ? null : cluster.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="border-t border-border px-4 py-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Mensagens</p>
                          {msgs.map((msg, j) => (
                            <div key={j} className="flex items-start gap-2.5 rounded-lg bg-muted/50 px-3 py-2">
                              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                              <p className="text-xs text-foreground leading-relaxed">{msg}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
