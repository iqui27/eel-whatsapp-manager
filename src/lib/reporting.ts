import type { Campaign } from '@/db/schema';

export type ReportFormat = 'csv' | 'pdf' | 'both';
export type ReportFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReportSummary {
  periodDays: number;
  periodLabel: string;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalReplied: number;
  totalFailed: number;
  generatedAt: string;
}

export interface CampaignReportRow {
  id: string;
  name: string;
  status: string;
  sent: number;
  deliveredRate: string;
  readRate: string;
  repliedRate: string;
  createdAt: string;
}

export interface CampaignReport {
  summary: ReportSummary;
  rows: CampaignReportRow[];
}

function pct(numerator: number, denominator: number): string {
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function getCampaignDate(campaign: Campaign): Date | null {
  const source = campaign.updatedAt ?? campaign.createdAt;
  if (!source) return null;
  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildCampaignReport(campaigns: Campaign[], periodDays: number, referenceDate = new Date()): CampaignReport {
  const now = new Date(referenceDate);
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (periodDays - 1));

  const filteredCampaigns = campaigns.filter((campaign) => {
    const campaignDate = getCampaignDate(campaign);
    return campaignDate ? campaignDate >= start && campaignDate <= now : false;
  });

  const totalSent = filteredCampaigns.reduce((sum, campaign) => sum + (campaign.totalSent ?? 0), 0);
  const totalDelivered = filteredCampaigns.reduce((sum, campaign) => sum + (campaign.totalDelivered ?? 0), 0);
  const totalRead = filteredCampaigns.reduce((sum, campaign) => sum + (campaign.totalRead ?? 0), 0);
  const totalReplied = filteredCampaigns.reduce((sum, campaign) => sum + (campaign.totalReplied ?? 0), 0);
  const totalFailed = filteredCampaigns.reduce((sum, campaign) => sum + (campaign.totalFailed ?? 0), 0);

  return {
    summary: {
      periodDays,
      periodLabel: `Últimos ${periodDays} dias`,
      totalSent,
      totalDelivered,
      totalRead,
      totalReplied,
      totalFailed,
      generatedAt: now.toISOString(),
    },
    rows: filteredCampaigns.map((campaign) => {
      const sent = campaign.totalSent ?? 0;
      const delivered = campaign.totalDelivered ?? 0;
      const read = campaign.totalRead ?? 0;
      const replied = campaign.totalReplied ?? 0;

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status ?? 'draft',
        sent,
        deliveredRate: pct(delivered, sent),
        readRate: pct(read, sent),
        repliedRate: pct(replied, sent),
        createdAt: campaign.createdAt
          ? new Date(campaign.createdAt).toLocaleDateString('pt-BR')
          : '—',
      };
    }),
  };
}

export function buildCampaignReportCsv(report: CampaignReport): string {
  const summaryHeader = 'Período,Enviadas,Entregues,Lidas,Respondidas,Bloqueios,Gerado em';
  const summaryRow = [
    report.summary.periodLabel,
    report.summary.totalSent,
    report.summary.totalDelivered,
    report.summary.totalRead,
    report.summary.totalReplied,
    report.summary.totalFailed,
    new Date(report.summary.generatedAt).toLocaleString('pt-BR'),
  ].map((value) => `"${value}"`).join(',');

  const rowsHeader = 'Campanha,Status,Enviadas,Entregues,Lidas,Respondidas,Data';
  const rows = report.rows.map((row) => [
    row.name,
    row.status,
    row.sent,
    row.deliveredRate,
    row.readRate,
    row.repliedRate,
    row.createdAt,
  ].map((value) => `"${value}"`).join(','));

  return [summaryHeader, summaryRow, '', rowsHeader, ...rows].join('\n');
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildCampaignReportPdf(report: CampaignReport): Buffer {
  const lines = [
    `Relatório de Campanhas - ${report.summary.periodLabel}`,
    `Gerado em: ${new Date(report.summary.generatedAt).toLocaleString('pt-BR')}`,
    '',
    `Enviadas: ${report.summary.totalSent}`,
    `Entregues: ${report.summary.totalDelivered}`,
    `Lidas: ${report.summary.totalRead}`,
    `Respondidas: ${report.summary.totalReplied}`,
    `Bloqueios: ${report.summary.totalFailed}`,
    '',
    'Campanhas:',
    ...report.rows.flatMap((row) => ([
      `${row.name} | ${row.status}`,
      `Enviadas ${row.sent} | Entregues ${row.deliveredRate} | Lidas ${row.readRate} | Respondidas ${row.repliedRate} | ${row.createdAt}`,
      '',
    ])),
  ];

  const content = [
    'BT',
    '/F1 12 Tf',
    '50 770 Td',
    ...lines.map((line, index) => `${index === 0 ? '' : '0 -16 Td'} (${escapePdfText(line)}) Tj`.trim()),
    'ET',
  ].join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj',
    `4 0 obj << /Length ${Buffer.byteLength(content, 'utf8')} >> stream\n${content}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

export function nextRunDate(frequency: ReportFrequency, from = new Date()) {
  const next = new Date(from);
  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}
