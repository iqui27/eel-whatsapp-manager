/**
 * System Logger — centralized async logging for observability
 *
 * DESIGN GOALS:
 *  1. Never block the caller — fire-and-forget, zero await in hot paths
 *  2. Never exhaust the DB connection pool — writes are batched, not per-call
 *  3. Configurable verbosity — SYSLOG_MIN_LEVEL env var (default: 'warn' in prod)
 *
 * HOW IT WORKS:
 *  - syslog() pushes to an in-memory buffer (sync, instant)
 *  - A 2-second timer flushes the buffer as a single batch INSERT
 *  - If the buffer reaches 500 entries, it flushes immediately
 *  - Debug/info entries are dropped in production unless SYSLOG_MIN_LEVEL=debug|info
 *
 * CONNECTION COST:
 *  - Before: N inserts × N connections per second
 *  - After:  1 batch insert every 2 seconds = 1 connection borrowed briefly
 */

import { db } from '@/db';
import { systemLogs } from '@/db/schema';

export type LogLevel    = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'gemini' | 'webhook' | 'campaign' | 'crm' | 'grupos' | 'auth' | 'cron' | 'system';

export interface LogEntry {
  level:       LogLevel;
  category:    LogCategory;
  message:     string;
  details?:    Record<string, unknown>;
  durationMs?: number;
}

// ─── Level ordering ───────────────────────────────────────────────────────────

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/**
 * Minimum level that gets written to the database.
 *
 * Default: 'warn' — only warnings and errors are persisted.
 * Set SYSLOG_MIN_LEVEL=info or =debug to capture more in staging/dev.
 *
 * This is the single most important performance lever: at 'warn', routine
 * webhook + Gemini 'info' logs are dropped before touching the DB pool.
 */
const MIN_LEVEL: LogLevel = (() => {
  const env = process.env.SYSLOG_MIN_LEVEL as LogLevel | undefined;
  return env && env in LEVEL_ORDER ? env : 'warn';
})();

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}

// ─── In-memory write buffer ───────────────────────────────────────────────────

type BufferedEntry = {
  level:      LogLevel;
  category:   LogCategory;
  message:    string;
  details:    Record<string, unknown> | null;
  durationMs: number | null;
};

const BUFFER:            BufferedEntry[] = [];
const BATCH_INTERVAL_MS = 2_000;  // flush every 2 seconds
const BATCH_MAX_SIZE    = 500;    // flush immediately if buffer fills up

let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushBuffer(): Promise<void> {
  if (BUFFER.length === 0) return;
  // Drain up to BATCH_MAX_SIZE entries atomically
  const batch = BUFFER.splice(0, BATCH_MAX_SIZE);
  try {
    await db.insert(systemLogs).values(batch);
  } catch {
    // Silently discard — logging must NEVER break the application
  }
}

function scheduleFlush(): void {
  if (flushTimer !== null) return; // already scheduled
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushBuffer();
  }, BATCH_INTERVAL_MS);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Write a log entry — sync, instant, never throws.
 * The entry is buffered and written to the DB in a batch after a short delay.
 */
export function syslog(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return; // below min level — drop

  BUFFER.push({
    level:      entry.level,
    category:   entry.category,
    message:    entry.message,
    details:    entry.details ?? null,
    durationMs: entry.durationMs ?? null,
  });

  if (BUFFER.length >= BATCH_MAX_SIZE) {
    // Buffer full — flush immediately without waiting
    void flushBuffer();
  } else {
    scheduleFlush();
  }
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

export const syslogInfo  = (category: LogCategory, message: string, details?: Record<string, unknown>) =>
  syslog({ level: 'info',  category, message, details });

export const syslogWarn  = (category: LogCategory, message: string, details?: Record<string, unknown>) =>
  syslog({ level: 'warn',  category, message, details });

export const syslogError = (category: LogCategory, message: string, details?: Record<string, unknown>) =>
  syslog({ level: 'error', category, message, details });

export const syslogDebug = (category: LogCategory, message: string, details?: Record<string, unknown>) =>
  syslog({ level: 'debug', category, message, details });

/**
 * Wrap a timed async operation and log its result.
 * On success: info. On failure: error. Duration always included.
 *
 * NOTE: With MIN_LEVEL=warn, the success 'info' log is dropped (no DB write).
 * Only the failure path writes to DB — which is exactly what you want in prod.
 */
export async function syslogTimed<T>(
  category: LogCategory,
  label: string,
  fn: () => Promise<T>,
  details?: Record<string, unknown>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    syslog({
      level:      'info',
      category,
      message:    `${label} — OK`,
      durationMs: Date.now() - start,
      details,
    });
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    syslog({
      level:      'error',
      category,
      message:    `${label} — ERRO: ${error}`,
      durationMs: Date.now() - start,
      details:    { ...details, error },
    });
    throw err;
  }
}
