/**
 * System Logger — centralized async logging for observability
 *
 * Fire-and-forget: never throws, never blocks the caller.
 * All writes are non-blocking — failures are silently caught to avoid
 * disrupting the main request flow.
 */

import { db } from '@/db';
import { systemLogs } from '@/db/schema';

export type LogLevel    = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'gemini' | 'webhook' | 'campaign' | 'crm' | 'grupos' | 'auth' | 'cron' | 'system';

export interface LogEntry {
  level:      LogLevel;
  category:   LogCategory;
  message:    string;
  details?:   Record<string, unknown>;
  durationMs?: number;
}

/**
 * Write a log entry — fire-and-forget, never throws.
 */
export function syslog(entry: LogEntry): void {
  db.insert(systemLogs)
    .values({
      level:      entry.level,
      category:   entry.category,
      message:    entry.message,
      details:    entry.details ?? null,
      durationMs: entry.durationMs ?? null,
    })
    .catch(() => {
      // Silently ignore — logging must never break the caller
    });
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
 * Wrap a timed async operation and log its result (info on success, error on failure).
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
      level: 'info',
      category,
      message: `${label} — OK`,
      durationMs: Date.now() - start,
      details,
    });
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    syslog({
      level: 'error',
      category,
      message: `${label} — ERRO: ${error}`,
      durationMs: Date.now() - start,
      details: { ...details, error },
    });
    throw err;
  }
}
