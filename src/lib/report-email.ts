import { existsSync } from 'fs';
import { spawn } from 'child_process';
import type { ReportFormat } from '@/lib/reporting';

interface Attachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

interface DeliveryInput {
  recipients: string[];
  subject: string;
  body: string;
  format: ReportFormat;
  attachments: Attachment[];
}

type DeliveryResult =
  | { status: 'sent'; transport: 'sendmail' | 'webhook' }
  | { status: 'dry_run'; transport: 'dry_run' }
  | { status: 'failed'; transport: 'sendmail' | 'webhook'; error: string };

function buildMimeMessage(input: DeliveryInput) {
  const boundary = `eel-report-${crypto.randomUUID()}`;
  const from = process.env.REPORT_EMAIL_FROM ?? 'reports@eel.local';
  const parts = [
    `From: ${from}`,
    `To: ${input.recipients.join(', ')}`,
    `Subject: ${input.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    '',
    input.body,
  ];

  for (const attachment of input.attachments) {
    parts.push(
      '',
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      '',
      attachment.content.toString('base64'),
    );
  }

  parts.push('', `--${boundary}--`, '');
  return parts.join('\n');
}

async function sendViaSendmail(input: DeliveryInput): Promise<DeliveryResult> {
  const candidatePaths = ['/usr/sbin/sendmail', '/usr/bin/sendmail'];
  const sendmailPath = candidatePaths.find((path) => existsSync(path));
  if (!sendmailPath) {
    return { status: 'failed', transport: 'sendmail', error: 'sendmail não disponível no host' };
  }

  return new Promise((resolve) => {
    const processRef = spawn(sendmailPath, ['-t', '-i']);
    const message = buildMimeMessage(input);

    processRef.stdin.write(message);
    processRef.stdin.end();

    let stderr = '';
    processRef.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    processRef.on('close', (code) => {
      if (code === 0) {
        resolve({ status: 'sent', transport: 'sendmail' });
      } else {
        resolve({
          status: 'failed',
          transport: 'sendmail',
          error: stderr || `sendmail terminou com código ${code}`,
        });
      }
    });
  });
}

async function sendViaWebhook(input: DeliveryInput): Promise<DeliveryResult> {
  const webhookUrl = process.env.REPORT_EMAIL_WEBHOOK_URL;
  if (!webhookUrl) {
    return { status: 'failed', transport: 'webhook', error: 'REPORT_EMAIL_WEBHOOK_URL não configurado' };
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipients: input.recipients,
      subject: input.subject,
      body: input.body,
      format: input.format,
      attachments: input.attachments.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        contentBase64: attachment.content.toString('base64'),
      })),
    }),
  });

  if (response.ok) {
    return { status: 'sent', transport: 'webhook' };
  }

  const errorText = await response.text();
  return { status: 'failed', transport: 'webhook', error: errorText || 'Falha ao enviar webhook' };
}

export async function deliverReportEmail(input: DeliveryInput): Promise<DeliveryResult> {
  if (process.env.REPORT_EMAIL_WEBHOOK_URL) {
    return sendViaWebhook(input);
  }

  const sendmailResult = await sendViaSendmail(input);
  if (sendmailResult.status === 'sent') {
    return sendmailResult;
  }

  if (process.env.REPORT_EMAIL_DRY_RUN === 'false') {
    return sendmailResult;
  }

  return { status: 'dry_run', transport: 'dry_run' };
}
