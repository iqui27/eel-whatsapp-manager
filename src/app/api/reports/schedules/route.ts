import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import {
  addReportSchedule,
  deleteReportSchedule,
  loadRecentReportDispatches,
  loadReportSchedules,
  updateReportSchedule,
} from '@/lib/db-report-schedules';
import { nextRunDate, type ReportFormat, type ReportFrequency } from '@/lib/reporting';

function normalizeRecipients(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeFormat(value: unknown): ReportFormat {
  return value === 'pdf' || value === 'both' ? value : 'csv';
}

function normalizeFrequency(value: unknown): ReportFrequency {
  return value === 'daily' || value === 'monthly' ? value : 'weekly';
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'reports.view', 'Seu operador não pode ver agendamentos de relatórios');
  if (auth.response) return auth.response;

  const [schedules, dispatches] = await Promise.all([
    loadReportSchedules(),
    loadRecentReportDispatches(),
  ]);

  return NextResponse.json({ schedules, dispatches });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'reports.schedule', 'Seu operador não pode criar agendamentos de relatórios');
  if (auth.response) return auth.response;

  const body = await request.json();
  const recipients = normalizeRecipients(body.recipients);
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Informe pelo menos um destinatário' }, { status: 400 });
  }

  const frequency = normalizeFrequency(body.frequency);
  const periodDays = Math.max(Number.parseInt(String(body.periodDays ?? 7), 10) || 7, 1);
  const schedule = await addReportSchedule({
    name: String(body.name ?? `Relatório ${periodDays} dias`).trim(),
    recipients,
    frequency,
    periodDays,
    format: normalizeFormat(body.format),
    active: body.active ?? true,
    nextRunAt: nextRunDate(frequency),
    createdByUserId: auth.actor?.userId ?? null,
  });

  return NextResponse.json(schedule, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'reports.schedule', 'Seu operador não pode editar agendamentos de relatórios');
  if (auth.response) return auth.response;

  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  const updates: {
    name?: string;
    recipients?: string[];
    frequency?: ReportFrequency;
    periodDays?: number;
    format?: ReportFormat;
    active?: boolean;
    nextRunAt?: Date;
  } = {
    name: typeof body.name === 'string' ? body.name.trim() : undefined,
    recipients: Array.isArray(body.recipients) ? normalizeRecipients(body.recipients) : undefined,
    frequency: body.frequency ? normalizeFrequency(body.frequency) : undefined,
    periodDays: body.periodDays ? Math.max(Number.parseInt(String(body.periodDays), 10) || 7, 1) : undefined,
    format: body.format ? normalizeFormat(body.format) : undefined,
    active: typeof body.active === 'boolean' ? body.active : undefined,
  };

  if (updates.frequency) {
    updates.nextRunAt = nextRunDate(updates.frequency);
  }

  const schedule = await updateReportSchedule(body.id, updates);
  if (!schedule) {
    return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
  }

  return NextResponse.json(schedule);
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'reports.schedule', 'Seu operador não pode remover agendamentos de relatórios');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  await deleteReportSchedule(id);
  return NextResponse.json({ success: true });
}
