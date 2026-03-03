import { NextRequest, NextResponse } from 'next/server';
import { loadConfig, saveConfig } from '@/lib/config';
import { loadChips } from '@/lib/chips';
import { runWarming } from '@/lib/warming';

export async function GET(request: NextRequest) {
  // Validate cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const config = await loadConfig();
  
  if (!config) {
    return NextResponse.json({ error: 'Sistema não configurado' }, { status: 400 });
  }

  if (!config.warmingEnabled) {
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
  const results = await runWarming(config, chips);
  const totalEnabled = chips.filter((chip) => chip.enabled).length;

  // Persist the timestamp of this run so the next call can check the interval
  const now = new Date().toISOString();
  await saveConfig({ ...config, lastCronRun: now });

  return NextResponse.json({ 
    timestamp: now,
    total: totalEnabled,
    results,
  });
}
