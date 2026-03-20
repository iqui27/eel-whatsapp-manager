import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { loadConfig, saveConfig } from '@/lib/db-config';
import { loadChips } from '@/lib/db-chips';
import { isLocalInternalRequest, readCronToken, resolveServerEnv } from '@/lib/server-env';
import { runWarming } from '@/lib/warming';
import { toAppConfig, toWarmingChips } from '@/lib/warming-compat';
import { withCronLock } from '@/lib/cron-lock';
import { syslog } from '@/lib/system-logger';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Validate cron secret
  const cronSecret = resolveServerEnv('CRON_SECRET');
  const requestToken = readCronToken(request);
  const authorizedBySecret = Boolean(cronSecret) && requestToken === cronSecret;
  const authorizedByLoopback = isLocalInternalRequest(request);

  if (!authorizedBySecret && !authorizedByLoopback) {
    const auth = await requirePermission(request, 'operations.manage', 'Unauthorized');
    if (auth.response) {
      return auth.response;
    }
  }

  const lockResult = await withCronLock('warming', 90000, async () => {
    syslog({ level: 'info', category: 'cron', message: 'warming started' });
    const config = await loadConfig();
    
    if (!config) {
      return NextResponse.json({ error: 'Sistema não configurado' }, { status: 400 });
    }

    if (!config.warmingEnabled) {
      syslog({ level: 'info', category: 'cron', message: 'warming skipped (desabilitado)' });
      return NextResponse.json({ message: 'Warming desabilitado' });
    }

    // Check if enough time has passed since the last run
    const intervalMs = (config.warmingIntervalMinutes ?? 60) * 60 * 1000;
    if (config.lastCronRun) {
      const elapsed = Date.now() - new Date(config.lastCronRun).getTime();
      if (elapsed < intervalMs) {
        const remainingMs = intervalMs - elapsed;
        const remainingMin = Math.ceil(remainingMs / 60000);
        return NextResponse.json({
          message: `Intervalo não atingido. Próximo run em ~${remainingMin} min.`,
          nextRunInMinutes: remainingMin,
          lastCronRun: config.lastCronRun,
        });
      }
    }

    const chips = await loadChips();
    const results = await runWarming(toAppConfig(config), toWarmingChips(chips));
    const totalEnabled = chips.filter((chip) => chip.enabled).length;

    // Persist the timestamp of this run
    const now = new Date();
    await saveConfig({ ...config, lastCronRun: now });

    syslog({ level: 'info', category: 'cron', message: 'warming completed', details: { total: totalEnabled, results: Array.isArray(results) ? results.length : results } });
    return NextResponse.json({ 
      timestamp: now.toISOString(),
      total: totalEnabled,
      results,
    });
  });

  if (!lockResult.locked) {
    return NextResponse.json({
      message: 'Execução anterior ainda em andamento',
      skipped: true,
    });
  }

  return lockResult.result;
}
