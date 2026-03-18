'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Smartphone,
  Users,
  History,
  Settings,
  Search,
  ArrowRight,
  UserCheck,
  Send,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Entity search types ──────────────────────────────────────────────────────

interface EntityResult {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  type: 'voter' | 'campaign' | 'segment';
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  keywords: string[];
}

const commands: CommandItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Visão geral e métricas',
    icon: LayoutDashboard,
    href: '/',
    keywords: ['dashboard', 'home', 'início', 'métricas'],
  },
  {
    id: 'chips',
    label: 'Chips',
    description: 'Gerenciar chips WhatsApp',
    icon: Smartphone,
    href: '/chips',
    keywords: ['chips', 'whatsapp', 'telefone', 'instância'],
  },
  {
    id: 'contacts',
    label: 'Contatos',
    description: 'Gerenciar contatos',
    icon: Users,
    href: '/contacts',
    keywords: ['contatos', 'contacts', 'pessoas'],
  },
  {
    id: 'clusters',
    label: 'Clusters',
    description: 'Grupos de mensagens',
    icon: Target,
    href: '/clusters',
    keywords: ['clusters', 'grupos', 'mensagens'],
  },
  {
    id: 'history',
    label: 'Histórico',
    description: 'Log de envios',
    icon: History,
    href: '/history',
    keywords: ['histórico', 'history', 'log', 'envios'],
  },
  {
    id: 'settings',
    label: 'Configurações',
    description: 'Evolution API, Gemini AI, aquecimento',
    icon: Settings,
    href: '/configuracoes',
    keywords: ['configurações', 'settings', 'api', 'aquecimento', 'senha'],
  },
  {
    id: 'crm',
    label: 'CRM Eleitoral',
    description: 'Gerenciar perfis de eleitores',
    icon: Users,
    href: '/crm',
    keywords: ['crm', 'eleitores', 'contatos', 'leads'],
  },
  {
    id: 'campanhas',
    label: 'Campanhas',
    description: 'Criar e gerenciar campanhas',
    icon: Send,
    href: '/campanhas',
    keywords: ['campanhas', 'envio', 'mensagens', 'disparo'],
  },
  {
    id: 'conversas',
    label: 'Conversas',
    description: 'Atendimento humano HITL',
    icon: UserCheck,
    href: '/conversas',
    keywords: ['conversas', 'chat', 'atendimento', 'hitl'],
  },
  {
    id: 'perfil',
    label: 'Meu Perfil',
    description: 'Editar nome, senha e permissões',
    icon: UserCheck,
    href: '/perfil',
    keywords: ['perfil', 'senha', 'permissões', 'conta'],
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [entityResults, setEntityResults] = useState<EntityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<number | null>(null);
  const router = useRouter();

  // ⌘K / Ctrl+K to open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Entity search (debounced, 3+ chars)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setEntityResults([]); return; }
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    setIsSearching(true);
    searchTimerRef.current = window.setTimeout(async () => {
      try {
        const [votersRes] = await Promise.all([
          fetch(`/api/voters?search=${encodeURIComponent(q)}&limit=5`),
        ]);
        const results: EntityResult[] = [];
        if (votersRes.ok) {
          const data = await votersRes.json();
          const voters = Array.isArray(data) ? data : (data.data ?? []);
          for (const v of voters) {
            results.push({ id: v.id, label: v.name, sublabel: v.phone, href: `/crm/${v.id}`, type: 'voter' });
          }
        }
        setEntityResults(results);
      } catch { setEntityResults([]); }
      finally { setIsSearching(false); }
    }, 300);
  }, [query]);

  const filtered = query.trim()
    ? commands.filter((c) =>
        [c.label, c.description ?? '', ...c.keywords].some((k) =>
          k.toLowerCase().includes(query.toLowerCase()),
        ),
      )
    : commands;

  const execute = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      if (item.href) router.push(item.href);
      else item.action?.();
    },
    [router],
  );

  // Arrow navigation + Enter
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((v) => Math.min(v + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((v) => Math.max(v - 1, 0));
      }
      if (e.key === 'Enter' && filtered[selected]) {
        execute(filtered[selected]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, selected, execute]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cmd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <motion.div
            key="cmd-panel"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-md -translate-x-1/2"
          >
            <div className="overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar páginas..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(0);
                  }}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border px-1.5 text-[10px] text-muted-foreground">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
                {/* Page navigation results */}
                {filtered.length > 0 && (
                  <>
                    {query.trim().length >= 3 && entityResults.length > 0 && (
                      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Páginas</p>
                    )}
                    {filtered.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => execute(item)}
                          onMouseEnter={() => setSelected(i)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                            i === selected ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50',
                          )}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{item.label}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                            )}
                          </div>
                          {i === selected && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Entity search results */}
                {query.trim().length >= 3 && (
                  <>
                    {entityResults.length > 0 && (
                      <>
                        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Eleitores</p>
                        {entityResults.map(entity => (
                          <button
                            key={entity.id}
                            onClick={() => { setOpen(false); router.push(entity.href); }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors text-foreground hover:bg-accent/50"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background shrink-0">
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{entity.label}</div>
                              {entity.sublabel && <div className="text-xs text-muted-foreground">{entity.sublabel}</div>}
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </button>
                        ))}
                      </>
                    )}
                    {isSearching && (
                      <p className="px-4 py-2 text-xs text-muted-foreground">Buscando eleitores...</p>
                    )}
                    {!isSearching && filtered.length === 0 && entityResults.length === 0 && (
                      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                        Nenhum resultado para &quot;{query}&quot;
                      </p>
                    )}
                  </>
                )}

                {/* Empty state for short queries */}
                {query.trim().length > 0 && query.trim().length < 3 && filtered.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Nenhum resultado para &quot;{query}&quot;
                  </p>
                )}
                {query.trim().length === 0 && filtered.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Nenhum resultado
                  </p>
                )}
              </div>

              {/* Footer hint */}
              <div className="flex items-center gap-3 border-t border-border px-4 py-2">
                <span className="text-[11px] text-muted-foreground">
                  <kbd className="rounded border border-border px-1 text-[10px]">↑↓</kbd> navegar
                </span>
                <span className="text-[11px] text-muted-foreground">
                  <kbd className="rounded border border-border px-1 text-[10px]">↵</kbd> abrir
                </span>
                <span className="text-[11px] text-muted-foreground ml-auto">
                  <kbd className="rounded border border-border px-1 text-[10px]">⌘K</kbd> fechar
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Trigger button for the header
export function CommandTrigger() {
  return (
    <button
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
        );
      }}
      className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Buscar...</span>
      <kbd className="ml-2 text-[10px] border border-border rounded px-1">⌘K</kbd>
    </button>
  );
}
