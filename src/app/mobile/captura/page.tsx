'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CloudOff, RefreshCw, Smartphone, UploadCloud, Wifi, WifiOff } from 'lucide-react';

type PendingCapture = {
  id: string;
  name: string;
  phone: string;
  neighborhood: string;
  city: string;
  zone: string;
  section: string;
  tags: string[];
  notes: string;
  queuedAt: string;
};

const STORAGE_KEY = 'eel_mobile_capture_queue_v1';

function readStoredQueue(): PendingCapture[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as PendingCapture[] : [];
  } catch {
    return [];
  }
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  neighborhood: '',
  city: '',
  zone: '',
  section: '',
  tags: '',
  notes: '',
};

export default function MobileCapturePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [online, setOnline] = useState(true); // Default to online for SSR
  const [syncing, setSyncing] = useState(false);
  const [queue, setQueue] = useState<PendingCapture[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);

  // Set initial state after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setOnline(window.navigator.onLine);
    setQueue(readStoredQueue());
  }, []);

  const queueCount = queue.length;
  const queueLabel = useMemo(() => {
    if (queueCount === 0) return 'Sem capturas pendentes';
    return `${queueCount} captura${queueCount > 1 ? 's' : ''} aguardando sincronização`;
  }, [queueCount]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const persistQueue = useCallback((nextQueue: PendingCapture[]) => {
    setQueue(nextQueue);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextQueue));
  }, []);

  const createPayload = useCallback((capture: PendingCapture) => ({
    name: capture.name,
    phone: capture.phone,
    neighborhood: capture.neighborhood || null,
    city: capture.city || null,
    zone: capture.zone || null,
    section: capture.section || null,
    tags: capture.tags,
    crmNotes: capture.notes || null,
  }), []);

  const sendCapture = useCallback(async (capture: PendingCapture) => {
    const res = await fetch('/api/voters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload(capture)),
    });

    if (res.status === 401) {
      router.push('/login');
      return false;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || 'Falha ao sincronizar captura');
    }

    return true;
  }, [createPayload, router]);

  const flushQueue = useCallback(async () => {
    if (!window.navigator.onLine || queue.length === 0) return;

    setSyncing(true);
    const pending = [...queue];
    const remaining: PendingCapture[] = [];

    for (const capture of pending) {
      try {
        const synced = await sendCapture(capture);
        if (!synced) {
          remaining.push(capture);
          break;
        }
      } catch {
        remaining.push(capture);
      }
    }

    if (remaining.length !== pending.length) {
      toast.success(`${pending.length - remaining.length} captura(s) sincronizada(s)`);
    }

    persistQueue(remaining);
    setSyncing(false);
  }, [persistQueue, queue, sendCapture]);

  useEffect(() => {
    if (!online || queue.length === 0) return;

    const flushTimer = window.setTimeout(() => {
      void flushQueue();
    }, 0);

    return () => window.clearTimeout(flushTimer);
  }, [flushQueue, online, queue.length]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    const capture: PendingCapture = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      zone: form.zone.trim(),
      section: form.section.trim(),
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      notes: form.notes.trim(),
      queuedAt: new Date().toISOString(),
    };

    if (!online) {
      persistQueue([...queue, capture]);
      setForm(EMPTY_FORM);
      toast.success('Captura salva offline e adicionada à fila');
      return;
    }

    try {
      const synced = await sendCapture(capture);
      if (synced) {
        setForm(EMPTY_FORM);
        toast.success('Eleitor capturado e sincronizado');
      }
    } catch (error) {
      persistQueue([...queue, capture]);
      toast.error(error instanceof Error ? `${error.message}. Salvo na fila offline.` : 'Falha ao sincronizar. Captura ficou na fila.');
      setForm(EMPTY_FORM);
    }
  };

  return (
    <SidebarLayout currentPage="crm" pageTitle="Captura Mobile">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Captura Mobile</h1>
            <p className="text-sm text-muted-foreground">
              Cadastro rápido para operação de rua com fila offline e sincronização automática.
            </p>
          </div>
          <Badge variant="outline" className={cn(
            'inline-flex items-center gap-1.5',
            online ? 'border-green-200 bg-green-500/10 text-green-600' : 'border-amber-200 bg-amber-500/10 text-amber-600',
          )}>
            {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {online ? 'Online' : 'Offline'}
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="h-4 w-4 text-primary" />
                Novo eleitor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3" onSubmit={handleSubmit}>
                <Input placeholder="Nome completo" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                <Input placeholder="Telefone com DDD" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Cidade" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
                  <Input placeholder="Bairro" value={form.neighborhood} onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Zona" value={form.zone} onChange={(event) => setForm((current) => ({ ...current, zone: event.target.value }))} />
                  <Input placeholder="Seção" value={form.section} onChange={(event) => setForm((current) => ({ ...current, section: event.target.value }))} />
                </div>
                <Input placeholder="Tags separadas por vírgula" value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} />
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                  placeholder="Contexto da visita, promessa, pedido ou observação do operador"
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button type="submit" className="w-full gap-2">
                  {online ? <UploadCloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
                  {online ? 'Salvar e sincronizar' : 'Salvar na fila offline'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>Fila offline</span>
                <Badge variant="secondary">{queueCount}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {queueLabel}
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => void flushQueue()} disabled={!online || syncing || queue.length === 0}>
                <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
                {syncing ? 'Sincronizando...' : 'Sincronizar pendências'}
              </Button>
              <ScrollArea className="h-[320px] rounded-lg border border-border">
                <div className="space-y-2 p-3">
                  {queue.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma captura pendente.</p>
                  )}
                  {queue.map((capture) => (
                    <div key={capture.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{capture.name}</p>
                          <p className="text-xs text-muted-foreground">{capture.phone}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(capture.queuedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {(capture.city || capture.neighborhood || capture.zone) && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {[capture.city, capture.neighborhood, capture.zone && `Zona ${capture.zone}`].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
