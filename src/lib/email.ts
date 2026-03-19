/**
 * Email service — Resend
 * Domain: iqui27.app  •  From: noreply@iqui27.app
 */
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const FROM_ADDRESS   = 'EEL Eleitoral <noreply@iqui27.app>';
const APP_NAME       = 'EEL Eleitoral';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(RESEND_API_KEY);
  return _resend;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function baseLayout(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
  body { margin:0; padding:0; background:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrap { max-width:560px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.08); }
  .header { background:#0f172a; padding:28px 32px; }
  .header h1 { margin:0; color:#fff; font-size:18px; font-weight:600; letter-spacing:-.3px; }
  .header p  { margin:4px 0 0; color:#94a3b8; font-size:13px; }
  .body { padding:32px; color:#1e293b; }
  .body p { margin:0 0 16px; font-size:15px; line-height:1.6; color:#334155; }
  .btn { display:inline-block; margin:8px 0 24px; padding:12px 24px; background:#2563eb; color:#fff !important; text-decoration:none; border-radius:8px; font-size:15px; font-weight:600; }
  .btn:hover { background:#1d4ed8; }
  .note { font-size:13px; color:#64748b; border-top:1px solid #f1f5f9; padding-top:16px; margin-top:8px; }
  .mono { background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; font-family:monospace; font-size:13px; color:#0f172a; word-break:break-all; }
  .footer { padding:20px 32px; background:#f8fafc; border-top:1px solid #f1f5f9; text-align:center; }
  .footer p { margin:0; font-size:12px; color:#94a3b8; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>${APP_NAME}</h1>
    <p>Sistema de gestão eleitoral</p>
  </div>
  <div class="body">${body}</div>
  <div class="footer"><p>© ${new Date().getFullYear()} ${APP_NAME}. Não responda a este email.</p></div>
</div>
</body>
</html>`;
}

// ─── Send invite email ────────────────────────────────────────────────────────

export async function sendInviteEmail(opts: {
  to: string;
  name: string;
  role: string;
  inviteUrl: string;
  expiresHours?: number;
}): Promise<{ success: boolean; error?: string }> {
  const hours = opts.expiresHours ?? 72;
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    coordenador: 'Coordenador',
    cabo: 'Cabo Eleitoral',
    voluntario: 'Voluntário',
  };
  const roleLabel = roleLabels[opts.role] ?? opts.role;

  const html = baseLayout('Convite para o EEL Eleitoral', `
    <p>Olá, <strong>${opts.name}</strong>!</p>
    <p>Você foi convidado(a) para acessar o <strong>${APP_NAME}</strong> com a função de <strong>${roleLabel}</strong>.</p>
    <p>Clique no botão abaixo para criar sua senha e ativar o acesso:</p>
    <a href="${opts.inviteUrl}" class="btn">Aceitar convite e criar senha</a>
    <p>Ou copie e cole este link no navegador:</p>
    <div class="mono">${opts.inviteUrl}</div>
    <p class="note">Este link expira em <strong>${hours} horas</strong>. Se você não esperava este email, pode ignorá-lo com segurança.</p>
  `);

  try {
    const { error } = await getResend().emails.send({
      from: FROM_ADDRESS,
      to: opts.to,
      subject: `Convite — ${APP_NAME}`,
      html,
    });
    if (error) {
      console.error('[email] sendInviteEmail error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email] sendInviteEmail exception:', msg);
    return { success: false, error: msg };
  }
}

// ─── Send password reset email ────────────────────────────────────────────────

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const html = baseLayout('Redefinição de senha — EEL Eleitoral', `
    <p>Olá, <strong>${opts.name}</strong>!</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>${APP_NAME}</strong>.</p>
    <p>Clique no botão abaixo para criar uma nova senha:</p>
    <a href="${opts.resetUrl}" class="btn">Redefinir senha</a>
    <p>Ou copie e cole este link no navegador:</p>
    <div class="mono">${opts.resetUrl}</div>
    <p class="note">Este link expira em <strong>2 horas</strong>. Se você não solicitou a redefinição, ignore este email — sua senha não será alterada.</p>
  `);

  try {
    const { error } = await getResend().emails.send({
      from: FROM_ADDRESS,
      to: opts.to,
      subject: `Redefinir senha — ${APP_NAME}`,
      html,
    });
    if (error) {
      console.error('[email] sendPasswordResetEmail error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email] sendPasswordResetEmail exception:', msg);
    return { success: false, error: msg };
  }
}

// ─── Generic transactional email ─────────────────────────────────────────────

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResend().emails.send({
      from: FROM_ADDRESS,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
