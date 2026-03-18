/**
 * Notifications Library
 * 
 * Centralized notification system for chip events, failovers,
 * and operational alerts.
 */
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export interface FailoverNotificationData {
  failedChipId: string;
  failedChipName: string;
  fallbackChipId: string;
  fallbackChipName: string;
  messagesReassigned: number;
  reason: string;
}

export interface NoFallbackNotificationData {
  chipId: string;
  chipName: string;
  chipPhone: string;
  reason: string;
}

// In-memory store for recent notifications (cleared on server restart)
interface StoredNotification {
  id: string;
  type: 'failover' | 'no_fallback' | 'chip_failure' | 'chip_recovery';
  message: string;
  chipId?: string;
  chipName?: string;
  createdAt: Date;
  data?: Record<string, unknown>;
}

const recentNotifications: StoredNotification[] = [];
const MAX_NOTIFICATIONS = 50;

/**
 * Get recent notifications for dashboard display.
 */
export function getRecentNotifications(limit: number = 20): StoredNotification[] {
  return recentNotifications.slice(0, limit);
}

/**
 * Add a notification to the recent list.
 */
function addNotification(notification: StoredNotification): void {
  recentNotifications.unshift(notification);
  if (recentNotifications.length > MAX_NOTIFICATIONS) {
    recentNotifications.pop();
  }
}

/**
 * Send a notification when chip failover occurs.
 * Logs to console and stores for dashboard display.
 */
export async function sendFailoverNotification(data: FailoverNotificationData): Promise<void> {
  const message = `Chip ${data.failedChipName} falhou. ${data.messagesReassigned} mensagens realocadas para ${data.fallbackChipName}.`;
  
  console.log(`[Notifications] FAILOVER: ${message}`);
  console.log(`[Notifications] Reason: ${data.reason}`);
  
  addNotification({
    id: `failover-${Date.now()}-${data.failedChipId}`,
    type: 'failover',
    message,
    chipId: data.failedChipId,
    chipName: data.failedChipName,
    createdAt: new Date(),
    data: {
      fallbackChipId: data.fallbackChipId,
      fallbackChipName: data.fallbackChipName,
      messagesReassigned: data.messagesReassigned,
      reason: data.reason,
    },
  });
}

/**
 * Send a notification when no fallback chip is available.
 */
export async function sendNoFallbackAvailableNotification(data: NoFallbackNotificationData): Promise<void> {
  const message = `Chip ${data.chipName} (${data.chipPhone}) falhou e nenhum chip de fallback está disponível.`;
  
  console.error(`[Notifications] NO_FALLBACK: ${message}`);
  console.error(`[Notifications] Reason: ${data.reason}`);
  
  addNotification({
    id: `no-fallback-${Date.now()}-${data.chipId}`,
    type: 'no_fallback',
    message,
    chipId: data.chipId,
    chipName: data.chipName,
    createdAt: new Date(),
    data: {
      chipPhone: data.chipPhone,
      reason: data.reason,
    },
  });
}

/**
 * Send a notification when a chip fails.
 */
export async function sendChipFailureNotification(data: {
  chipId: string;
  chipName: string;
  reason: string;
}): Promise<void> {
  const message = `Chip ${data.chipName} entrou em estado de falha: ${data.reason}`;
  
  console.log(`[Notifications] CHIP_FAILURE: ${message}`);
  
  addNotification({
    id: `chip-failure-${Date.now()}-${data.chipId}`,
    type: 'chip_failure',
    message,
    chipId: data.chipId,
    chipName: data.chipName,
    createdAt: new Date(),
    data: { reason: data.reason },
  });
}

/**
 * Send a notification when a chip recovers.
 */
export async function sendChipRecoveryNotification(data: {
  chipId: string;
  chipName: string;
  previousStatus: string;
}): Promise<void> {
  const message = `Chip ${data.chipName} recuperou de ${data.previousStatus} para saudável.`;
  
  console.log(`[Notifications] CHIP_RECOVERY: ${message}`);
  
  addNotification({
    id: `chip-recovery-${Date.now()}-${data.chipId}`,
    type: 'chip_recovery',
    message,
    chipId: data.chipId,
    chipName: data.chipName,
    createdAt: new Date(),
    data: { previousStatus: data.previousStatus },
  });
}

/**
 * Get failover stats for the dashboard.
 */
export async function getFailoverStats(): Promise<{
  recentFailovers: number;
  recentRecoveries: number;
  totalMessagesReassigned: number;
}> {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const recentFailovers = recentNotifications.filter(
    n => n.type === 'failover' && n.createdAt >= last24h
  ).length;
  
  const recentRecoveries = recentNotifications.filter(
    n => n.type === 'chip_recovery' && n.createdAt >= last24h
  ).length;
  
  const totalMessagesReassigned = recentNotifications
    .filter(n => n.type === 'failover')
    .reduce((sum, n) => sum + ((n.data?.messagesReassigned as number) ?? 0), 0);
  
  return {
    recentFailovers,
    recentRecoveries,
    totalMessagesReassigned,
  };
}

/**
 * Clear all notifications (for testing).
 */
export function clearNotifications(): void {
  recentNotifications.length = 0;
}