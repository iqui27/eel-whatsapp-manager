import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { buildCampaignReportCsv, buildCampaignReportPdf } from '@/lib/reporting';
import { loadCampaignReport } from '@/lib/reporting-server';

function normalizePeriod(rawPeriod: string | null) {
  const period = Number.parseInt(rawPeriod ?? '7', 10);
  if (!Number.isFinite(period) || period <= 0) return 7;
  return period;
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'reports.export', 'Seu operador não pode exportar relatórios');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'csv';
  const periodDays = normalizePeriod(searchParams.get('period'));
  const report = await loadCampaignReport(periodDays);

  if (format === 'pdf') {
    const pdf = buildCampaignReportPdf(report);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-campanhas-${periodDays}d.pdf"`,
      },
    });
  }

  const csv = buildCampaignReportCsv(report);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="relatorio-campanhas-${periodDays}d.csv"`,
    },
  });
}
