/**
 * Export utilities for message history
 * Supports CSV and PDF formats
 */

export interface ExportMessage {
  id: string;
  campaignName: string | null;
  chipName: string | null;
  voterName: string | null;
  voterPhone: string;
  message: string;
  resolvedMessage: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  failReason: string | null;
  createdAt: string;
}

/**
 * Escape a value for CSV output
 */
function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  
  // Convert to string and escape quotes
  const str = String(value).replace(/"/g, '""');
  
  // Quote if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str}"`;
  }
  
  return str;
}

/**
 * Format phone number for display
 */
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Format date for display
 */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Status labels in Portuguese
 */
const STATUS_LABELS: Record<string, string> = {
  queued: 'Na fila',
  assigned: 'Atribuído',
  sending: 'Enviando',
  sent: 'Enviado',
  delivered: 'Entregue',
  read: 'Lido',
  failed: 'Falhou',
  retry: 'Tentando novamente',
};

/**
 * Generate CSV content from messages
 */
export function generateCSV(messages: ExportMessage[]): string {
  const headers = [
    'Telefone',
    'Nome',
    'Status',
    'Campanha',
    'Chip',
    'Mensagem',
    'Criado em',
    'Enviado em',
    'Entregue em',
    'Lido em',
    'Falhou em',
    'Motivo da falha',
  ];

  const rows = messages.map(msg => [
    escapeCSV(formatPhone(msg.voterPhone)),
    escapeCSV(msg.voterName),
    escapeCSV(STATUS_LABELS[msg.status] ?? msg.status),
    escapeCSV(msg.campaignName),
    escapeCSV(msg.chipName),
    escapeCSV(msg.resolvedMessage),
    escapeCSV(formatDate(msg.createdAt)),
    escapeCSV(formatDate(msg.sentAt)),
    escapeCSV(formatDate(msg.deliveredAt)),
    escapeCSV(formatDate(msg.readAt)),
    escapeCSV(formatDate(msg.failedAt)),
    escapeCSV(msg.failReason),
  ]);

  // BOM for UTF-8 encoding (Excel compatibility)
  const BOM = '\uFEFF';
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  
  return BOM + csvContent;
}

/**
 * Generate PDF content as HTML (for printing)
 * Returns HTML string that can be used with a PDF library
 */
export function generatePDFHTML(messages: ExportMessage[], title: string = 'Histórico de Mensagens'): string {
  const statusColors: Record<string, string> = {
    queued: '#6b7280',
    assigned: '#3b82f6',
    sending: '#f59e0b',
    sent: '#6366f1',
    delivered: '#22c55e',
    read: '#a855f7',
    failed: '#ef4444',
    retry: '#f97316',
  };

  const rows = messages.map(msg => `
    <tr>
      <td>${formatPhone(msg.voterPhone)}</td>
      <td>${msg.voterName ?? '-'}</td>
      <td style="color: ${statusColors[msg.status] ?? '#6b7280'}">${STATUS_LABELS[msg.status] ?? msg.status}</td>
      <td>${msg.campaignName ?? '-'}</td>
      <td>${msg.chipName ?? '-'}</td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${msg.resolvedMessage.substring(0, 100)}${msg.resolvedMessage.length > 100 ? '...' : ''}</td>
      <td>${formatDate(msg.createdAt)}</td>
      <td>${formatDate(msg.sentAt)}</td>
      <td>${formatDate(msg.deliveredAt)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10px;
      color: #1f2937;
      padding: 20px;
    }
    h1 { font-size: 18px; margin-bottom: 8px; }
    .subtitle { color: #6b7280; margin-bottom: 16px; }
    .generated { color: #9ca3af; font-size: 9px; margin-bottom: 16px; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 9px;
    }
    th { 
      background: #f3f4f6; 
      padding: 8px 6px; 
      text-align: left; 
      font-weight: 600;
      border-bottom: 1px solid #e5e7eb;
    }
    td { 
      padding: 6px; 
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    tr:nth-child(even) { background: #f9fafb; }
    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 9px;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { padding: 0; }
      .footer { position: fixed; bottom: 0; left: 0; right: 0; background: white; padding: 12px 20px; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="subtitle">${messages.length} mensagem${messages.length !== 1 ? 's' : ''} exportada${messages.length !== 1 ? 's' : ''}</p>
  <p class="generated">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
  
  <table>
    <thead>
      <tr>
        <th>Telefone</th>
        <th>Nome</th>
        <th>Status</th>
        <th>Campanha</th>
        <th>Chip</th>
        <th>Mensagem</th>
        <th>Criado</th>
        <th>Enviado</th>
        <th>Entregue</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  
  <div class="footer">
    <span>EEL Eleição - Sistema de Gestão de Campanhas</span>
    <span>Página 1 de 1</span>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Calculate column widths for PDF table
 */
export function calculateColumnWidths(numColumns: number): number[] {
  // Fixed widths for specific columns
  const fixedWidths: Record<number, number> = {
    0: 80,  // Phone
    1: 60,  // Name
    2: 50,  // Status
    3: 60,  // Campaign
    4: 50,  // Chip
    // Message, Created, Sent, Delivered share remaining space
    6: 60,  // Created
    7: 60,  // Sent
    8: 60,  // Delivered
  };
  
  const totalFixed = Object.values(fixedWidths).reduce((a, b) => a + b, 0);
  const remainingWidth = 550 - totalFixed; // A4 width minus margins
  const remainingColumns = numColumns - Object.keys(fixedWidths).length;
  
  return Array.from({ length: numColumns }, (_, i) => 
    fixedWidths[i] ?? Math.floor(remainingWidth / remainingColumns)
  );
}