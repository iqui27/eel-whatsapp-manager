import { NextRequest, NextResponse } from 'next/server';
import { addReportDispatch, getDueReportSchedules, updateReportSchedule } from '@/lib/db-report-schedules';
import { deliverReportEmail } from '@/lib/report-email';
import {
  buildCampaignReportCsv,
  buildCampaignReportPdf,
  nextRunDate,
} from '@/lib/reporting';
import { loadCampaignReport } from '@/lib/reporting-server';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dueSchedules = await getDueReportSchedules();
  const results: Array<{ id: string; status: string; transport?: string; error?: string }> = [];

  for (const schedule of dueSchedules) {
    const report = await loadCampaignReport(schedule.periodDays ?? 7);
    const attachments = [];
    if (schedule.format === 'csv' || schedule.format === 'both') {
      attachments.push({
        filename: `relatorio-${schedule.periodDays}d.csv`,
        contentType: 'text/csv',
        content: Buffer.from(buildCampaignReportCsv(report), 'utf8'),
      });
    }
    if (schedule.format === 'pdf' || schedule.format === 'both') {
      attachments.push({
        filename: `relatorio-${schedule.periodDays}d.pdf`,
        contentType: 'application/pdf',
        content: buildCampaignReportPdf(report),
      });
    }

    const delivery = await deliverReportEmail({
      recipients: schedule.recipients ?? [],
      subject: `${schedule.name} · ${report.summary.periodLabel}`,
      body: `Relatório operacional gerado em ${new Date(report.summary.generatedAt).toLocaleString('pt-BR')}.`,
      format: schedule.format,
      attachments,
    });

    await addReportDispatch({
      scheduleId: schedule.id,
      recipients: schedule.recipients ?? [],
      format: schedule.format,
      status: delivery.status,
      errorMessage: delivery.status === 'failed' ? delivery.error : null,
      metadata: {
        transport: delivery.transport,
        periodDays: schedule.periodDays,
        totalSent: report.summary.totalSent,
      },
    });

    await updateReportSchedule(schedule.id, {
      lastRunAt: new Date(),
      lastStatus: delivery.status,
      lastError: delivery.status === 'failed' ? delivery.error : null,
      nextRunAt: nextRunDate(schedule.frequency),
    });

    results.push({
      id: schedule.id,
      status: delivery.status,
      transport: delivery.transport,
      error: delivery.status === 'failed' ? delivery.error : undefined,
    });
  }

  return NextResponse.json({ processed: results.length, results });
}
