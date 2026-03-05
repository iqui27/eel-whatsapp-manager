'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Zap,
  Send,
  AlertTriangle,
  CalendarCheck,
} from 'lucide-react';
import type { Campaign, Segment, Chip } from '@/db/schema';

// ─── Time window options ───────────────────────────────────────────────────────

type TimeWindow = 'morning' | 'afternoon' | 'evening';

const TIME_WINDOWS: { id: TimeWindow; label: string; time: string; icon: string }[] = [
  { id: 'morning',   label: 'Manhã',  time: '8h–12h',  icon: '🌅' },
  { id: 'afternoon', label: 'Tarde',  time: '13h–18h', icon: '☀️' },
  { id: 'evening',   label: 'Noite',  time: '19h–21h', icon: '🌙' },
];

// ─── Send rate options ─────────────────────────────────────────────────────────

type SendRate = 'slow' | 'normal' | 'fast';

const SEND_RATES: { id: SendRate; label: string; rate: string; warning?: boolean }[] = [
  { id: 'slow',   label: 'Lento',   rate: '15 msg/min' },
  { id: 'normal', label: 'Normal',  rate: '30 msg/min' },
  { id: 'fast',   label: 'Rápido',  rate: '60 msg/min', warning: true },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgendarCampanhaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [segment, setSegment] = useState<Segment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Scheduling state
  const today = new Date().toISOString().split('T')[0];
  const [scheduleDate, setScheduleDate] = useState(today);
  const [selectedWindows, setSelectedWindows] = useState<TimeWindow[]>(['morning']);
  const [sendRate, setSendRate] = useState<SendRate>('normal');
  const [selectedChipId, setSelectedChipId] = useState('auto');
  const [connectedChips, setConnectedChips] = useState<Chip[]>([]);

  const loadCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns?id=${params.id}`);
      if (res.ok) {
        const data: Campaign[] = await res.json();
        const c = data.find(x => x.id === params.id) ?? data[0];
        if (c) {
          setCampaign(c);
          // Load segment if attached
          if (c.segmentId) {
            const sres = await fetch(`/api/segments?id=${c.segmentId}`);
            if (sres.ok) {
              const segs: Segment[] = await sres.json();
              setSegment(segs.find(s => s.id === c.segmentId) ?? null);
            }
          }
        }
      }
    } catch {
      /* silently fail */
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => { loadCampaign(); }, [loadCampaign]);

  useEffect(() => {
    fetch('/api/chips')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Chip[]) => {
        setConnectedChips(data.filter((chip) => chip.status === 'connected'));
      })
      .catch(() => {});

    if (typeof window !== 'undefined' && params.id) {
      const stored = localStorage.getItem(`campaign-chip:${params.id}`);
      if (stored) setSelectedChipId(stored);
    }
  }, [params.id]);

  const toggleWindow = (w: TimeWindow) => {
    setSelectedWindows(prev =>
      prev.includes(w)
        ? prev.length > 1 ? prev.filter(x => x !== w) : prev // keep at least 1
        : [...prev, w]
    );
  };

  const handleSchedule = async () => {
    if (!campaign) return;
    setIsSending(true);
    try {
      // Persist scheduling only (do not trigger send immediately)
      const scheduledAt = new Date(`${scheduleDate}T08:00:00`).toISOString();
      const patchRes = await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: campaign.id,
          scheduledAt,
          status: 'scheduled',
        }),
      });

      if (!patchRes.ok) {
        toast.error('Erro ao agendar campanha');
        return;
      }

      setCampaign((prev) => prev
        ? { ...prev, status: 'scheduled', scheduledAt: new Date(scheduledAt) }
        : prev);

      toast.success(`Campanha agendada para ${new Date(scheduledAt).toLocaleString('pt-BR')}`);
      setTimeout(() => router.push(`/campanhas/${campaign.id}/monitor`), 800);
    } catch {
      toast.error('Erro ao agendar campanha');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendNow = async () => {
    if (!campaign) return;
    setIsSending(true);

    try {
      const payload = selectedChipId && selectedChipId !== 'auto' ? { chipId: selectedChipId } : {};
      const res = await fetch(`/api/campaigns/${campaign.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? 'Não foi possível iniciar o envio');
        return;
      }

      toast.success('Envio iniciado');
      router.push(`/campanhas/${campaign.id}/monitor`);
    } catch {
      toast.error('Erro ao iniciar envio');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <SidebarLayout currentPage="campanhas" pageTitle="Agendar Campanha">
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          Carregando campanha...
        </div>
      </SidebarLayout>
    );
  }

  if (!campaign) {
    return (
      <SidebarLayout currentPage="campanhas" pageTitle="Agendar Campanha">
        <div className="p-6 text-center text-muted-foreground">
          Campanha não encontrada.{' '}
          <Link href="/campanhas" className="text-primary underline">Voltar</Link>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="campanhas" pageTitle="Agendar Campanha">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Back nav */}
        <div className="flex items-center gap-2">
          <Link href={`/campanhas/${campaign.id}/editar`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao editor
            </Button>
          </Link>
        </div>

        {/* Campaign summary card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Resumo da Campanha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Campanha</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{campaign.name}</span>
                {campaign.status === 'scheduled' && campaign.scheduledAt && (
                  <Badge variant="secondary" className="text-xs">
                    Agendada para {new Date(campaign.scheduledAt).toLocaleString('pt-BR')}
                  </Badge>
                )}
              </div>
            </div>
            {segment ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Segmento
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{segment.name}</span>
                  {segment.audienceCount && (
                    <Badge variant="secondary" className="text-xs">
                      ~{segment.audienceCount} eleitores
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Segmento</span>
                <span className="text-xs text-muted-foreground italic">Nenhum selecionado</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Chip de envio</span>
              <span className="text-xs text-muted-foreground">
                {selectedChipId === 'auto'
                  ? 'Auto (primeiro chip conectado)'
                  : (() => {
                    const chip = connectedChips.find((c) => c.id === selectedChipId);
                    return chip ? `${chip.name} (${chip.phone})` : 'Chip selecionado';
                  })()}
              </span>
            </div>
            {campaign.abEnabled && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Teste A/B</span>
                <Badge className="text-xs bg-purple-500/10 text-purple-600 border-purple-200">
                  A: {campaign.abSplitPercent}% · B: {100 - (campaign.abSplitPercent ?? 50)}%
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              Data de Envio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="date"
              min={today}
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </CardContent>
        </Card>

        {/* Time windows */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Janela de Envio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {TIME_WINDOWS.map(w => {
                const selected = selectedWindows.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleWindow(w.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border px-4 py-4 transition-all',
                      selected
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    <span className="text-xl">{w.icon}</span>
                    <span className="text-sm font-medium">{w.label}</span>
                    <span className="text-xs opacity-70">{w.time}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Selecione uma ou mais janelas. O envio será distribuído igualmente.
            </p>
          </CardContent>
        </Card>

        {/* Send rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-primary" />
              Velocidade de Envio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {SEND_RATES.map(r => (
              <label
                key={r.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer transition-colors',
                  sendRate === r.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="send-rate"
                    value={r.id}
                    checked={sendRate === r.id}
                    onChange={() => setSendRate(r.id)}
                    className="accent-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground">{r.label}</span>
                    {r.warning && (
                      <Badge className="ml-2 text-[10px] bg-amber-500/10 text-amber-600 border-amber-200">
                        risco de bloqueio
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{r.rate}</span>
              </label>
            ))}
            {sendRate === 'fast' && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-200 p-3 text-xs text-amber-700 mt-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Velocidade alta pode aumentar o risco de bloqueio do número. Recomendado apenas para chips aquecidos com histórico limpo.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Action bar */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/campanhas">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Cancelar
            </Button>
          </Link>
          <Button
            onClick={handleSchedule}
            disabled={isSending || !scheduleDate}
            className="min-w-[180px]"
          >
            {isSending ? 'Agendando...' : (
              <>
                <CalendarCheck className="mr-1.5 h-4 w-4" />
                Agendar campanha
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleSendNow}
            disabled={isSending}
            className="min-w-[180px]"
          >
            <Send className="mr-1.5 h-4 w-4" />
            Enviar agora
          </Button>
        </div>
      </div>
    </SidebarLayout>
  );
}
