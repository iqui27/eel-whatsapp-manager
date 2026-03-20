'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { buildCampaignReport, type ReportFormat, type ReportFrequency } from '@/lib/reporting';
import { cn } from '@/lib/utils';
import type { Campaign, ReportDispatch, ReportSchedule } from '@/db/schema';
import { CheckCheck, Download, FileText, Mail, MessageSquare, Send, Trash2 } from 'lucide-react';
import type { DailyBar } from '@/components/charts/ReportCharts';

// Lazy-load recharts-heavy chart components — defers ~200KB to client-side only
const DailyBarChart = dynamic(
  () => import('@/components/charts/ReportCharts').then((m) => m.DailyBarChart),
  { ssr: false, loading: () => <div className="h-44 animate-pulse bg-muted rounded-lg" /> },
);
const TrendLineChart = dynamic(
  () => import('@/components/charts/ReportCharts').then((m) => m.TrendLineChart),
  { ssr: false, loading: () => <div className="h-44 animate-pulse bg-muted rounded-lg" /> },
);
const ConversionFunnel = dynamic(
  () => import('@/components/charts/ReportCharts').then((m) => m.ConversionFunnel),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-muted rounded-lg" /> },
);

type Period = '7' | '14' | '30';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  sending: 'Enviando',
  sent: 'Enviada',
  paused: 'Pausada',
  cancelled: 'Cancelada',
};

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  scheduled: 'bg-blue-500/10 text-blue-600 border-blue-200',
  sending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  sent: 'bg-green-500/10 text-green-600 border-green-200',
  paused: 'bg-orange-500/10 text-orange-600 border-orange-200',
  cancelled: 'bg-red-500/10 text-red-600 border-red-200',
};

type ScheduleResponse = {
  schedules: ReportSchedule[];
  dispatches: ReportDispatch[];
};

type ScheduleForm = {
  name: string;
  recipients: string;
  frequency: ReportFrequency;
  periodDays: Period;
  format: ReportFormat;
};

const EMPTY_SCHEDULE_FORM: ScheduleForm = {
  name: 'Relatório operacional',
  recipients: '',
  frequency: 'weekly',
  periodDays: '7',
  format: 'pdf',
};

function getCampaignDate(campaign: Campaign): Date | null {
  const source = campaign.updatedAt ?? campaign.createdAt;
  if (!source) return null;
  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildDailyBars(campaigns: Campaign[], periodDays: number, referenceDate: Date | null): DailyBar[] {
  if (!referenceDate) return [];

  const now = new Date(referenceDate);
  now.setHours(0, 0, 0, 0);

  const totalsByDay = new Map<string, number>();
  for (const campaign of campaigns) {
    const campaignDate = getCampaignDate(campaign);
    if (!campaignDate) continue;
    const dayKey = campaignDate.toISOString().slice(0, 10);
    totalsByDay.set(dayKey, (totalsByDay.get(dayKey) ?? 0) + (campaign.totalSent ?? 0));
  }

  return Array.from({ length: periodDays }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (periodDays - index - 1));
    const key = date.toISOString().slice(0, 10);
    return {
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: totalsByDay.get(key) ?? 0,
    };
  });
}

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>
      <span className="text-2xl font-semibold tabular-nums">{value.toLocaleString('pt-BR')}</span>
    </div>
  );
}

export default function RelatoriosPage() {
  const [period, setPeriod] = useState<Period>('7');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [referenceDate, setReferenceDate] = useState<Date | null>(null);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [dispatches, setDispatches] = useState<ReportDispatch[]>([]);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(EMPTY_SCHEDULE_FORM);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
  const [scheduleToRemove, setScheduleToRemove] = useState<string | null>(null);

  useEffect(() => {
    setReferenceDate(new Date());
  }, []);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        setCampaigns(await res.json());
      } else {
        toast.error('Erro ao carregar campanhas');
      }
    } catch {
      toast.error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/reports/schedules');
      if (!res.ok) {
        toast.error('Erro ao carregar agendamentos');
        return;
      }
      const payload: ScheduleResponse = await res.json();
      setSchedules(payload.schedules);
      setDispatches(payload.dispatches);
    } catch {
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setIsLoadingSchedules(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
    void loadSchedules();
  }, [loadCampaigns, loadSchedules]);

  const report = useMemo(
    () => buildCampaignReport(campaigns, Number.parseInt(period, 10), referenceDate ?? new Date()),
    [campaigns, period, referenceDate],
  );
  const bars = useMemo(
    () => buildDailyBars(campaigns, Number.parseInt(period, 10), referenceDate),
    [campaigns, period, referenceDate],
  );

  const downloadReport = useCallback(async (format: 'csv' | 'pdf') => {
    try {
      const res = await fetch(`/api/reports/export?format=${format}&period=${period}`);
      if (!res.ok) { toast.error('Erro ao baixar relatorio'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `relatorio-campanhas-${period}d.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao baixar relatorio');
    }
  }, [period]);

  const createSchedule = useCallback(async () => {
    setSavingSchedule(true);
    try {
      const res = await fetch('/api/reports/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: scheduleForm.name,
          recipients: scheduleForm.recipients.split(',').map((entry) => entry.trim()).filter(Boolean),
          frequency: scheduleForm.frequency,
          periodDays: Number.parseInt(scheduleForm.periodDays, 10),
          format: scheduleForm.format,
        }),
      });

      if (res.ok) {
        toast.success('Agendamento criado');
        setScheduleForm(EMPTY_SCHEDULE_FORM);
        await loadSchedules();
      } else {
        toast.error('Erro ao criar agendamento');
      }
    } catch {
      toast.error('Erro ao criar agendamento');
    } finally {
      setSavingSchedule(false);
    }
  }, [loadSchedules, scheduleForm]);

  const toggleSchedule = useCallback(async (schedule: ReportSchedule) => {
    try {
      await fetch('/api/reports/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: schedule.id, active: !(schedule.active ?? true) }),
      });
      toast.success('Agendamento atualizado');
      await loadSchedules();
    } catch {
      toast.error('Erro ao atualizar agendamento');
    }
  }, [loadSchedules]);

  const removeSchedule = useCallback(async (scheduleId: string) => {
    try {
      await fetch(`/api/reports/schedules?id=${scheduleId}`, { method: 'DELETE' });
      toast.success('Agendamento removido');
      await loadSchedules();
    } catch {
      toast.error('Erro ao remover agendamento');
    }
  }, [loadSchedules]);

  return (
    <SidebarLayout currentPage="relatorios">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-foreground">Relatórios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Exports CSV/PDF e entrega agendada por email</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="14">Últimos 14 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void downloadReport('csv')}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void downloadReport('pdf')}>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Enviadas" value={report.summary.totalSent} icon={Send} />
          <KpiCard label="Entregues" value={report.summary.totalDelivered} icon={CheckCheck} />
          <KpiCard label="Lidas" value={report.summary.totalRead} icon={Mail} />
          <KpiCard label="Respondidas" value={report.summary.totalReplied} icon={MessageSquare} />
        </div>

        {/* Charts 2-col grid — lazy-loaded to defer ~200KB recharts bundle */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4 text-foreground">Volume de envios</h2>
            <DailyBarChart bars={bars} />
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4 text-foreground">Tendências de Desempenho</h2>
            <TrendLineChart campaigns={campaigns} />
          </div>
        </div>

        {/* Conversion funnel */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">Funil de Conversão</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Taxas de conversão acumuladas de todas as campanhas</p>
          </div>
          <ConversionFunnel campaigns={campaigns} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Campanha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Enviadas</TableHead>
                    <TableHead className="text-right">Entregues</TableHead>
                    <TableHead className="text-right">Lidas</TableHead>
                    <TableHead className="text-right">Respondidas</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        Carregando…
                      </TableCell>
                    </TableRow>
                  ) : report.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        Nenhuma campanha no período selecionado.
                      </TableCell>
                    </TableRow>
                  ) : report.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', STATUS_CLASSES[row.status ?? 'draft'])}>
                          {STATUS_LABELS[row.status ?? 'draft'] ?? row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.sent.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.deliveredRate}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.readRate}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.repliedRate}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.createdAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Agendar entrega por email</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Crie rotinas automáticas para enviar o relatório operacional sem ação manual.
                </p>
              </div>
              <Input value={scheduleForm.name} onChange={(event) => setScheduleForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nome do agendamento" />
              <Input value={scheduleForm.recipients} onChange={(event) => setScheduleForm((current) => ({ ...current, recipients: event.target.value }))} placeholder="emails separados por vírgula" />
              <div className="grid gap-3 sm:grid-cols-3">
                <Select value={scheduleForm.frequency} onValueChange={(value) => setScheduleForm((current) => ({ ...current, frequency: value as ReportFrequency }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={scheduleForm.periodDays} onValueChange={(value) => setScheduleForm((current) => ({ ...current, periodDays: value as Period }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="14">14 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={scheduleForm.format} onValueChange={(value) => setScheduleForm((current) => ({ ...current, format: value as ReportFormat }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="both">CSV + PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => void createSchedule()} disabled={savingSchedule || !scheduleForm.recipients.trim()}>
                {savingSchedule ? 'Salvando...' : 'Criar agendamento'}
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-semibold text-foreground">Agendamentos ativos</h2>
                <Badge variant="secondary">{schedules.length}</Badge>
              </div>
              <div className="space-y-3">
                {isLoadingSchedules ? (
                  <>
                    <div className="h-10 animate-pulse rounded-md bg-muted" />
                    <div className="h-10 animate-pulse rounded-md bg-muted" />
                  </>
                ) : schedules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum agendamento cadastrado.</p>
                ) : null}
                {!isLoadingSchedules && schedules.map((schedule) => (
                  <div key={schedule.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{schedule.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(schedule.recipients ?? []).join(', ')}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn(
                        'text-xs',
                        schedule.active ? 'border-green-200 bg-green-500/10 text-green-600' : 'border-border bg-muted text-muted-foreground',
                      )}>
                        {schedule.active ? 'Ativo' : 'Pausado'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {schedule.frequency} · {schedule.periodDays} dias · {schedule.format} · próximo disparo{' '}
                      {schedule.nextRunAt ? new Date(schedule.nextRunAt).toLocaleString('pt-BR') : '—'}
                    </p>
                    {schedule.lastError && (
                      <p className="mt-2 text-xs text-red-600">{schedule.lastError}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void toggleSchedule(schedule)}>
                        {schedule.active ? 'Pausar' : 'Reativar'}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setScheduleToRemove(schedule.id)}>
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-semibold text-foreground">Últimos dispatches</h2>
                <Badge variant="secondary">{dispatches.length}</Badge>
              </div>
              <div className="space-y-2">
                {dispatches.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum envio registrado ainda.</p>
                )}
                {dispatches.map((dispatch) => (
                  <div key={dispatch.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{(dispatch.recipients ?? []).join(', ') || 'Sem destinatários'}</span>
                      <Badge variant="outline" className={cn(
                        'text-xs',
                        dispatch.status === 'sent'
                          ? 'border-green-200 bg-green-500/10 text-green-600'
                          : dispatch.status === 'dry_run'
                            ? 'border-blue-200 bg-blue-500/10 text-blue-600'
                            : 'border-red-200 bg-red-500/10 text-red-600',
                      )}>
                        {dispatch.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {dispatch.createdAt ? new Date(dispatch.createdAt).toLocaleString('pt-BR') : '—'} · formato {dispatch.format}
                    </p>
                    {dispatch.errorMessage && (
                      <p className="mt-2 text-xs text-red-600">{dispatch.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!scheduleToRemove} onOpenChange={(open) => !open && setScheduleToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O agendamento de relatorio sera removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (scheduleToRemove) { void removeSchedule(scheduleToRemove); setScheduleToRemove(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarLayout>
  );
}
