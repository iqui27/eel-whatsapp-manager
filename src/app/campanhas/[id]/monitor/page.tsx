'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Send,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import type { Campaign } from '@/db/schema';

// ─── Mock delivery log ────────────────────────────────────────────────────────

const MOCK_LOG = [
  { phone: '***-1234', status: 'entregue',  time: '09:02' },
  { phone: '***-5678', status: 'entregue',  time: '09:02' },
  { phone: '***-9012', status: 'respondeu', time: '09:03' },
  { phone: '***-3456', status: 'falha',     time: '09:04' },
  { phone: '***-7890', status: 'entregue',  time: '09:04' },
];

const LOG_STATUS_CLASSES: Record<string, string> = {
  entregue:  'bg-green-500/10 text-green-600 border-green-200',
  respondeu: 'bg-blue-500/10 text-blue-600 border-blue-200',
  falha:     'bg-red-500/10 text-red-600 border-red-200',
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | null;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="mt-1.5 text-3xl font-bold text-foreground tabular-nums">
              {value ?? '—'}
            </p>
          </div>
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', color)}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MonitorPage() {
  const params = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns?id=${params.id}`);
      if (res.ok) {
        const data: Campaign[] = await res.json();
        setCampaign(data[0] ?? null);
      }
    } catch {
      /* silently fail */
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date());
    }
  }, [params.id]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  // Auto-refresh while sending
  useEffect(() => {
    if (!campaign || campaign.status !== 'sending') return;
    const interval = setInterval(fetchCampaign, 3000);
    return () => clearInterval(interval);
  }, [campaign, fetchCampaign]);

  const isSending = campaign?.status === 'sending';
  const sent = campaign?.totalSent ?? 0;
  const delivered = campaign?.totalDelivered ?? 0;
  const failed = campaign?.totalFailed ?? 0;
  const replied = campaign?.totalReplied ?? 0;
  const progressPct = sent > 0 ? Math.round((delivered / sent) * 100) : 0;

  const STATUS_LABELS: Record<string, string> = {
    draft: 'Rascunho',
    scheduled: 'Agendado',
    sending: 'Enviando',
    sent: 'Concluído',
    paused: 'Pausado',
    cancelled: 'Cancelado',
  };

  const STATUS_CLASSES: Record<string, string> = {
    scheduled: 'bg-blue-500/10 text-blue-600 border-blue-200',
    sending: 'bg-amber-500/10 text-amber-600 border-amber-200',
    sent: 'bg-green-500/10 text-green-600 border-green-200',
    cancelled: 'bg-red-500/10 text-red-600 border-red-200',
  };

  if (isLoading) {
    return (
      <SidebarLayout currentPage="campanhas" pageTitle="Monitor">
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando campanha...
        </div>
      </SidebarLayout>
    );
  }

  if (!campaign) {
    return (
      <SidebarLayout currentPage="campanhas" pageTitle="Monitor">
        <div className="p-6 text-center text-muted-foreground">
          Campanha não encontrada.{' '}
          <Link href="/campanhas" className="text-primary underline">Voltar</Link>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="campanhas" pageTitle="Monitor de Campanha">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link href="/campanhas">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2">
                  <ArrowLeft className="h-4 w-4" />
                  Campanhas
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">{campaign.name}</h1>
              <span className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                STATUS_CLASSES[campaign.status ?? 'sent'] ?? 'bg-muted text-muted-foreground border-border'
              )}>
                {isSending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {STATUS_LABELS[campaign.status ?? 'sent']}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCampaign}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
            {isSending && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={async () => {
                  await fetch('/api/campaigns', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: campaign.id, status: 'cancelled' }),
                  });
                  fetchCampaign();
                }}
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancelar envio
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        {(isSending || campaign.status === 'sent') && (
          <Card>
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Progresso de entrega</span>
                <span className="text-muted-foreground tabular-nums">{delivered} / {sent} entregues</span>
              </div>
              <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    isSending ? 'bg-amber-500' : 'bg-green-500',
                  )}
                  style={{ width: `${progressPct}%` }}
                />
                {isSending && (
                  <div
                    className="absolute inset-0 rounded-full opacity-30"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, white 50%, transparent 100%)',
                      animation: 'shimmer 1.5s infinite',
                    }}
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progressPct}% entregue</span>
                <span>Última atualização: {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Enviadas"   value={sent}      icon={Send}          color="bg-blue-500/10 text-blue-600" />
          <StatCard label="Entregues"  value={delivered} icon={CheckCircle2}  color="bg-green-500/10 text-green-600" />
          <StatCard label="Falhas"     value={failed}    icon={XCircle}       color="bg-red-500/10 text-red-600" />
          <StatCard label="Respostas"  value={replied}   icon={MessageCircle} color="bg-purple-500/10 text-purple-600" />
        </div>

        {/* Delivery log */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Log de Entregas
              <Badge variant="secondary" className="ml-auto text-xs">Amostra</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Horário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_LOG.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm text-muted-foreground">{row.phone}</TableCell>
                    <TableCell>
                      <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', LOG_STATUS_CLASSES[row.status])}>
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Back to campaigns */}
        <div>
          <Link href="/campanhas">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Ver todas as campanhas
            </Button>
          </Link>
        </div>
      </div>
    </SidebarLayout>
  );
}
