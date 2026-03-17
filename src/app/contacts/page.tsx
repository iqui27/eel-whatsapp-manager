'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Trash2, Loader2, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { TableSkeleton } from '@/components/ui/skeleton';
import SidebarLayout from '@/components/SidebarLayout';
import { EmptyState } from '@/components/empty-state';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatPhoneDisplay } from '@/lib/phone';

interface Contact {
  id: string; name: string; phone: string;
  enabled: boolean | null; lastContacted: string | null; contactCount: number | null;
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

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
function avatarColor(id: string) { return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length]; }

type Filter = 'all' | 'active' | 'inactive';

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [form, setForm] = useState({ name: '', phone: '' });

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const cr = await fetch('/api/contacts');
      if (cr.status === 401) { router.push('/login'); return; }
      setContacts(await cr.json());
    } catch { toast.error('Erro ao carregar dados'); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { toast.success('Contato adicionado'); setForm({ name: '', phone: '' }); setShowForm(false); fetchAll(true); }
      else { const d = await res.json(); toast.error(d.error || 'Erro ao adicionar contato'); }
    } catch { toast.error('Erro ao adicionar contato'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (c: Contact) => {
    try {
      await fetch('/api/contacts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, updates: { enabled: !c.enabled } }) });
      fetchAll(true);
    } catch { toast.error('Erro ao atualizar contato'); }
  };

  const handleDelete = async (c: Contact) => {
    if (!confirm(`Excluir "${c.name}"?`)) return;
    try { await fetch(`/api/contacts?id=${c.id}`, { method: 'DELETE' }); toast.success('Contato removido'); fetchAll(true); }
    catch { toast.error('Erro ao deletar contato'); }
  };

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
    const matchF = filter === 'all' || (filter === 'active' ? c.enabled : !c.enabled);
    return matchQ && matchF;
  });

  const filterBtns: { label: string; value: Filter }[] = [
    { label: 'Todos', value: 'all' }, { label: 'Ativos', value: 'active' }, { label: 'Inativos', value: 'inactive' },
  ];

  return (
    <SidebarLayout currentPage="contacts" pageTitle="Contatos">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Contatos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{contacts.length} contato{contacts.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Novo contato
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <form onSubmit={handleAdd} className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Novo contato</h2>
                  <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([['Nome', 'name', 'João Silva', true], ['Telefone', 'phone', '5511999999999', true]] as const).map(([label, key, ph, req]) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{label}</label>
                      <input type="text" placeholder={ph} required={req} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
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

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" placeholder="Buscar contatos..." value={search} onChange={e => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex gap-1">
            {filterBtns.map(({ label, value }) => (
              <button key={value} onClick={() => setFilter(value)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', filter === value ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-accent')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Contato', 'Telefone', 'Último contato', 'Enviados', 'Ativo', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            {loading ? <TableSkeleton rows={5} cols={6} /> : filtered.length === 0 ? (
              <tbody><tr><td colSpan={6}>
                {search || filter !== 'all'
                  ? <EmptyState illustration="users" title="Nenhum resultado" description="Tente ajustar os filtros ou a busca" />
                  : <EmptyState illustration="users" title="Nenhum contato cadastrado" description="Adicione contatos para iniciar o aquecimento" action={<button onClick={() => setShowForm(true)} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Adicionar contato</button>} />
                }
              </td></tr></tbody>
            ) : (
              <tbody>
                {filtered.map((c, i) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className={cn('border-b border-border last:border-0 hover:bg-muted/30 transition-colors', !c.enabled && 'opacity-50')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold', avatarColor(c.id))}>
                          {initials(c.name)}
                        </div>
                        <span className="font-medium text-foreground">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{formatPhoneDisplay(c.phone)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{fmt(c.lastContacted)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.contactCount ?? 0}</td>
                    <td className="px-4 py-3"><Switch checked={c.enabled ?? false} onCheckedChange={() => handleToggle(c)} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button onClick={() => handleDelete(c)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
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
        {!loading && filtered.length > 0 && <p className="text-xs text-muted-foreground">{filtered.length} de {contacts.length} contato{contacts.length !== 1 ? 's' : ''}</p>}
      </div>
    </SidebarLayout>
  );
}
