/**
 * POST /api/env/restart
 * Triggers a graceful PM2 restart so new .env.local values are loaded.
 * Runs in the background — response is sent before the process restarts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { exec } from 'child_process';

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'admin.manage', 'Acesso negado');
  if (auth.response) return auth.response;

  // Delay restart by 1s so the response can be delivered first
  setTimeout(() => {
    exec('pm2 restart zap-eel --update-env', (err) => {
      if (err) console.error('[restart] PM2 restart failed:', err.message);
      else console.log('[restart] PM2 restart triggered successfully');
    });
  }, 1000);

  return NextResponse.json({
    success: true,
    message: 'Reinicialização iniciada. O servidor ficará indisponível por ~5 segundos.',
  });
}
