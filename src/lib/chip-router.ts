/**
 * Chip Router — Intelligent chip selection for mass messaging
 * 
 * Selects the best chip based on:
 * - Health status (healthy > degraded > others)
 * - Available capacity (daily/hourly limits)
 * - Segment affinity (prefer chips used for this segment)
 * - Error count penalty
 * - Least recently used (distribute load)
 */
import { loadChips, type Chip } from '@/lib/db-chips';

export interface ChipSelectionResult {
  chip: Chip | null;
  reason: string;
}

export interface ChipCapacity {
  daily: number;
  hourly: number;
}

/**
 * Check if a chip can send more messages right now.
 */
export function canChipSend(chip: Chip): boolean {
  // Must be enabled
  if (!chip.enabled) return false;

  // Must be healthy or degraded (not quarantined, banned, disconnected)
  if (!['healthy', 'degraded'].includes(chip.healthStatus ?? '')) return false;

  // Must have daily capacity remaining
  const dailyUsed = chip.messagesSentToday ?? 0;
  const dailyLimit = chip.dailyLimit ?? 200;
  if (dailyUsed >= dailyLimit) return false;

  // Must have hourly capacity remaining
  const hourlyUsed = chip.messagesSentThisHour ?? 0;
  const hourlyLimit = chip.hourlyLimit ?? 25;
  if (hourlyUsed >= hourlyLimit) return false;

  // Must have an instance name configured
  if (!chip.instanceName) return false;

  return true;
}

/**
 * Get all chips that can send messages right now.
 */
export async function getAvailableChips(): Promise<Chip[]> {
  const allChips = await loadChips();
  return allChips.filter(canChipSend);
}

/**
 * Calculate a score for a chip (higher = better choice).
 * 
 * Scoring factors:
 * - Health status: healthy=100, degraded=50, others=0
 * - Daily capacity remaining: up to 30 points
 * - Hourly capacity remaining: up to 20 points
 * - Segment affinity: +50 if chip has been used for this segment
 * - Error count: -10 per error
 * - Least recently used: +10 (to distribute load)
 */
function calculateChipScore(
  chip: Chip,
  segmentId?: string
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Health status
  if (chip.healthStatus === 'healthy') {
    score += 100;
    reasons.push('healthy (+100)');
  } else if (chip.healthStatus === 'degraded') {
    score += 50;
    reasons.push('degraded (+50)');
  }

  // 2. Daily capacity remaining
  const dailyUsed = chip.messagesSentToday ?? 0;
  const dailyLimit = chip.dailyLimit ?? 200;
  const dailyRemaining = dailyLimit - dailyUsed;
  const dailyPct = dailyLimit > 0 ? dailyRemaining / dailyLimit : 0;
  score += Math.round(dailyPct * 30);
  reasons.push(`daily:${dailyRemaining}/${dailyLimit} (+${Math.round(dailyPct * 30)})`);

  // 3. Hourly capacity remaining
  const hourlyUsed = chip.messagesSentThisHour ?? 0;
  const hourlyLimit = chip.hourlyLimit ?? 25;
  const hourlyRemaining = hourlyLimit - hourlyUsed;
  const hourlyPct = hourlyLimit > 0 ? hourlyRemaining / hourlyLimit : 0;
  score += Math.round(hourlyPct * 20);
  reasons.push(`hourly:${hourlyRemaining}/${hourlyLimit} (+${Math.round(hourlyPct * 20)})`);

  // 4. Segment affinity
  if (segmentId && chip.assignedSegments?.includes(segmentId)) {
    score += 50;
    reasons.push('segment-affinity (+50)');
  }

  // 5. Error count penalty
  const errors = chip.errorCount ?? 0;
  if (errors > 0) {
    score -= errors * 10;
    reasons.push(`errors:${errors} (-${errors * 10})`);
  }

  // 6. Least recently used bonus (distribute load)
  // Chips with older lastHealthCheck are less recently used
  if (chip.lastHealthCheck) {
    const minutesSinceCheck = (Date.now() - new Date(chip.lastHealthCheck).getTime()) / 60000;
    if (minutesSinceCheck < 1) {
      score += 10;
      reasons.push('fresh (+10)');
    }
  }

  return { score, reasons };
}

/**
 * Select the best chip for sending a message.
 * 
 * @param segmentId - Optional segment ID for affinity matching
 * @returns The selected chip and reason, or null if no chip available
 */
export async function selectBestChip(
  segmentId?: string
): Promise<ChipSelectionResult> {
  const availableChips = await getAvailableChips();

  if (availableChips.length === 0) {
    // Determine why no chips are available
    const allChips = await loadChips();
    
    if (allChips.length === 0) {
      return { chip: null, reason: 'Nenhum chip cadastrado' };
    }

    const enabledChips = allChips.filter(c => c.enabled);
    if (enabledChips.length === 0) {
      return { chip: null, reason: 'Todos os chips estão desabilitados' };
    }

    const healthyChips = enabledChips.filter(c => 
      ['healthy', 'degraded'].includes(c.healthStatus ?? '')
    );
    if (healthyChips.length === 0) {
      return { chip: null, reason: 'Nenhum chip saudável disponível' };
    }

    const chipsWithCapacity = healthyChips.filter(c => 
      (c.messagesSentToday ?? 0) < (c.dailyLimit ?? 200) &&
      (c.messagesSentThisHour ?? 0) < (c.hourlyLimit ?? 25)
    );
    if (chipsWithCapacity.length === 0) {
      return { chip: null, reason: 'Todos os chips atingiram o limite diário/horário' };
    }

    return { chip: null, reason: 'Nenhum chip disponível (verifique configuração)' };
  }

  // Score each chip
  const scored = availableChips.map(chip => ({
    chip,
    ...calculateChipScore(chip, segmentId),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  
  return {
    chip: best.chip,
    reason: `Score: ${best.score} (${best.reasons.join(', ')})`,
  };
}

/**
 * Get total available capacity across all healthy chips.
 */
export async function getTotalAvailableCapacity(): Promise<ChipCapacity> {
  const availableChips = await getAvailableChips();

  let daily = 0;
  let hourly = 0;

  for (const chip of availableChips) {
    const dailyRemaining = (chip.dailyLimit ?? 200) - (chip.messagesSentToday ?? 0);
    const hourlyRemaining = (chip.hourlyLimit ?? 25) - (chip.messagesSentThisHour ?? 0);
    daily += Math.max(0, dailyRemaining);
    hourly += Math.max(0, hourlyRemaining);
  }

  return { daily, hourly };
}

/**
 * Get chips sorted by score (for debugging/monitoring).
 */
export async function getChipsByScore(segmentId?: string): Promise<
  Array<Chip & { score: number; reasons: string[] }>
> {
  const availableChips = await getAvailableChips();

  const scored = availableChips.map(chip => ({
    ...chip,
    ...calculateChipScore(chip, segmentId),
  }));

  return scored.sort((a, b) => b.score - a.score);
}